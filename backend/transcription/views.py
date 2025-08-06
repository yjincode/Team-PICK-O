import io
import torch
import torchaudio
import logging
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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

class TranscribeAudioView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, format=None):
        if 'audio' not in request.FILES:
            return Response(
                {"error": "No audio file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        audio_file = request.FILES['audio']
        language = request.data.get('language', 'en')
        
        # Validate file extension
        valid_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
        if not any(audio_file.name.lower().endswith(ext) for ext in valid_extensions):
            return Response(
                {"error": f"Invalid audio format. Supported formats: {', '.join(valid_extensions)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create transcription record
            transcription = AudioTranscription.objects.create(
                user=request.user,
                audio_file=audio_file,
                language=language,
                status='processing'
            )
            
            # Process audio in a separate thread to avoid blocking
            self.process_audio.delay(transcription.id)
            
            return Response(
                {
                    "message": "Transcription started",
                    "transcription_id": str(transcription.id)
                },
                status=status.HTTP_202_ACCEPTED
            )
            
        except Exception as e:
            return Response(
                {"error": f"Failed to process request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @staticmethod
    def process_audio(transcription_id):
        try:
            transcription = AudioTranscription.objects.get(id=transcription_id)
            transcription.status = 'processing'
            transcription.save(update_fields=['status'])
            
            # Read audio file
            audio_bytes = transcription.audio_file.read()
            audio_tensor, sample_rate = torchaudio.load(io.BytesIO(audio_bytes))
            
            # Convert to 16kHz if needed
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
                audio_tensor = resampler(audio_tensor)
            
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
                        language=transcription.language,
                        task="transcribe"
                    )
                )
            
            # Decode and save result
            transcription_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            # Save the transcription
            transcription.transcription = transcription_text
            transcription.status = 'completed'
            transcription.save(update_fields=['transcription', 'status'])
            
            # Create order from transcription if user is authenticated
            if transcription.user and transcription.create_order:
                try:
                    order_service = OrderCreationService(transcription.user)
                    order, _ = order_service.create_order(
                        text=transcription_text,
                        business_id=transcription.business_id
                    )
                    transcription.order = order
                    transcription.save(update_fields=['order'])
                    logger.info(f"Order {order.id} created from transcription {transcription.id}")
                except Exception as e:
                    logger.error(f"Failed to create order from transcription {transcription.id}: {str(e)}")
                    transcription.status = 'completed_with_errors'
                    transcription.save(update_fields=['status'])
            
        except Exception as e:
            logger.error(f"Error processing transcription {transcription_id}: {str(e)}", exc_info=True)
            transcription.status = 'failed'
            transcription.save(update_fields=['status'])
            raise  # Re-raise to allow Celery to handle retries

class TranscriptionDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transcription_id, format=None):
        try:
            transcription = AudioTranscription.objects.get(
                id=transcription_id,
                user=request.user
            )
            serializer = AudioTranscriptionSerializer(transcription)
            return Response(serializer.data)
            
        except AudioTranscription.DoesNotExist:
            return Response(
                {"error": "Transcription not found"},
                status=status.HTTP_404_NOT_FOUND
            )
