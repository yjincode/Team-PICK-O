from django.urls import path
from .views import OrderUploadView

urlpatterns = [
    path('upload/', OrderUploadView.as_view(), name='order-upload'),
]
