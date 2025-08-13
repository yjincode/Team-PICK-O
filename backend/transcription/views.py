import logging
import os
import tempfile
import whisper
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

# Whisper 모델 로드 (한 번만 로드)
whisper_model = None

def get_whisper_model():
    """Whisper 모델을 로드하고 캐싱"""
    global whisper_model
    if whisper_model is None:
        logger.info("🔄 Whisper 모델 로딩 중...")
        # 'base' 모델 사용 (속도와 정확도의 균형)
        whisper_model = whisper.load_model("base")
        logger.info("✅ Whisper 모델 로딩 완료")
    return whisper_model

def process_audio_with_whisper(audio_file, language='ko'):
    """오픈소스 Whisper 모델을 사용하여 오디오를 텍스트로 변환"""
    try:
        logger.info(f"🔄 Whisper STT 처리 시작: {audio_file.name}")
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.name)[1]) as temp_file:
            for chunk in audio_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # Whisper 모델 가져오기
            model = get_whisper_model()
            
            # 음성 인식 수행
            result = model.transcribe(
                temp_file_path,
                language=language if language != 'ko' else 'korean'
            )
            
            transcription_text = result["text"].strip()
            logger.info(f"✅ Whisper STT 처리 완료: {transcription_text[:50]}...")
            
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
