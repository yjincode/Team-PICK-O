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
    """Django View 기반 주문 목록 - JWT 미들웨어 인증"""
    
    def get(self, request):
        """주문 목록 조회"""
        print(f"📝 주문 목록 조회 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # 미들웨어에서 설정된 user_id 사용
        orders = Order.objects.prefetch_related('items__fish_type').filter(**get_user_queryset_filter(request))
        
        # 상태별 필터링 (선택사항)
        status_filter = request.GET.get('status')
        if status_filter:
            orders = orders.filter(order_status=status_filter)
            
        # 최신순 정렬
        orders = orders.order_by('-order_datetime')
        
        serializer = OrderListSerializer(orders, many=True)
        return JsonResponse(serializer.data, safe=False)


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


@api_view(['POST'])
def cancel_order_view(request):
    """
    주문 취소 API (DRF 스타일)
    주문 상태를 'cancelled'로 변경하고 취소 사유 기록
    """
    # 사용자 인증 확인
    if not hasattr(request, 'user_id') or not request.user_id:
        return Response({
            'error': '사용자 인증이 필요합니다.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    order_id = request.data.get('order_id')
    cancel_reason = request.data.get('cancel_reason', '')
    
    if not order_id:
        return Response({
            'error': 'order_id는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        order = Order.objects.get(id=order_id)
        
        # 사용자 권한 확인 - 자신이 생성한 주문만 취소 가능 (임시 주석처리)
        # if order.user_id != request.user_id:
        #     return Response({
        #         'error': '해당 주문을 취소할 권한이 없습니다.'
        #     }, status=status.HTTP_403_FORBIDDEN)
        
        # 이미 취소된 주문인지 확인
        if order.order_status == 'cancelled':
            return Response({
                'error': '이미 취소된 주문입니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 출고된 주문은 취소 불가
        if order.order_status == 'delivered':
            return Response({
                'error': '출고 완료된 주문은 취소할 수 없습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 주문 취소 처리
        order.order_status = 'cancelled'
        order.cancel_reason = cancel_reason
        order.save()
        
        return Response({
            'message': '주문이 취소되었습니다',
            'order_id': order.id,
            'order_status': 'cancelled',
            'cancel_reason': cancel_reason
        })
        
    except Order.DoesNotExist:
        return Response({
            'error': '주문을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': '주문 취소 처리 중 오류 발생',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def ship_out_order_view(request, order_id):
    """
    주문 출고 처리 API
    주문 상태를 'ready'에서 'delivered'로 변경하고 ship_out_datetime 설정
    """
    try:
        # 사용자 인증 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return Response({
                'error': '사용자 인증이 필요합니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        order = Order.objects.get(id=order_id)
        
        # 사용자 권한 확인 - 자신이 생성한 주문만 출고 가능 (임시 주석처리)
        # if order.user_id != request.user_id:
        #     return Response({
        #         'error': '해당 주문을 출고할 권한이 없습니다.'
        #     }, status=status.HTTP_403_FORBIDDEN)
        
        # 출고 가능 여부 확인
        if order.order_status != 'ready':
            return Response({
                'error': '출고 준비된 주문만 출고할 수 있습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        

        
        # 출고 처리
        order.order_status = 'delivered'
        order.ship_out_datetime = timezone.now()
        order.save()
        
        return Response({
            'message': '주문이 출고되었습니다',
            'order_id': order.id,
            'order_status': 'delivered',
            'ship_out_datetime': order.ship_out_datetime.isoformat()
        })
        
    except Order.DoesNotExist:
        return Response({
            'error': '주문을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': '출고 처리 중 오류 발생',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
def update_order_view(request, order_id):
    """
    주문 수정 API
    PUT: 전체 수정, PATCH: 부분 수정
    """
    try:
        # 사용자 인증 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return Response({
                'error': '사용자 인증이 필요합니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        order = Order.objects.get(id=order_id)
        
        # 사용자 권한 확인 - 자신이 생성한 주문만 수정 가능 (임시 주석처리)
        # if order.user_id != request.user_id:
        #     return Response({
        #         'error': '해당 주문을 수정할 권한이 없습니다.'
        #     }, status=status.HTTP_403_FORBIDDEN)
        
        # 주문 수정 가능 여부 확인
        if order.order_status == 'cancelled':
            return Response({
                'error': '취소된 주문은 수정할 수 없습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        

        
        # Serializer로 수정 처리
        serializer = OrderUpdateSerializer(order, data=request.data, partial=request.method == 'PATCH')
        
        if serializer.is_valid():
            updated_order = serializer.save()
            
            return Response({
                'message': '주문이 성공적으로 수정되었습니다',
                'order_id': updated_order.id,
                'total_price': updated_order.total_price,
                'order_status': updated_order.order_status,
                'business_name': updated_order.business.business_name if updated_order.business else None
            })
        else:
            return Response({
                'error': '주문 수정 데이터가 올바르지 않습니다',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Order.DoesNotExist:
        return Response({
            'error': '주문을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': '주문 수정 처리 중 오류 발생',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
