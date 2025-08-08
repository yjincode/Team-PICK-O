import os
import uuid
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.files.storage import default_storage

from .serializers import OrderSerializer, OrderListSerializer, OrderDetailSerializer, OrderStatusUpdateSerializer
from .models import Order
from .ocr_utils import extract_text_from_image
from transcription.services.order_service import OrderCreationService
from transcription.models import AudioTranscription
from fish_registry.models import FishType

class OrderUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        통합 주문 등록 API
        지원하는 방식:
        1. 음성 파일 업로드 (source_type: 'voice') - 음성 파일을 업로드하여 자동 파싱
        2. 텍스트 파싱 (source_type: 'text') - 텍스트 내용을 직접 입력하여 파싱
        3. 수동 입력 (source_type: 'manual') - 수동으로 주문 정보 입력
        4. 이미지 업로드 (source_type: 'image') - 이미지를 업로드하여 OCR로 텍스트 추출
        """
        source_type = request.data.get('source_type', 'manual')
        
        if source_type == 'voice':
            return self._handle_voice_order(request)
        elif source_type == 'text':
            return self._handle_text_order(request)
        elif source_type == 'manual':
            return self._handle_manual_order(request)
        elif source_type == 'image':
            return self._handle_image_order(request)
        else:
            return Response(
                {'error': '지원하지 않는 source_type입니다. (voice, text, manual, image)'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _handle_voice_order(self, request):
        """음성 파일 업로드를 통한 주문 등록"""
        # 음성 파일이 업로드되었는지 확인
        if 'audio_file' not in request.FILES:
            return Response(
                {'error': '음성 파일이 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        audio_file = request.FILES['audio_file']
        business_id = request.data.get('business_id')
        
        if not business_id:
            return Response(
                {'error': 'business_id가 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # 1. AudioTranscription 모델에 음성 파일 정보 저장
                transcription = AudioTranscription.objects.create(
                    user=request.user,
                    audio_file=audio_file,  # 업로드된 음성 파일
                    language='ko',
                    status='processing',
                    create_order=True,
                    business_id=business_id
                )
                
                # 2. 음성 파싱 처리 (transcription 모듈 활용)
                order_service = OrderCreationService(request.user)
                
                # 3. 실제 음성 파일 파싱 (Whisper 모델 사용)
                parsed_data = self._parse_audio_file_with_transcription(audio_file)
                
                # 4. 파싱된 데이터로 주문 생성
                order_data = {
                    'business_id': business_id,
                    'total_price': parsed_data.get('total_price', 0),
                    'order_datetime': datetime.now(),
                    'delivery_date': parsed_data.get('delivery_date', datetime.now().date()),
                    'source_type': 'voice',
                    'raw_input_path': str(transcription.audio_file),  # 업로드된 파일 경로
                    'transcribed_text': parsed_data.get('transcribed_text', ''),
                    'memo': parsed_data.get('memo', '음성 인식으로 생성된 주문'),
                    'status': 'pending',
                    'order_items': parsed_data.get('order_items', [])
                }
                
                serializer = OrderSerializer(data=order_data)
                if serializer.is_valid():
                    order = serializer.save()
                    
                    # 5. transcription과 order 연결
                    transcription.order = order
                    transcription.status = 'completed'
                    transcription.save()
                    
                    return Response({
                        'message': '음성 주문이 성공적으로 등록되었습니다.',
                        'order_id': order.id,
                        'transcription_id': str(transcription.id),
                        'transcribed_text': order.transcribed_text,
                        'status': order.order_status,
                        'order_items': [
                            {
                                'fish_type_id': item.fish_type.id,
                                'fish_name': item.fish_type.name,
                                'quantity': item.quantity,
                                'unit_price': float(item.unit_price),
                                'unit': item.unit
                            } for item in order.items.all()  # related_name이 'items'임
                        ]
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
        except Exception as e:
            return Response(
                {'error': f'음성 주문 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_text_order(self, request):
        """텍스트 파싱을 통한 주문 등록"""
        text = request.data.get('text')
        business_id = request.data.get('business_id')
        
        if not text or not business_id:
            return Response(
                {'error': 'text와 business_id가 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # transcription 모듈의 OrderCreationService 활용하여 텍스트 파싱
                order_service = OrderCreationService(request.user)
                order, order_items = order_service.create_order(text, business_id)
                
                return Response({
                    'message': '텍스트 주문이 성공적으로 등록되었습니다.',
                    'order_id': order.id,
                    'transcribed_text': order.transcribed_text,
                    'status': order.order_status,
                    'order_items': [
                        {
                            'fish_type_id': item.fish_type.id,
                            'fish_name': item.fish_type.name,
                            'quantity': item.quantity,
                            'unit_price': float(item.unit_price),
                            'unit': item.unit
                        } for item in order_items
                    ]
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {'error': f'텍스트 주문 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_manual_order(self, request):
        """수동 입력을 통한 주문 등록"""
        serializer = OrderSerializer(data=request.data)
        if serializer.is_valid():
            order = serializer.save()
            
            return Response({
                'message': '수동 주문이 성공적으로 등록되었습니다.',
                'order_id': order.id,
                'business_name': order.business.business_name,
                'total_price': order.total_price,
                'status': order.order_status
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_image_order(self, request):
        """이미지 업로드를 통한 주문 등록 (OCR 사용)"""
        # 이미지 파일이 업로드되었는지 확인
        if 'image' not in request.FILES:
            return Response(
                {'error': '이미지 파일이 제공되지 않았습니다'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        business_id = request.data.get('business_id')
        
        try:
            # 업로드된 이미지를 임시로 저장
            file_ext = os.path.splitext(image_file.name)[1]
            filename = f"ocr_uploads/{uuid.uuid4()}{file_ext}"
            filepath = default_storage.save(filename, image_file)
            
            try:
                # OCR을 사용하여 텍스트 추출
                extracted_text = extract_text_from_image(image_file)
                
                # 추출된 텍스트에서 주문 생성
                order_service = OrderCreationService(request.user)
                
                # 주문 파싱 및 생성
                with transaction.atomic():
                    order, order_items = order_service.create_order(
                        text=extracted_text,
                        business_id=business_id
                    )
                
                # 응답 데이터 준비
                response_data = {
                    'message': '이미지에서 주문이 성공적으로 생성되었습니다',
                    'order_id': order.id,
                    'extracted_text': extracted_text,
                    'order': {
                        'id': order.id,
                        'business_id': order.business.id,
                        'business_name': order.business.business_name,
                        'total_price': order.total_price,
                        'status': order.order_status,
                        'source_type': 'image',
                        'transcribed_text': extracted_text,
                        'created_at': order.order_datetime.isoformat(),
                        'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
                        'items': [
                            {
                                'fish_type': item.fish_type.fish_name,
                                'quantity': item.quantity,
                                'unit': item.unit,
                                'unit_price': str(item.unit_price)
                            }
                            for item in order.items.all()
                        ]
                    }
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                # 오류가 발생한 경우 저장된 파일 정리
                if 'filepath' in locals():
                    default_storage.delete(filepath)
                raise
                
        except Exception as e:
            return Response(
                {'error': f'이미지 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _parse_audio_file_with_transcription(self, audio_file):
        """
        transcription 모듈을 사용한 실제 음성 파일 파싱
        Whisper 모델을 사용하여 음성을 텍스트로 변환하고 주문 정보를 추출
        """
        try:
            import io
            import torch
            import torchaudio
            from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
            
            # Whisper 모델과 프로세서 로드 (transcription 모듈과 동일)
            processor = AutoProcessor.from_pretrained("openai/whisper-large-v3")
            model = AutoModelForSpeechSeq2Seq.from_pretrained("openai/whisper-large-v3")
            model.eval()
            
            # GPU 사용 가능시 GPU 사용, 아니면 CPU 사용
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            model.to(device)
            
            # 업로드된 음성 파일 읽기
            audio_bytes = audio_file.read()
            audio_tensor, sample_rate = torchaudio.load(io.BytesIO(audio_bytes))
            
            # 16kHz로 리샘플링 (Whisper 모델 요구사항)
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
                audio_tensor = resampler(audio_tensor)
            
            # 음성 전처리
            inputs = processor(
                audio_tensor.squeeze().numpy(),
                sampling_rate=16000,
                return_tensors="pt"
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            # Whisper 모델로 음성-텍스트 변환
            with torch.no_grad():
                generated_ids = model.generate(
                    inputs["input_features"],
                    forced_decoder_ids=processor.get_decoder_prompt_ids(
                        language="ko",
                        task="transcribe"
                    )
                )
            
            # 변환 결과 디코딩
            transcribed_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # 변환된 텍스트를 OrderCreationService로 파싱
            order_service = OrderCreationService(self.request.user)
            parsed_data = order_service.parse_order_from_text(transcribed_text)
            
            # 주문 형식으로 변환
            order_items = []
            total_price = 0
            
            for item in parsed_data['items']:
                # 어종명으로 FishType 찾기
                try:
                    fish_type = FishType.objects.get(name=item['fish_name'])
                    unit_price = 20000  # 기본 가격 (실제로는 시세 데이터에서 가져와야 함)
                    
                    order_items.append({
                        'fish_type_id': fish_type.id,
                        'quantity': item['quantity'],
                        'unit_price': unit_price,
                        'unit': item['unit']
                    })
                    
                    total_price += item['quantity'] * unit_price
                except FishType.DoesNotExist:
                    # 어종이 없으면 건너뛰기
                    continue
            
            return {
                'transcribed_text': transcribed_text,
                'total_price': total_price,
                'delivery_date': parsed_data['delivery_date'],
                'memo': parsed_data['memo'],
                'order_items': order_items
            }
            
        except Exception as e:
            # 파싱 실패 시 기본 데이터 반환
            return {
                'transcribed_text': f'음성 파싱에 실패했습니다: {str(e)}',
                'total_price': 0,
                'delivery_date': datetime.now().date(),
                'memo': '음성 파싱 실패',
                'order_items': []
            }


class OCRImageUploadView(APIView):
    """
    한국어 주문 정보가 포함된 이미지를 업로드하기 위한 API 엔드포인트.
    OCR을 사용하여 텍스트를 추출하고 추출된 텍스트에서 주문을 생성합니다.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 이미지 파일이 업로드되었는지 확인
        if 'image' not in request.FILES:
            return Response(
                {'error': '이미지 파일이 제공되지 않았습니다'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        business_id = request.data.get('business_id')
        
        try:
            # 업로드된 이미지를 임시로 저장
            file_ext = os.path.splitext(image_file.name)[1]
            filename = f"ocr_uploads/{uuid.uuid4()}{file_ext}"
            filepath = default_storage.save(filename, image_file)
            
            try:
                # OCR을 사용하여 텍스트 추출
                extracted_text = extract_text_from_image(image_file)
                
                # 추출된 텍스트에서 주문 생성
                order_service = OrderCreationService(request.user)
                
                # 주문 파싱 및 생성
                with transaction.atomic():
                    order, order_items = order_service.create_order(
                        text=extracted_text,
                        business_id=business_id
                    )
                
                # 응답 데이터 준비
                response_data = {
                    'message': '이미지에서 주문이 성공적으로 생성되었습니다',
                    'order_id': order.id,
                    'extracted_text': extracted_text,
                    'order': {
                        'id': order.id,
                        'business_id': order.business.id,
                        'business_name': order.business.business_name,
                        'total_price': order.total_price,
                        'status': order.order_status,
                        'source_type': 'image',
                        'transcribed_text': extracted_text,
                        'created_at': order.order_datetime.isoformat(),
                        'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
                        'items': [
                            {
                                'fish_type': item.fish_type.fish_name,
                                'quantity': item.quantity,
                                'unit': item.unit,
                                'unit_price': str(item.unit_price)
                            }
                            for item in order.items.all()
                        ]
                    }
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                # 오류가 발생한 경우 저장된 파일 정리
                if 'filepath' in locals():
                    default_storage.delete(filepath)
                raise
                
        except Exception as e:
            return Response(
                {'error': f'이미지 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrderListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """주문 목록 조회"""
        orders = Order.objects.select_related('business').prefetch_related('items__fish_type').all()
        
        # 상태별 필터링 (선택사항)
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(order_status=status_filter)
            
        # 최신순 정렬
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
                'order_status': serializer.data['order_status']
            })
        return Response(serializer.errors, status=400)


class OrderCancelView(APIView):
    permission_classes = [AllowAny]
    
    def patch(self, request, order_id):
        """주문 취소"""
        order = get_object_or_404(Order, id=order_id)
        
        if order.order_status == 'cancelled':
            return Response({'error': '이미 취소된 주문입니다.'}, status=400)
            
        order.order_status = 'cancelled'
        order.save()
        
        return Response({
            'message': '주문이 취소되었습니다.',
            'order_status': 'cancelled'
        })
