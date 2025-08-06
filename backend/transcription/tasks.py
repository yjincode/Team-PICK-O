from celery import shared_task
from .views import TranscribeAudioView

@shared_task(bind=True, max_retries=3)
def process_audio_task(self, transcription_id):
    """
    Celery task to process audio transcription in the background
    """
    try:
        # Call the static method from the view
        TranscribeAudioView.process_audio(transcription_id)
    except Exception as exc:
        # Retry the task if it fails
        self.retry(exc=exc, countdown=60 * 5)  # Retry after 5 minutes
