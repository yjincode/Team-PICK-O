import logging
import os
import tempfile

# faster_whisper 모듈을 조건부로 import
try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    print("⚠️ faster_whisper 모듈이 설치되지 않았습니다. STT 기능이 비활성화됩니다.")
    WhisperModel = None
    FASTER_WHISPER_AVAILABLE = False
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import AudioTranscription
from .serializers import AudioTranscriptionSerializer
from .services.order_service import OrderCreationService

logger = logging.getLogger(__name__)

# Faster-Whisper 모델 로드 (한 번만 로드)
whisper_model = None

def get_whisper_model():
    """Faster-Whisper 모델을 로드하고 캐싱"""
    global whisper_model
    if whisper_model is None:
        logger.info("🔄 Faster-Whisper 모델 로딩 중...")
        # 'small' 모델 사용, CPU 최적화
        whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
        logger.info("✅ Faster-Whisper 모델 로딩 완료")
    return whisper_model

def process_audio_with_whisper(audio_file, language='ko'):
    """Faster-Whisper를 사용하여 오디오를 텍스트로 변환"""
    try:
        logger.info(f"🔄 Faster-Whisper STT 처리 시작: {audio_file.name}")
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.name)[1]) as temp_file:
            for chunk in audio_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # Faster-Whisper 모델 가져오기
            model = get_whisper_model()
            
            # 음성 인식 수행 (Faster-Whisper API)
            segments, info = model.transcribe(
                temp_file_path,
                language=language if language != 'ko' else 'ko',
                beam_size=1,  # 빠른 처리
                temperature=0.0,  # 일관된 결과
                condition_on_previous_text=False,  # 긴 오디오 최적화
                vad_filter=True,  # 음성 구간 자동 감지
                vad_parameters=dict(min_silence_duration_ms=500)  # 무음 구간 처리
            )
            
            # 세그먼트 결합하여 전체 텍스트 생성
            transcription_text = " ".join([segment.text for segment in segments]).strip()
            logger.info(f"✅ Faster-Whisper STT 처리 완료: {transcription_text[:50]}...")
            
            return transcription_text
            
        finally:
            # 임시 파일 정리
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"❌ STT 처리 실패: {str(e)}", exc_info=True)
        raise e

@api_view(['POST'])
@authentication_classes([])  # 인증 완전 비활성화
@permission_classes([AllowAny])
def transcribe_audio(request):
    if 'audio' not in request.FILES:
        return Response(
            {"error": "No audio file provided"},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    audio_file = request.FILES['audio']
    language = request.data.get('language', 'ko')  # 기본값을 한국어로 변경
    
    # Validate file extension
    valid_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
    if not any(audio_file.name.lower().endswith(ext) for ext in valid_extensions):
        return Response(
            {"error": f"Invalid audio format. Supported formats: {', '.join(valid_extensions)}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # 오픈소스 Whisper 모델을 사용하여 음성을 텍스트로 변환
        transcription_text = process_audio_with_whisper(audio_file, language)
        
        return Response(
            {
                "message": "Transcription completed",
                "transcription": transcription_text,
                "language": language
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return Response(
            {"error": f"Failed to process request: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def parse_text_to_order(request):
    """텍스트를 주문 데이터로 파싱하는 API"""
    if 'text' not in request.data:
        return Response(
            {"error": "No text provided"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    text = request.data.get('text', '').strip()
    if not text:
        return Response(
            {"error": "Empty text provided"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # 헤더에서 직접 인증 정보 추출 (미들웨어 우회)
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            try:
                import jwt
                from django.conf import settings
                token = auth_header.split(' ')[1]
                
                # JWT 토큰 직접 검증 (jwt_utils import 문제 회피)
                payload = jwt.decode(
                    token, 
                    getattr(settings, 'JWT_SECRET_KEY', 'your-super-secret-key-change-in-production'), 
                    algorithms=['HS256']
                )
                
                if payload and payload.get('token_type') == 'access':
                    user_id = payload.get('user_id')
                    logger.info(f"🔑 토큰에서 user_id 추출: {user_id}")
            except Exception as e:
                logger.warning(f"토큰 검증 실패: {e}")
        
        # user_id가 없어도 계속 진행 (AI 서버는 공개 API로 동작)
        
        # 텍스트 파싱 기능 비활성화 - AI 서버 의존성 제거
        return Response(
            {
                "success": False,
                "message": "텍스트 파싱 기능은 현재 비활성화되었습니다."
            },
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
        
    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        return Response(
            {"error": f"텍스트 파싱 처리 중 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
