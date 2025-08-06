# Audio Transcription API with Django and Whisper

This is a Django application that provides an API for transcribing audio files using OpenAI's Whisper model.

## Setup

1. Install the required dependencies:
   ```bash
   pip install torch torchaudio transformers django djangorestframework celery
   ```

2. Add the following to your Django project's `settings.py`:
   ```python
   INSTALLED_APPS = [
       # ...
       'rest_framework',
       'transcription',
   ]

   # Media files
   MEDIA_URL = '/media/'
   MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

   # Celery Configuration
   CELERY_BROKER_URL = 'redis://localhost:6379/0'
   CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
   ```

3. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. Start the Celery worker:
   ```bash
   celery -A your_project_name worker --loglevel=info
   ```

## API Endpoints

### 1. Transcribe Audio

**Endpoint:** `POST /api/transcribe/`

**Headers:**
- `Authorization`: Bearer <your_auth_token>
- `Content-Type`: multipart/form-data

**Body:**
- `audio`: Audio file (wav, mp3, flac, m4a, ogg)
- `language`: (Optional) Language code (default: 'en')

**Example Response (202 Accepted):**
```json
{
    "message": "Transcription started",
    "transcription_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 2. Get Transcription Status

**Endpoint:** `GET /api/transcriptions/{transcription_id}/`

**Headers:**
- `Authorization`: Bearer <your_auth_token>

**Example Response (200 OK):**
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "audio_file": "http://example.com/media/audio_files/audio_123.wav",
    "transcription": "This is the transcribed text from the audio.",
    "status": "completed",
    "created_at": "2023-01-01T12:00:00Z",
    "language": "en"
}
```

## Error Responses

### 400 Bad Request
```json
{
    "error": "No audio file provided"
}
```

### 404 Not Found
```json
{
    "error": "Transcription not found"
}
```

### 500 Internal Server Error
```json
{
    "error": "Failed to process request: Error message"
}
```
