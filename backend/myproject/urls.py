# myproject/urls.py
from django.urls import path
from signaling.views import post_message

urlpatterns = [
    path("call/start", lambda r: post_message(r, "offer")),
    path("call/answer", lambda r: post_message(r, "answer")),
    path("call/ice", lambda r: post_message(r, "ice")),
    path("transcript", lambda r: post_message(r, "transcript")),
]
