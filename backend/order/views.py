import os
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.shortcuts import get_object_or_404

from .serializers import OrderSerializer, OrderListSerializer, OrderDetailSerializer, OrderStatusUpdateSerializer
from .models import Order
from .ai_parsing import parse_audio_to_order_data

class OrderUploadView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        # JSON 데이터 처리 (프론트엔드에서 보내는 방식)
        if request.content_type == 'application/json':
            print("받은 데이터:", request.data)  # 디버깅용
            serializer = OrderSerializer(data=request.data)
            if serializer.is_valid():
                order = serializer.save()
                
                # 거래처 정보 가져오기
                business = order.business
                
                return Response({
                    'message': '주문이 성공적으로 저장되었습니다.',
                    'order_id': order.id,
                    'business_id': business.id,
                    'business_name': business.business_name,
                    'phone_number': business.phone_number,
                    'total_price': order.total_price,
                    'order_datetime': order.order_datetime.isoformat(),
                    'memo': order.memo,
                    'source_type': order.source_type,
                    'transcribed_text': order.transcribed_text,
                    'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
                    'status': order.status,
                    'order_items': [
                        {
                            'fish_type_id': item.fish_type.id,
                            'quantity': item.quantity,
                            'unit_price': float(item.unit_price),
                            'unit': item.unit
                        } for item in order.items.all()
                    ]
                }, status=201)
            else:
                print("시리얼라이저 오류:", serializer.errors)  # 디버깅용
                return Response(serializer.errors, status=400)
        
        # 파일 업로드 처리 (향후 AI 기능용)
        else:
            business_id = request.data.get('business_id')
            file = request.FILES.get('audio_file')  # or image_file

            if not business_id or not file:
                return Response({'error': 'business_id와 파일이 필요합니다.'}, status=400)

            # 파일 저장
            file_ext = os.path.splitext(file.name)[-1]
            filename = f"{uuid.uuid4()}{file_ext}"
            save_path = os.path.join(settings.MEDIA_ROOT, 'uploads', filename)
            os.makedirs(os.path.dirname(save_path), exist_ok=True)

            with open(save_path, 'wb+') as f:
                for chunk in file.chunks():
                    f.write(chunk)

            # 파싱 (현재는 mock)
            parsed_data = parse_audio_to_order_data(save_path)
            parsed_data['order']['business_id'] = int(business_id)
            parsed_data['order']['raw_input_path'] = f"uploads/{filename}"
            parsed_data['order']['source_type'] = 'voice'  # 또는 image

            serializer = OrderSerializer(data=parsed_data['order'] | {'order_items': parsed_data['order_items']})
            if serializer.is_valid():
                order = serializer.save()
                return Response({'message': '주문이 등록되었습니다.', 'order_id': order.id}, status=201)
            else:
                return Response(serializer.errors, status=400)


class OrderListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """주문 목록 조회"""
        orders = Order.objects.select_related('business').prefetch_related('items__fish_type').all()
        
        # 필터링 (선택사항)
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
            
        # 정렬 (최신순)
        orders = orders.order_by('-order_datetime')
        
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)


class OrderDetailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, order_id):
        """주문 상세 조회"""
        order = get_object_or_404(Order, id=order_id)
        serializer = OrderDetailSerializer(order)
        return Response(serializer.data)


class OrderStatusUpdateView(APIView):
    permission_classes = [AllowAny]
    
    def patch(self, request, order_id):
        """주문 상태 변경"""
        order = get_object_or_404(Order, id=order_id)
        serializer = OrderStatusUpdateSerializer(order, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': '주문 상태가 변경되었습니다.',
                'status': serializer.data['status']
            })
        return Response(serializer.errors, status=400)


class OrderCancelView(APIView):
    permission_classes = [AllowAny]
    
    def patch(self, request, order_id):
        """주문 취소"""
        order = get_object_or_404(Order, id=order_id)
        
        if order.status == 'cancelled':
            return Response({'error': '이미 취소된 주문입니다.'}, status=400)
            
        order.status = 'cancelled'
        order.save()
        
        return Response({
            'message': '주문이 취소되었습니다.',
            'status': 'cancelled'
        })
