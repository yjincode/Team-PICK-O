from django.urls import path

from .views import toss_confirm_view


urlpatterns = [
    # 토스 결제 승인 엔드포인트
    path("toss/confirm/", toss_confirm_view, name="toss-confirm"),
]


