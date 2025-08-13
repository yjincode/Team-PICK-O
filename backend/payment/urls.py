from django.urls import path

from .views import toss_confirm_view, manual_payment_complete_view, refund_payment_view


urlpatterns = [
    # 토스 결제 승인 엔드포인트 (복수형 payments로 통일)
    path("toss/confirm/", toss_confirm_view, name="toss-confirm"),
    
    # 현금/계좌이체 결제 완료 처리
    path("manual/complete/", manual_payment_complete_view, name="manual-payment-complete"),
    
    # 결제 환불 처리
    path("refund/", refund_payment_view, name="payment-refund"),
]


