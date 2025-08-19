from django.urls import path
from .views import (
    OrderUploadView, OrderListView, OrderDetailView, 
    OrderStatusUpdateView, OrderCancelView,
    TranscriptionStatusView, TranscriptionToOrderView,
    CancelOrderView, UpdateOrderView, ShipOutOrderView,
    DocumentRequestView, DocumentRequestListView
)   

urlpatterns = [
    path('upload/', OrderUploadView.as_view(), name='order-upload'),
    # OCR 이미지 업로드는 upload/에서 source_type=image로 처리
    path('', OrderListView.as_view(), name='order-list'),
    path('<int:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:order_id>/status/', OrderStatusUpdateView.as_view(), name='order-status-update'),
    path('<int:order_id>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    
    # 주문 취소 API (Django View 스타일)
    path('cancel/', CancelOrderView.as_view(), name='order-cancel-api'),
    
    # 주문 수정 API
    path('<int:order_id>/update/', UpdateOrderView.as_view(), name='order-update'),
    
    # 주문 출고 API
    path('<int:order_id>/ship-out/', ShipOutOrderView.as_view(), name='order-ship-out'),
    
    # 문서 발급 요청 API
    path('<int:order_id>/document-request/', DocumentRequestView.as_view(), name='document-request'),
    
    # 문서 발급 요청 목록 조회 API
    path('<int:order_id>/document-requests/', DocumentRequestListView.as_view(), name='document-request-list'),
    
    # STT 관련 API
    path('transcription/<uuid:transcription_id>/status/', TranscriptionStatusView.as_view(), name='transcription-status'),
    path('transcription/<uuid:transcription_id>/create-order/', TranscriptionToOrderView.as_view(), name='transcription-to-order'),
]
