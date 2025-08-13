import logging
import os
import openai
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

# OpenAI API 설정
openai.api_key = getattr(settings, 'OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY'))

def process_audio_with_whisper_api(audio_file, language='ko'):
    """OpenAI Whisper API를 사용하여 오디오를 텍스트로 변환"""
    try:
        logger.info(f"🔄 Whisper API STT 처리 시작: {audio_file.name}")
        
        # OpenAI Whisper API 호출
        response = openai.Audio.transcribe(
            model="whisper-1",
            file=audio_file,
            language=language if language != 'ko' else 'ko'  # 한국어 처리
        )
        
        transcription_text = response['text'].strip()
        logger.info(f"✅ Whisper API STT 처리 완료: {transcription_text[:50]}...")
        
        return transcription_text
        
    except openai.error.OpenAIError as e:
        logger.error(f"❌ OpenAI API 오류: {str(e)}", exc_info=True)
        raise Exception(f"OpenAI API 오류: {str(e)}")
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
        # OpenAI Whisper API를 사용하여 음성을 텍스트로 변환
        transcription_text = process_audio_with_whisper_api(audio_file, language)
        
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
