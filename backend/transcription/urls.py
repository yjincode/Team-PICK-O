from django.urls import path
from . import views

app_name = 'transcription'

urlpatterns = [
    path('transcribe/', views.transcribe_audio, name='transcribe'),
]
from django.urls import path
from .views import SpeechToTextView

urlpatterns = [
    path("api/stt/", SpeechToTextView.as_view(), name="speech-to-text"),
]
