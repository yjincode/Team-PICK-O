import os
import uuid
import json
from datetime import datetime
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.files.storage import default_storage
from django.utils import timezone
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from core.middleware import get_user_queryset_filter

from .serializers import OrderSerializer, OrderListSerializer, OrderDetailSerializer, OrderStatusUpdateSerializer, OrderUpdateSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Order
from .ocr_utils import extract_text_from_image
from transcription.services.order_service import OrderCreationService
from transcription.models import AudioTranscription
from fish_registry.models import FishType
from fish_registry.serializers import FishTypeSerializer
from business.models import Business
from business.serializers import BusinessSerializer
from .models import DocumentRequest

@method_decorator(csrf_exempt, name='dispatch')
class OrderUploadView(View):
    """Django View 기반 주문 업로드 - JWT 미들웨어 인증"""
    
    def post(self, request):
        """
        통합 주문 등록 API
        지원하는 방식:
        1. 음성 파일 업로드 (source_type: 'voice') - 음성 파일을 업로드하여 자동 파싱
        2. 텍스트 파싱 (source_type: 'text') - 텍스트 내용을 직접 입력하여 파싱
        3. 수동 입력 (source_type: 'manual') - 수동으로 주문 정보 입력
        4. 이미지 업로드 (source_type: 'image') - 이미지를 업로드하여 OCR로 텍스트 추출
        """
        print(f"📦 주문 생성 요청 받음")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
                source_type = data.get('source_type', 'manual')
            else:
                data = request.POST
                source_type = data.get('source_type', 'manual')
            print(f"📝 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        source_type = data.get('source_type', 'manual')
        
        if source_type == 'voice':
            return self._handle_voice_order(request, data)
        elif source_type == 'text':
            return self._handle_text_order(request, data)
        elif source_type == 'manual':
            return self._handle_manual_order(request, data)
        elif source_type == 'image':
            return self._handle_image_order(request, data)
        else:
            return JsonResponse(
                {'error': '지원하지 않는 source_type입니다. (voice, text, manual, image)'}, 
                status=400
            )
    
    def _handle_voice_order(self, request, data):
        """음성 파일 업로드를 통한 주문 등록 (실제 STT 사용)"""
        # 음성 파일이 업로드되었는지 확인
        if 'audio_file' not in request.FILES:
            return JsonResponse(
                {'error': '음성 파일이 필요합니다.'}, 
                status=400
            )
        
        audio_file = request.FILES['audio_file']
        business_id = data.get('business_id')
        
        if not business_id:
            return JsonResponse(
                {'error': 'business_id가 필요합니다.'}, 
                status=400
            )
        
        # 음성 파일 확장자 검증
        valid_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg', '.webm', '.aac']
        if not any(audio_file.name.lower().endswith(ext) for ext in valid_extensions):
            return JsonResponse(
                {'error': f'지원하지 않는 오디오 형식입니다. 지원 형식: {", ".join(valid_extensions)}'}, 
                status=400
            )
        
        try:
            with transaction.atomic():
                # 1. 실제 STT 처리를 위한 AudioTranscription 생성
                from business.models import User
                from transcription.models import AudioTranscription
                user = User.objects.get(id=request.user_id)
                
                transcription = AudioTranscription.objects.create(
                    user=user,
                    audio_file=audio_file,
                    language='ko',  # 한국어 설정
                    status='processing',
                    create_order=True,
                    business_id=business_id
                )
                
                print(f"🎤 음성 파일 저장 완료: {transcription.id}")
                
                # 2. STT 처리를 백그라운드 스레드로 시작
                print(f"🎤 음성 파일 업로드 완료, STT 처리 시작: {transcription.id}")
                
                import threading
                thread = threading.Thread(
                    target=self._process_audio_background,
                    args=(transcription,)
                )
                thread.daemon = True
                thread.start()
                
                # 즉시 transcription ID를 반환
                return JsonResponse({
                    'message': '음성 파일이 업로드되었습니다. STT 처리 중입니다.',
                    'data': {
                        'transcription_id': str(transcription.id),
                        'status': 'processing',
                        'business_id': business_id
                    }
                }, status=202)  # 202 Accepted - 처리 중
                
        except Exception as e:
            print(f"❌ 음성 주문 처리 오류: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse(
                {'error': f'음성 주문 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=500
            )
    
    def _process_audio_sync(self, transcription):
        """동기식 STT 처리 - 더 가벼운 모델 사용"""
        try:
            import tempfile
            import os
            import torch
            import torchaudio
            from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
            
            print(f"🔄 STT 처리 시작: {transcription.id}")
            
            # 더 가벼운 Whisper 모델 사용 (base 모델: ~290MB)
            model_name = "openai/whisper-base"
            
            if not hasattr(self, '_stt_processor'):
                print(f"🔧 Whisper 모델 로딩중... ({model_name})")
                self._stt_processor = AutoProcessor.from_pretrained(model_name)
                self._stt_model = AutoModelForSpeechSeq2Seq.from_pretrained(model_name)
                self._stt_model.eval()
                
                # GPU 사용 가능 시 GPU로 이동
                self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                self._stt_model.to(self._device)
                print(f"✅ Whisper 모델 로딩 완료 (device: {self._device})")
            
            # 업로드된 파일의 원본 확장자 유지하여 임시 파일 생성
            transcription.audio_file.seek(0)
            audio_bytes = transcription.audio_file.read()
            
            # 원본 파일명에서 확장자 추출
            original_filename = transcription.audio_file.name
            file_extension = os.path.splitext(original_filename)[1].lower()
            if not file_extension:
                file_extension = '.mp3'  # 기본값
            
            print(f"🎵 원본 파일: {original_filename}, 확장자: {file_extension}")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_audio:
                temp_audio.write(audio_bytes)
                temp_audio_path = temp_audio.name
            
            print(f"📁 임시 파일 생성: {temp_audio_path}")
            
            try:
                # 파일이 제대로 생성되었는지 확인
                if not os.path.exists(temp_audio_path):
                    raise FileNotFoundError(f"임시 파일이 생성되지 않았습니다: {temp_audio_path}")
                
                file_size = os.path.getsize(temp_audio_path)
                print(f"📊 임시 파일 크기: {file_size} bytes")
                
                if file_size == 0:
                    raise ValueError("임시 파일이 비어있습니다")
                
                # torchaudio로 임시 파일 로드
                print(f"🔄 오디오 파일 로드 시도: {temp_audio_path}")
                audio_tensor, sample_rate = torchaudio.load(temp_audio_path)
                print(f"🎵 오디오 파일 정보: sample_rate={sample_rate}, shape={audio_tensor.shape}")
                
                # 스테레오인 경우 모노로 변환
                if audio_tensor.shape[0] > 1:
                    audio_tensor = torch.mean(audio_tensor, dim=0, keepdim=True)
                    print("🔧 스테레오 → 모노 변환 완료")
                
                # 16kHz로 리샘플링 (필요시)
                if sample_rate != 16000:
                    resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
                    audio_tensor = resampler(audio_tensor)
                    print("🔧 16kHz로 리샘플링 완료")
                
                # 전처리
                inputs = self._stt_processor(
                    audio_tensor.squeeze().numpy(),
                    sampling_rate=16000,
                    return_tensors="pt"
                )
                inputs = {k: v.to(self._device) for k, v in inputs.items()}
                
                # STT 추론
                print("🎯 STT 추론 시작...")
                with torch.no_grad():
                    generated_ids = self._stt_model.generate(
                        inputs["input_features"],
                        forced_decoder_ids=self._stt_processor.get_decoder_prompt_ids(
                            language="ko",  # 한국어
                            task="transcribe"
                        )
                    )
                
                # 결과 디코딩
                transcription_text = self._stt_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
                
                # transcription 모델 업데이트
                transcription.transcription = transcription_text
                transcription.status = 'completed'
                transcription.save(update_fields=['transcription', 'status'])
                
                print(f"✅ STT 처리 완료: {transcription_text}")
                return transcription_text
                
            finally:
                # 임시 파일 정리
                try:
                    if os.path.exists(temp_audio_path):
                        os.unlink(temp_audio_path)
                        print(f"🗑️ 임시 파일 삭제: {temp_audio_path}")
                except Exception as cleanup_error:
                    print(f"⚠️ 임시 파일 삭제 실패: {cleanup_error}")
            
        except Exception as e:
            print(f"❌ STT 처리 오류: {e}")
            transcription.status = 'failed'
            transcription.save(update_fields=['status'])
            import traceback
            traceback.print_exc()
            return None
    
    def _process_audio_background(self, transcription):
        """백그라운드에서 STT 처리 (스레드용)"""
        print(f"🔄 백그라운드 STT 처리 시작: {transcription.id}")
        result = self._process_audio_sync(transcription)
        if result:
            print(f"✅ 백그라운드 STT 처리 완료: {transcription.id}")
        else:
            print(f"❌ 백그라운드 STT 처리 실패: {transcription.id}")

    def _handle_text_order(self, request, data):
        """텍스트 파싱을 통한 주문 등록"""
        text = data.get('text')
        business_id = data.get('business_id')
        
        if not text or not business_id:
            return JsonResponse(
                {'error': 'text와 business_id가 필요합니다.'}, 
                status=400
            )
        
        try:
            with transaction.atomic():
                # transcription 모듈의 OrderCreationService 활용하여 텍스트 파싱
                from business.models import User
                user = User.objects.get(id=request.user_id)
                order_service = OrderCreationService(user)
                order, order_items = order_service.create_order(text, business_id)
                
                return JsonResponse({
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
                }, status=201)
                
        except Exception as e:
            return JsonResponse(
                {'error': f'텍스트 주문 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=500
            )
    
    def _handle_manual_order(self, request, data):
        """수동 입력을 통한 주문 등록"""
        print(f"📝 수동 주문 처리 시작")
        print(f"📋 수동 주문 데이터: {data}")
        
        try:
            # 데이터 복사 (user_id는 save()에서 직접 전달)
            validated_data = dict(data)
            
            print(f"✅ 검증할 데이터: {validated_data}")
            
            # order_items JSON 파싱 처리
            if 'order_items' in validated_data and isinstance(validated_data['order_items'], str):
                try:
                    import json
                    validated_data['order_items'] = json.loads(validated_data['order_items'])
                    print(f"✅ order_items JSON 파싱 성공: {validated_data['order_items']}")
                except json.JSONDecodeError as e:
                    print(f"❌ order_items JSON 파싱 실패: {e}")
                    return JsonResponse({'error': 'order_items JSON 형식이 올바르지 않습니다.'}, status=400)
            
            # 각 필드 검증
            required_fields = ['business_id', 'order_items']
            for field in required_fields:
                if field not in validated_data or not validated_data[field]:
                    print(f"❌ 필수 필드 누락: {field}")
                    return JsonResponse({'error': f'필수 필드가 누락되었습니다: {field}'}, status=400)
            
            # business_id 존재 여부 확인
            try:
                from business.models import Business
                business = Business.objects.get(id=validated_data['business_id'])
                print(f"✅ 비즈니스 확인 성공: {business.business_name}")
            except Business.DoesNotExist:
                print(f"❌ 존재하지 않는 business_id: {validated_data['business_id']}")
                return JsonResponse({'error': f"존재하지 않는 비즈니스입니다: {validated_data['business_id']}"}, status=400)
            
            # fish_type_id 검증
            from fish_registry.models import FishType
            for item in validated_data['order_items']:
                if 'fish_type_id' not in item:
                    print(f"❌ order_item에 fish_type_id 누락: {item}")
                    return JsonResponse({'error': 'order_item에 fish_type_id가 필요합니다.'}, status=400)
                
                try:
                    fish_type = FishType.objects.get(id=item['fish_type_id'])
                    print(f"✅ 어종 확인 성공: {fish_type.name}")
                except FishType.DoesNotExist:
                    print(f"❌ 존재하지 않는 fish_type_id: {item['fish_type_id']}")
                    return JsonResponse({'error': f"존재하지 않는 어종입니다: {item['fish_type_id']}"}, status=400)
            
            serializer = OrderSerializer(data=validated_data)
            if serializer.is_valid():
                print(f"✅ Serializer 검증 성공")
                order = serializer.save(user_id=request.user_id)
                
                print(f"✅ 주문 생성 성공: order_id={order.id}")
                
                return JsonResponse({
                    'message': '수동 주문이 성공적으로 등록되었습니다.',
                    'data': {
                        'id': order.id,
                        'business_name': order.business.business_name,
                        'total_price': order.total_price,
                        'order_status': order.order_status,
                        'delivery_datetime': order.delivery_datetime.isoformat() if order.delivery_datetime else None,
                        'order_items': [
                            {
                                'fish_type_id': item.fish_type_id,
                                'fish_name': item.fish_type.name,
                                'quantity': item.quantity,
                                'unit_price': float(item.unit_price),
                                'unit': item.unit,
                                'remarks': item.remarks
                            } for item in order.items.all()
                        ]
                    }
                }, status=201)
            else:
                print(f"❌ Serializer 검증 실패: {serializer.errors}")
                return JsonResponse({'error': serializer.errors}, status=400)
                
        except Exception as e:
            print(f"❌ 수동 주문 처리 오류: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'수동 주문 처리 중 오류가 발생했습니다: {str(e)}'}, status=500)
    
    def _handle_image_order(self, request, data):
        """이미지 업로드를 통한 주문 등록 (OCR 사용)"""
        # 이미지 파일이 업로드되었는지 확인
        if 'image' not in request.FILES:
            return JsonResponse(
                {'error': '이미지 파일이 제공되지 않았습니다'}, 
                status=400
            )
        
        image_file = request.FILES['image']
        business_id = data.get('business_id')
        
        try:
            # 업로드된 이미지를 임시로 저장
            file_ext = os.path.splitext(image_file.name)[1]
            filename = f"ocr_uploads/{uuid.uuid4()}{file_ext}"
            filepath = default_storage.save(filename, image_file)
            
            try:
                # OCR을 사용하여 텍스트 추출
                extracted_text = extract_text_from_image(image_file)
                
                # 추출된 텍스트에서 주문 생성
                from business.models import User
                user = User.objects.get(id=request.user_id)
                order_service = OrderCreationService(user)
                
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
                
                return JsonResponse(response_data, status=201)
                
            except Exception as e:
                # 오류가 발생한 경우 저장된 파일 정리
                if 'filepath' in locals():
                    default_storage.delete(filepath)
                raise
                
        except Exception as e:
            return JsonResponse(
                {'error': f'이미지 처리 중 오류가 발생했습니다: {str(e)}'}, 
                status=500
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
                    
                    # 어종의 기본 단가 사용 (없으면 기본값)
                    unit_price = fish_type.default_price if fish_type.default_price else 20000
                    
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


# 중복된 OCRImageUploadView 제거됨 - _handle_image_order에서 처리


@method_decorator(csrf_exempt, name='dispatch')
class TranscriptionStatusView(View):
    """음성 인식 상태 확인 API"""
    
    def get(self, request, transcription_id):
        """transcription 상태 조회"""
        try:
            # 미들웨어에서 설정된 사용자 정보 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
            
            from transcription.models import AudioTranscription
            transcription = AudioTranscription.objects.get(
                id=transcription_id, 
                user_id=request.user_id
            )
            
            return JsonResponse({
                'transcription_id': str(transcription.id),
                'status': transcription.status,
                'transcribed_text': transcription.transcription,
                'created_at': transcription.created_at.isoformat(),
                'updated_at': transcription.updated_at.isoformat(),
            })
            
        except AudioTranscription.DoesNotExist:
            return JsonResponse({'error': 'Transcription을 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class TranscriptionToOrderView(View):
    """STT 완료 후 주문 생성 API"""
    
    def post(self, request, transcription_id):
        """transcription으로 주문 생성"""
        try:
            # 미들웨어에서 설정된 사용자 정보 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
            
            from transcription.models import AudioTranscription
            from business.models import User
            
            transcription = AudioTranscription.objects.get(
                id=transcription_id, 
                user_id=request.user_id
            )
            
            if transcription.status != 'completed':
                return JsonResponse({'error': 'STT가 완료되지 않았습니다.'}, status=400)
            
            if not transcription.transcription:
                return JsonResponse({'error': '변환된 텍스트가 없습니다.'}, status=400)
            
            # 주문 생성
            user = User.objects.get(id=request.user_id)
            order_service = OrderCreationService(user)
            order, order_items = order_service.create_order(
                text=transcription.transcription,
                business_id=transcription.business_id
            )
            
            # transcription과 order 연결
            transcription.order = order
            transcription.save()
            
            return JsonResponse({
                'message': '음성 주문이 성공적으로 생성되었습니다.',
                'data': {
                    'id': order.id,
                    'transcription_id': str(transcription.id),
                    'transcribed_text': transcription.transcription,
                    'business_name': order.business.business_name,
                    'total_price': order.total_price,
                    'order_status': order.order_status,
                    'delivery_datetime': order.delivery_datetime.isoformat() if order.delivery_datetime else None,
                    'order_items': [
                        {
                            'fish_type_id': item.fish_type_id,
                            'fish_name': item.fish_type.name,
                            'quantity': item.quantity,
                            'unit_price': float(item.unit_price),
                            'unit': item.unit,
                            'remarks': item.remarks
                        } for item in order_items
                    ]
                }
            }, status=201)
            
        except AudioTranscription.DoesNotExist:
            return JsonResponse({'error': 'Transcription을 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class OrderListView(View):
    """Django View 기반 주문 목록 - JWT 미들웨어 인증 (페이지네이션 지원)"""
    
    def get(self, request):
        """주문 목록 조회 (Django Paginator 사용)"""
        print(f"📝 주문 목록 조회 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"⚠️ 사용자 인증 정보 없음 - 개발 모드로 더미 사용자 ID 사용")
            # 개발 모드에서는 더미 사용자 ID 사용
            request.user_id = 1  # 임시로 첫 번째 사용자 ID 사용
            print(f"✅ 더미 사용자 ID 설정: user_id={request.user_id}")
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # 페이지네이션 파라미터
        page = request.GET.get('page', 1)
        page_size = int(request.GET.get('page_size', 10))  # 기본 10개씩
        
        # 미들웨어에서 설정된 user_id 사용
        orders_queryset = Order.objects.prefetch_related('items__fish_type').filter(**get_user_queryset_filter(request))
        
        # 주문 상태별 필터링
        status_filter = request.GET.get('status')
        if status_filter and status_filter != 'all':
            orders_queryset = orders_queryset.filter(order_status=status_filter)
        
        # 결제 상태별 필터링 (Payment 모델의 역방향 관계 사용)
        payment_status_filter = request.GET.get('payment_status')
        if payment_status_filter and payment_status_filter != 'all':
            from payment.models import Payment
            if payment_status_filter == 'paid':
                paid_order_ids = Payment.objects.filter(payment_status='paid').values_list('order_id', flat=True)
                orders_queryset = orders_queryset.filter(id__in=paid_order_ids)
            elif payment_status_filter == 'pending':
                # 미수금: 결제되지 않았고(refunded 포함하지 않음), 주문이 취소되지 않은 건만
                excluded_statuses = ['paid', 'refunded']
                excluded_ids = Payment.objects.filter(payment_status__in=excluded_statuses).values_list('order_id', flat=True)
                orders_queryset = orders_queryset.exclude(id__in=excluded_ids)
                orders_queryset = orders_queryset.exclude(order_status='cancelled')
            elif payment_status_filter == 'refunded':
                refunded_order_ids = Payment.objects.filter(payment_status='refunded').values_list('order_id', flat=True)
                orders_queryset = orders_queryset.filter(id__in=refunded_order_ids)
        # payment_status='all' 또는 지정되지 않은 경우: 모든 주문 (필터링 안함)
        
        # 날짜별 필터링
        date_filter = request.GET.get('date')
        if date_filter:
            try:
                from datetime import datetime
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                orders_queryset = orders_queryset.filter(order_datetime__date=filter_date)
            except ValueError:
                pass  # 잘못된 날짜 형식은 무시
        
        # 거래처별 필터링
        business_filter = request.GET.get('business_id')
        if business_filter and business_filter != 'all':
            try:
                business_id = int(business_filter)
                orders_queryset = orders_queryset.filter(business_id=business_id)
            except ValueError:
                pass  # 잘못된 business_id는 무시
            
        # 최신순 정렬
        orders_queryset = orders_queryset.order_by('-order_datetime')
        
        # Django Paginator 사용
        paginator = Paginator(orders_queryset, page_size)
        
        try:
            orders_page = paginator.page(page)
        except PageNotAnInteger:
            # 페이지가 정수가 아니면 첫 번째 페이지 반환
            orders_page = paginator.page(1)
        except EmptyPage:
            # 페이지가 범위를 벗어나면 마지막 페이지 반환
            orders_page = paginator.page(paginator.num_pages)
        
        serializer = OrderListSerializer(orders_page.object_list, many=True)
        
        return JsonResponse({
            'data': serializer.data,
            'pagination': {
                'page': orders_page.number,
                'page_size': page_size,
                'total_count': paginator.count,
                'total_pages': paginator.num_pages,
                'has_next': orders_page.has_next(),
                'has_previous': orders_page.has_previous()
            }
        })


@method_decorator(csrf_exempt, name='dispatch')
class OrderDetailView(View):
    """Django View 기반 주문 상세 - JWT 미들웨어 인증"""
    
    def get(self, request, order_id):
        """주문 상세 조회"""
        print(f"🗓️ 주문 상세 조회 요청: order_id={order_id}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        try:
            # 미들웨어에서 설정된 user_id 사용
            order = Order.objects.get(id=order_id, **get_user_queryset_filter(request))
            serializer = OrderDetailSerializer(order)
            return JsonResponse(serializer.data)
        except Order.DoesNotExist:
            return JsonResponse({'error': '주문을 찾을 수 없습니다.'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class OrderStatusUpdateView(View):
    """Django View 기반 주문 상태 업데이트 - JWT 미들웨어 인증"""
    
    def patch(self, request, order_id):
        """주문 상태 변경"""
        print(f"🔄 주문 상태 변경 요청: order_id={order_id}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            print(f"📝 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        try:
            # 미들웨어에서 설정된 user_id 사용
            order = Order.objects.get(id=order_id, **get_user_queryset_filter(request))
            print(f"🔍 주문 조회 성공: order_id={order.id}, 현재 상태={order.order_status}")
            
            serializer = OrderStatusUpdateSerializer(order, data=data, partial=True)
            print(f"🔍 Serializer 데이터: {serializer.initial_data}")
            
            if serializer.is_valid():
                print(f"✅ Serializer 유효성 검증 성공")
                
                # ready 상태로 변경시 재고 부족 검증
                new_status = serializer.validated_data.get('order_status')
                if new_status == 'ready':
                    print(f"🔍 출고 준비 상태 변경 - 재고 부족 검증 시작")
                    
                    from inventory.models import Inventory
                    insufficient_items = []
                    
                    for order_item in order.items.all():
                        fish_type_id = order_item.fish_type_id
                        quantity = order_item.quantity
                        
                        # 해당 어종의 현재 재고수량 확인
                        inventory = Inventory.objects.filter(
                            fish_type_id=fish_type_id,
                            user_id=order.user_id
                        ).first()
                        
                        if not inventory:
                            insufficient_items.append({
                                'fish_name': order_item.fish_type.name,
                                'required_quantity': quantity,
                                'current_stock': 0,
                                'shortage': quantity,
                                'unit': order_item.unit
                            })
                        elif inventory.stock_quantity < quantity:
                            shortage = quantity - inventory.stock_quantity
                            insufficient_items.append({
                                'fish_name': order_item.fish_type.name,
                                'required_quantity': quantity,
                                'current_stock': inventory.stock_quantity,
                                'shortage': shortage,
                                'unit': order_item.unit
                            })
                    
                    # 재고 부족시 상세 정보와 함께 에러 반환
                    if insufficient_items:
                        return JsonResponse({
                            'error': '재고가 부족하여 출고 준비 상태로 변경할 수 없습니다.',
                            'error_type': 'insufficient_stock',
                            'insufficient_items': insufficient_items,
                            'total_shortage_count': len(insufficient_items)
                        }, status=400)
                
                serializer.save()
                return JsonResponse({
                    'message': '주문 상태가 변경되었습니다.',
                    'order_status': serializer.data['order_status']
                })
            
            print(f"❌ Serializer 유효성 검증 실패: {serializer.errors}")
            return JsonResponse(serializer.errors, status=400)
        except Order.DoesNotExist:
            return JsonResponse({'error': '주문을 찾을 수 없습니다.'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class OrderCancelView(View):
    """Django View 기반 주문 취소 - JWT 미들웨어 인증"""
    
    def patch(self, request, order_id):
        """주문 취소"""
        print(f"❌ 주문 취소 요청: order_id={order_id}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        try:
            # 미들웨어에서 설정된 user_id 사용
            order = Order.objects.get(id=order_id, **get_user_queryset_filter(request))
            
            if order.order_status == 'cancelled':
                return JsonResponse({'error': '이미 취소된 주문입니다.'}, status=400)
                
            order.order_status = 'cancelled'
            order.save()
            
            return JsonResponse({
                'message': '주문이 취소되었습니다.',
                'order_status': 'cancelled'
            })
        except Order.DoesNotExist:
            return JsonResponse({'error': '주문을 찾을 수 없습니다.'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class CancelOrderView(View):
    """Django View 기반 주문 취소 API - JWT 미들웨어 인증"""
    
    def post(self, request):
        """
        주문 취소 API
        주문 상태를 'cancelled'로 변경하고 취소 사유 기록
        """
        print(f"❌ 주문 취소 API 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            print(f"📝 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        order_id = data.get('order_id')
        cancel_reason = data.get('cancel_reason', '')
        cancel_reason_detail = data.get('cancel_reason_detail', '')
        
        if not order_id:
            return JsonResponse({'error': 'order_id는 필수입니다.'}, status=400)
        
        try:
            # 미들웨어에서 설정된 user_id 사용하여 주문 조회
            order = Order.objects.get(id=order_id, **get_user_queryset_filter(request))
            print(f"🔍 주문 조회 성공: order_id={order.id}, 현재 상태={order.order_status}")
            
            # 이미 취소된 주문인지 확인
            if order.order_status == 'cancelled':
                return JsonResponse({'error': '이미 취소된 주문입니다.'}, status=400)
            
            # 출고된 주문은 취소 불가
            if order.order_status == 'delivered':
                return JsonResponse({'error': '출고 완료된 주문은 취소할 수 없습니다.'}, status=400)
            
            # 주문 취소 처리 (트랜잭션으로 재고도 함께 처리)
            with transaction.atomic():
                # 1. 주문 상태 변경
                order.order_status = 'cancelled'
                order.cancel_reason = cancel_reason
                order.cancel_reason_detail = cancel_reason_detail
                order.save()
                
                # 2. 주문수량만 감소 (재고수량은 건드리지 않음)
                from inventory.models import Inventory
                from django.db.models import F
                
                order_items = order.items.all()
                print(f"🔄 주문수량 감소 시작: {order_items.count()}개 아이템")
                
                for order_item in order_items:
                    quantity = order_item.quantity
                    fish_type_id = order_item.fish_type_id
                    
                    # 해당 어종의 첫 번째 재고의 주문수량만 감소 (재고수량은 건드리지 않음)
                    inventory = Inventory.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=request.user_id
                    ).first()
                    
                    if inventory:
                        old_ordered = inventory.ordered_quantity
                        
                        inventory.ordered_quantity = F('ordered_quantity') - quantity
                        inventory.save()
                        inventory.refresh_from_db()  # F 표현식 갱신
                        
                        print(f"✅ 주문수량 감소: {order_item.fish_type.name} - 주문수량:{old_ordered}→{inventory.ordered_quantity} (-{quantity})")
                    else:
                        print(f"⚠️ 주문수량 감소 실패: {order_item.fish_type.name} - 재고 없음")
            
            print(f"✅ 주문 취소 및 재고 롤백 완료: order_id={order.id}")
            
            return JsonResponse({
                'message': '주문이 취소되었습니다',
                'order_id': order.id,
                'order_status': 'cancelled',
                'cancel_reason': cancel_reason
            })
            
        except Order.DoesNotExist:
            print(f"❌ 주문을 찾을 수 없음: order_id={order_id}")
            return JsonResponse({'error': '주문을 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            print(f"❌ 주문 취소 처리 오류: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'주문 취소 처리 중 오류 발생: {str(e)}'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class DocumentRequestView(View):
    """문서 발급 요청 처리 뷰"""
    
    def post(self, request, *args, **kwargs):
        """문서 발급 요청 생성"""
        print(f"📄 문서 발급 요청 처리 시작")
        
        # 사용자 인증 확인
        if not hasattr(request, 'user_id'):
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            print(f"📝 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        # 필수 필드 검증
        required_fields = ['orderId', 'documentType', 'identifier']
        for field in required_fields:
            if field not in data or not data[field]:
                print(f"❌ 필수 필드 누락: {field}")
                return JsonResponse({'error': f'{field}는 필수입니다.'}, status=400)
        
        print(f"✅ 필수 필드 검증 완료")
        
        # 데이터 추출
        order_id = data.get('orderId')
        document_type = data.get('documentType')
        receipt_type = data.get('receiptType')
        identifier = data.get('identifier')
        special_request = data.get('specialRequest', '')
        
        print(f"🔍 추출된 데이터:")
        print(f"  - order_id: {order_id} (타입: {type(order_id)})")
        print(f"  - document_type: {document_type}")
        print(f"  - receipt_type: {receipt_type}")
        print(f"  - identifier: {identifier}")
        print(f"  - special_request: {special_request}")
        
        # 주문 존재 여부 확인
        try:
            order = Order.objects.get(id=order_id)
            print(f"✅ 주문 확인: order_id={order_id}")
        except Order.DoesNotExist:
            print(f"❌ 주문을 찾을 수 없음: order_id={order_id}")
            return JsonResponse({'error': '주문을 찾을 수 없습니다.'}, status=404)
        
        # DocumentRequest 모델 생성 시도
        try:
            print(f"🗄️ DocumentRequest 모델 생성 시도...")
            
            document_request = DocumentRequest.objects.create(
                order_id=order_id,
                user_id=request.user_id,
                document_type=document_type,
                receipt_type=receipt_type,
                identifier=identifier,
                special_request=special_request,
                status='pending'
            )
            
            print(f"✅ DocumentRequest 생성 성공: id={document_request.id}")
            
            # 응답 데이터 구성
            response_data = {
                'message': '문서 발급 요청이 성공적으로 처리되었습니다.',
                'document_request_id': document_request.id,
                'status': document_request.status
            }
            
            print(f"📤 응답 데이터: {response_data}")
            return JsonResponse(response_data, status=201)
            
        except Exception as e:
            print(f"❌ DocumentRequest 생성 실패: {e}")
            print(f"❌ 오류 타입: {type(e)}")
            print(f"❌ 오류 상세: {str(e)}")
            
            # 데이터베이스 제약 조건 오류인지 확인
            if 'constraint' in str(e).lower():
                return JsonResponse({'error': '데이터베이스 제약 조건 위반입니다.'}, status=400)
            elif 'field' in str(e).lower():
                return JsonResponse({'error': '필드 유효성 검증 실패입니다.'}, status=400)
            else:
                return JsonResponse({'error': f'문서 발급 요청 처리 중 오류 발생: {str(e)}'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class DocumentRequestListView(View):
    """문서 발급 요청 목록 조회 뷰"""

    def get(self, request, *args, **kwargs):
        """주문별 문서 발급 요청 목록 조회"""
        print(f"📋 문서 발급 요청 목록 조회 시작")

        # 사용자 인증 확인
        if not hasattr(request, 'user_id'):
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)

        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")

        # URL에서 order_id 추출
        order_id = kwargs.get('order_id')
        if not order_id:
            print(f"❌ 주문 ID 누락")
            return JsonResponse({'error': '주문 ID가 필요합니다.'}, status=400)

        try:
            # 주문 존재 여부 확인
            order = Order.objects.get(id=order_id)
            print(f"✅ 주문 확인: order_id={order_id}")

            # 해당 주문의 문서 발급 요청 조회
            document_requests = DocumentRequest.objects.filter(order_id=order_id)
            print(f"📋 문서 요청 조회 결과: {document_requests.count()}건")

            # 응답 데이터 구성
            response_data = {}
            for doc_request in document_requests:
                response_data[doc_request.document_type] = {
                    'id': doc_request.id,
                    'status': doc_request.status,
                    'created_at': doc_request.created_at.isoformat(),
                    'completed_at': doc_request.completed_at.isoformat() if doc_request.completed_at else None,
                    'document_type': doc_request.document_type,
                    'receipt_type': doc_request.receipt_type,
                    'identifier': doc_request.identifier,
                    'special_request': doc_request.special_request
                }

            print(f"📤 응답 데이터: {response_data}")
            return JsonResponse(response_data, status=200)

        except Order.DoesNotExist:
            print(f"❌ 주문을 찾을 수 없음: order_id={order_id}")
            return JsonResponse({'error': '주문을 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            print(f"❌ 문서 요청 조회 오류: {e}")
            return JsonResponse({'error': f'문서 요청 조회 중 오류 발생: {str(e)}'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class ShipOutOrderView(View):
    """
    주문 출고 처리 뷰
    주문 상태를 'ready'에서 'delivered'로 변경하고 ship_out_datetime 설정
    """
    
    def post(self, request, order_id):
        try:
            # 사용자 인증 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({
                    'error': '사용자 인증이 필요합니다.'
                }, status=401)
            
            order = Order.objects.get(id=order_id)
            
            # 사용자 권한 확인 - 자신이 생성한 주문만 출고 가능 (임시 주석처리)
            # if order.user_id != request.user_id:
            #     return JsonResponse({
            #         'error': '해당 주문을 출고할 권한이 없습니다.'
            #     }, status=403)
            
            # 출고 가능 여부 확인
            if order.order_status != 'ready':
                return JsonResponse({
                    'error': '출고 준비된 주문만 출고할 수 있습니다.'
                }, status=400)
            
            # 재고 부족 검증 (출고 전 검사)
            from inventory.models import Inventory
            insufficient_items = []
            
            for order_item in order.items.all():
                fish_type_id = order_item.fish_type_id
                quantity = order_item.quantity
                
                # 해당 어종의 현재 재고수량 확인
                inventory = Inventory.objects.filter(
                    fish_type_id=fish_type_id,
                    user_id=order.user_id
                ).first()
                
                if not inventory:
                    insufficient_items.append({
                        'fish_name': order_item.fish_type.name,
                        'required_quantity': quantity,
                        'current_stock': 0,
                        'shortage': quantity,
                        'unit': order_item.unit
                    })
                elif inventory.stock_quantity < quantity:
                    shortage = quantity - inventory.stock_quantity
                    insufficient_items.append({
                        'fish_name': order_item.fish_type.name,
                        'required_quantity': quantity,
                        'current_stock': inventory.stock_quantity,
                        'shortage': shortage,
                        'unit': order_item.unit
                    })
            
            # 재고 부족시 상세 정보와 함께 에러 반환
            if insufficient_items:
                return JsonResponse({
                    'error': '재고가 부족하여 출고할 수 없습니다.',
                    'error_type': 'insufficient_stock',
                    'insufficient_items': insufficient_items,
                    'total_shortage_count': len(insufficient_items)
                }, status=400)
            
            # 출고 처리 (트랜잭션으로 재고도 함께 처리)
            with transaction.atomic():
                # 1. 주문 상태 변경
                order.order_status = 'delivered'
                order.ship_out_datetime = timezone.now()
                order.save()
                
                # 2. 재고수량 감소, 주문수량 감소 (출고 완료시 실제 재고 차감)
                from inventory.models import Inventory
                from django.db.models import F
                
                order_items = order.items.all()
                print(f"📦 출고 완료 - 재고차감 시작: {order_items.count()}개 아이템")
                
                for order_item in order_items:
                    quantity = order_item.quantity
                    fish_type_id = order_item.fish_type_id
                    
                    # 해당 어종의 첫 번째 재고의 재고수량과 주문수량 모두 감소
                    inventory = Inventory.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=order.user_id
                    ).first()
                    
                    if inventory:
                        old_stock = inventory.stock_quantity
                        old_ordered = inventory.ordered_quantity
                        
                        inventory.stock_quantity = F('stock_quantity') - quantity
                        inventory.ordered_quantity = F('ordered_quantity') - quantity
                        inventory.save()
                        inventory.refresh_from_db()  # F 표현식 갱신
                        
                        # 출고 로그 생성
                        from inventory.models import InventoryLog
                        InventoryLog.objects.create(
                            inventory=inventory,
                            fish_type=order_item.fish_type,
                            type='out',
                            change=-quantity,
                            before_quantity=old_stock,
                            after_quantity=inventory.stock_quantity,
                            unit=order_item.unit,
                            source_type='order_shipout',
                            memo=f'주문 #{order.id} 출고 처리',
                            updated_by_id=request.user_id
                        )
                        
                        print(f"✅ 출고 완료 재고차감: {order_item.fish_type.name} - 재고:{old_stock}→{inventory.stock_quantity}, 주문:{old_ordered}→{inventory.ordered_quantity} (-{quantity})")
                    else:
                        print(f"⚠️ 재고차감 실패: {order_item.fish_type.name} - 재고 없음")
            
            return JsonResponse({
                'message': '주문이 출고되었습니다',
                'order_id': order.id,
                'order_status': 'delivered',
                'ship_out_datetime': order.ship_out_datetime.isoformat()
            })
            
        except Order.DoesNotExist:
            return JsonResponse({
                'error': '주문을 찾을 수 없습니다.'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'error': '출고 처리 중 오류 발생',
                'details': str(e)
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class UpdateOrderView(View):
    """
    주문 수정 뷰
    PUT: 전체 수정, PATCH: 부분 수정
    """
    
    def put(self, request, order_id):
        return self._update_order(request, order_id, partial=False)
    
    def patch(self, request, order_id):
        return self._update_order(request, order_id, partial=True)
    
    def _update_order(self, request, order_id, partial=False):
        try:
            # 사용자 인증 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({
                    'error': '사용자 인증이 필요합니다.'
                }, status=401)
            
            order = Order.objects.get(id=order_id)
            
            # 사용자 권한 확인 - 자신이 생성한 주문만 수정 가능 (임시 주문처리)
            # if order.user_id != request.user_id:
            #     return JsonResponse({
            #         'error': '해당 주문을 수정할 권한이 없습니다.'
            #     }, status=403)
            
            # 주문 수정 가능 여부 확인
            if order.order_status == 'cancelled':
                return JsonResponse({
                    'error': '취소된 주문은 수정할 수 없습니다.'
                }, status=400)
            
            # 결제 완료된 주문은 수정 불가
            if order.payment and order.payment.payment_status == 'paid':
                return JsonResponse({
                    'error': '결제가 완료된 주문은 수정할 수 없습니다.'
                }, status=400)
            
            # 요청 데이터 파싱
            import json
            data = json.loads(request.body)
            
            # 기본 주문 정보 업데이트
            if 'delivery_datetime' in data:
                # ISO 문자열을 파싱하여 한국 시간대로 설정
                from django.utils import timezone
                import datetime
                
                try:
                    # ISO 문자열을 파싱
                    dt = datetime.datetime.fromisoformat(data['delivery_datetime'].replace('Z', '+00:00'))
                    # UTC 시간을 한국 시간대로 변환
                    korean_tz = timezone.pytz.timezone('Asia/Seoul')
                    korean_dt = dt.astimezone(korean_tz)
                    # 날짜만 추출 (시간은 00:00:00으로 설정)
                    order.delivery_datetime = korean_dt.replace(hour=0, minute=0, second=0, microsecond=0)
                except Exception as e:
                    print(f"⚠️ 날짜 파싱 오류: {e}")
                    # 파싱 실패 시 원본 데이터 사용
                    order.delivery_datetime = data['delivery_datetime']
                    
            if 'ship_out_datetime' in data and data['ship_out_datetime']:
                # 출고일도 한국 시간대로 설정
                from django.utils import timezone
                import datetime
                
                try:
                    dt = datetime.datetime.fromisoformat(data['ship_out_datetime'].replace('Z', '+00:00'))
                    korean_tz = timezone.pytz.timezone('Asia/Seoul')
                    order.ship_out_datetime = dt.astimezone(korean_tz)
                except Exception as e:
                    print(f"⚠️ 출고일 파싱 오류: {e}")
                    order.ship_out_datetime = data['ship_out_datetime']
                    
            if 'memo' in data:
                order.memo = data['memo']
            if 'is_urgent' in data:
                order.is_urgent = data['is_urgent']
            
            # 주문 항목 수정
            if 'order_items' in data and not partial:
                # 기존 주문 항목 삭제
                order.items.all().delete()
                
                # 새로운 주문 항목 생성
                total_price = 0
                for item_data in data['order_items']:
                    from fish_registry.models import FishType
                    
                    # fish_type_id가 없으면 기본값 사용
                    fish_type_id = item_data.get('fish_type_id', 1)
                    try:
                        fish_type = FishType.objects.get(id=fish_type_id)
                    except FishType.DoesNotExist:
                        # 기본 어종이 없으면 첫 번째 어종 사용
                        fish_type = FishType.objects.first()
                        if not fish_type:
                            return JsonResponse({
                                'error': '등록된 어종이 없습니다.'
                            }, status=400)
                    
                    # 타입 변환 및 검증
                    quantity = int(float(item_data['quantity']))
                    unit_price = int(float(item_data['unit_price']))
                    
                    from .models import OrderItem
                    order_item = OrderItem.objects.create(
                        order=order,
                        fish_type=fish_type,
                        quantity=quantity,
                        unit_price=unit_price,
                        unit=item_data['unit'],
                        remarks=item_data.get('remarks', '')
                    )
                    total_price += quantity * unit_price
                
                order.total_price = total_price
            
            order.save()
            
            return JsonResponse({
                'message': '주문이 성공적으로 수정되었습니다',
                'order_id': order.id,
                'total_price': order.total_price,
                'order_status': order.order_status,
                'business_name': order.business.business_name if order.business else None
            })
            
        except Order.DoesNotExist:
            return JsonResponse({
                'error': '주문을 찾을 수 없습니다.'
            }, status=404)
        except Exception as e:
            import traceback
            print(f"❌ 주문 수정 오류: {e}")
            print(f"❌ 상세 오류: {traceback.format_exc()}")
            return JsonResponse({
                'error': '주문 수정 처리 중 오류 발생',
                'details': str(e)
            }, status=500)
