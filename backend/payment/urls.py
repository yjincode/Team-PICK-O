"""
결제 관련 URL 패턴
JWT 전용 API 엔드포인트
"""
from django.urls import path
from .views import (
    TossConfirmView, TossRequestView, MarkPaidView, RefundView, CancelOrderView, 
    UnpaidOrdersView, ARSummaryView
)

urlpatterns = [
    # ==================== 결제 요청/확정 ====================
    # POST /api/v1/payments/toss/request - 토스 페이먼츠 결제 요청 (결제창 방식용)
    path('toss/request/', TossRequestView.as_view(), name='toss-request'),
    
    # POST /api/v1/payments/toss/confirm - 토스 페이먼츠 결제 확정
    path('toss/confirm/', TossConfirmView.as_view(), name='toss-confirm'),
    
    # POST /api/v1/payments/mark-paid - 현금/계좌 수동 완료
    path('mark-paid/', MarkPaidView.as_view(), name='mark-paid'),
    
    # ==================== 환불/취소 처리 ====================
    # POST /api/v1/payments/refund - 환불 처리
    path('refund/', RefundView.as_view(), name='refund'),
    
    # POST /api/v1/payments/cancel-order - 주문 취소
    path('cancel-order/', CancelOrderView.as_view(), name='cancel-order'),
    
    # ==================== 미수금(AR) 조회 ====================
    # GET /api/v1/payments/ar/unpaid-orders - 미결제 주문 목록
    path('ar/unpaid-orders/', UnpaidOrdersView.as_view(), name='unpaid-orders'),
    
    # GET /api/v1/payments/ar/summary - 거래처별 미수금 요약
    path('ar/summary/', ARSummaryView.as_view(), name='ar-summary'),
]
