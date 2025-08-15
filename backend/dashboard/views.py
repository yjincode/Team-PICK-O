from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models import Sum, Count
from datetime import datetime, date
from order.models import Order
from inventory.models import Inventory
from business.models import Business


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_dashboard_stats(request):
    """관리자 대시보드 통계 (추후 구현)"""
    return Response({
        "message": "관리자 대시보드 API는 추후 구현될 예정입니다.",
        "total_analyses": 0,
        "total_users": 0,
        "recent_activity": []
    })


class DashboardStatsView(APIView):
    """대시보드 통계 정보 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                return Response({'error': '사용자 인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_id = request.user_id
            today = date.today()
            
            # 1. 오늘 주문 건수
            today_orders = Order.objects.filter(
                user_id=user_id,
                order_datetime__date=today
            ).count()
            
            # 2. 실시간 재고 부족 어종 수 계산
            from inventory.models import StockTransaction
            
            # 모든 어종별 실시간 재고 계산
            all_fish_types = Inventory.objects.filter(user_id=user_id).values('fish_type').distinct()
            low_stock_count = 0
            
            for fish_type_info in all_fish_types:
                fish_type_id = fish_type_info['fish_type']
                
                # 등록된 재고
                registered_stock = Inventory.objects.filter(
                    fish_type_id=fish_type_id,
                    user_id=user_id
                ).aggregate(total=Sum('stock_quantity'))['total'] or 0
                
                # 주문으로 차감된 재고
                ordered_stock = StockTransaction.objects.filter(
                    fish_type_id=fish_type_id,
                    user_id=user_id,
                    transaction_type='order'
                ).aggregate(total=Sum('quantity_change'))['total'] or 0
                
                # 실제 가용 재고 = 등록된 재고 + 주문차감 (음수)
                available_stock = registered_stock + ordered_stock
                
                # 재고가 10 이하이면 부족으로 카운트
                if available_stock <= 10:
                    low_stock_count += 1
            
            # 3. 전체 미수금 합계 (각 거래처별로 계산해서 합산)
            businesses = Business.objects.filter(user_id=user_id)
            total_outstanding = 0
            for business in businesses:
                total_outstanding += business.outstanding_balance
            
            # 4. 거래처 수
            business_count = Business.objects.filter(user_id=user_id).count()
            
            return Response({
                'todayOrders': today_orders,
                'lowStockCount': low_stock_count,
                'totalOutstandingBalance': float(total_outstanding),
                'businessCount': business_count
            })
            
        except Exception as e:
            return Response({
                'error': f'대시보드 통계 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardRecentOrdersView(APIView):
    """최근 주문 목록 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                return Response({'error': '사용자 인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_id = request.user_id
            limit = int(request.GET.get('limit', 10))
            
            # 최근 주문 조회 (business는 property이므로 select_related 사용 불가)
            recent_orders = Order.objects.filter(
                user_id=user_id
            ).prefetch_related('items__fish_type').order_by('-order_datetime')[:limit]
            
            # 주문 데이터 정리
            orders_data = []
            for order in recent_orders:
                # 주문 아이템들을 요약 (related_name이 'items'임)
                order_items = order.items.all()
                items_count = order_items.count()
                
                if items_count > 0:
                    first_item = order_items.first()
                    if items_count > 1:
                        items_summary = f"{first_item.fish_type.name} 외 {items_count-1}종"
                    else:
                        items_summary = first_item.fish_type.name
                else:
                    items_summary = "주문 품목 없음"
                
                orders_data.append({
                    'id': order.id,
                    'business_name': order.business.business_name if order.business else '거래처명 없음',
                    'items_summary': items_summary,
                    'total_price': float(order.total_price),
                    'order_status': order.order_status,
                    'order_datetime': order.order_datetime.isoformat()
                })
            
            return Response(orders_data)
            
        except Exception as e:
            return Response({
                'error': f'최근 주문 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardLowStockView(APIView):
    """재고 부족 어종 목록 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                return Response({'error': '사용자 인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_id = request.user_id
            
            # 실시간 재고 부족 어종 조회
            from inventory.models import StockTransaction
            
            # 모든 어종별 실시간 재고 계산
            all_inventories = Inventory.objects.filter(user_id=user_id).select_related('fish_type')
            stock_summary = {}
            
            for inventory in all_inventories:
                fish_type_id = inventory.fish_type.id
                fish_name = inventory.fish_type.name
                
                if fish_name not in stock_summary:
                    # 등록된 총 재고량
                    registered_stock = Inventory.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=user_id
                    ).aggregate(total=Sum('stock_quantity'))['total'] or 0
                    
                    # 주문으로 차감된 재고량
                    ordered_stock = StockTransaction.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=user_id,
                        transaction_type='order'
                    ).aggregate(total=Sum('quantity_change'))['total'] or 0
                    
                    # 실제 가용 재고
                    available_stock = registered_stock + ordered_stock
                    
                    # 재고가 10 이하인 경우에만 추가
                    if available_stock <= 10:
                        # 주문된 수량 계산 (음수이므로 절댓값)
                        ordered_quantity = abs(ordered_stock) if ordered_stock else 0
                        shortage = max(0, ordered_quantity - registered_stock) if available_stock < 0 else 0
                        
                        stock_summary[fish_name] = {
                            'fish_name': fish_name,
                            'registered_stock': registered_stock,  # 등록된 재고
                            'ordered_quantity': ordered_quantity,  # 주문된 수량  
                            'available_stock': available_stock,    # 가용 재고
                            'shortage': shortage,                  # 부족 수량
                            'unit': inventory.unit,
                            'status': 'out_of_stock' if available_stock <= 0 else 'low'
                        }
            
            return Response(list(stock_summary.values()))
            
        except Exception as e:
            return Response({
                'error': f'재고 부족 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)