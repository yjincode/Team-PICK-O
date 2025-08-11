import io
import torch
import torchaudio
import logging
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from .models import AudioTranscription
from .serializers import AudioTranscriptionSerializer
from .services.order_service import OrderCreationService

logger = logging.getLogger(__name__)

# Load model and processor once at startup
processor = AutoProcessor.from_pretrained("openai/whisper-large-v3")
model = AutoModelForSpeechSeq2Seq.from_pretrained("openai/whisper-large-v3")
model.eval()

# Use GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

def process_audio_directly(audio_file, language='ko'):
    """직접 오디오 파일을 처리하여 텍스트로 변환"""
    import tempfile
    import os
    
    try:
        logger.info(f"🔄 STT 처리 시작: {audio_file.name}")
        
        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.name)[1]) as temp_file:
            for chunk in audio_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # torchaudio로 파일 로드
            audio_tensor, sample_rate = torchaudio.load(temp_file_path)
            
            # Convert to 16kHz if needed
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
                audio_tensor = resampler(audio_tensor)
            
            logger.info(f"🔧 Whisper 모델 처리 시작... (샘플레이트: {sample_rate} -> 16000)")
            
            # Preprocess
            inputs = processor(
                audio_tensor.squeeze().numpy(),
                sampling_rate=16000,
                return_tensors="pt"
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            # Generate transcription
            with torch.no_grad():
                generated_ids = model.generate(
                    inputs["input_features"],
                    forced_decoder_ids=processor.get_decoder_prompt_ids(
                        language=language,
                        task="transcribe"
                    )
                )
            
            # Decode and return result
            transcription_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            logger.info(f"✅ STT 처리 완료: {transcription_text[:50]}...")
            
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
        # 직접 음성을 텍스트로 변환 (실시간 처리)
        transcription_text = process_audio_directly(audio_file, language)
        
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
