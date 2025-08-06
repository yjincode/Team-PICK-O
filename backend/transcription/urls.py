from django.urls import path
from . import views

app_name = 'transcription'

urlpatterns = [
    path('transcribe/', views.TranscribeAudioView.as_view(), name='transcribe'),
    path('transcriptions/<uuid:transcription_id>/', views.TranscriptionDetailView.as_view(), name='transcription-detail'),
]
