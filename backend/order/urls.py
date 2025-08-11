from django.urls import path
from .views import (
    OrderUploadView, OrderListView, OrderDetailView, 
    OrderStatusUpdateView, OrderCancelView,
    TranscriptionStatusView, TranscriptionToOrderView
)

urlpatterns = [
    path('upload/', OrderUploadView.as_view(), name='order-upload'),
    # OCR 이미지 업로드는 upload/에서 source_type=image로 처리
    path('', OrderListView.as_view(), name='order-list'),
    path('<int:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:order_id>/status/', OrderStatusUpdateView.as_view(), name='order-status-update'),
    path('<int:order_id>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
    
    # STT 관련 API
    path('transcription/<uuid:transcription_id>/status/', TranscriptionStatusView.as_view(), name='transcription-status'),
    path('transcription/<uuid:transcription_id>/create-order/', TranscriptionToOrderView.as_view(), name='transcription-to-order'),
]
