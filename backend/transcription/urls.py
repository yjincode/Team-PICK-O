from django.urls import path
from . import views

app_name = 'transcription'

urlpatterns = [
    path('transcribe/', views.transcribe_audio, name='transcribe'),
    path('parse-text/', views.parse_text_to_order, name='parse-text'),
]
