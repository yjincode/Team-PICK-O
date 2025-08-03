from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FishTypeViewSet

app_name = 'fish_registry'

# DRF Router 설정
router = DefaultRouter()
router.register(r'fish-types', FishTypeViewSet, basename='fish-type')

urlpatterns = [
    path('', include(router.urls)),
] 