from django.urls import path

from .views import TossConfirmView


urlpatterns = [
    # 토스 결제 승인 엔드포인트
    path("toss/confirm/", TossConfirmView.as_view(), name="toss-confirm"),
]


