from django.urls import path
from .views import OrderUploadView, OrderListView, OrderDetailView, OrderStatusUpdateView, OrderCancelView
from .views_ocr import OCRImageUploadView

urlpatterns = [
    path('upload/', OrderUploadView.as_view(), name='order-upload'),
    path('upload/ocr/', OCRImageUploadView.as_view(), name='order-upload-ocr'),  # New OCR endpoint
    path('', OrderListView.as_view(), name='order-list'),
    path('<int:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:order_id>/status/', OrderStatusUpdateView.as_view(), name='order-status-update'),
    path('<int:order_id>/cancel/', OrderCancelView.as_view(), name='order-cancel'),
]
