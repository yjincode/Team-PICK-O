from django.urls import path
from .views import FishTypeView

app_name = 'fish_registry'

urlpatterns = [
    # 어종 목록 조회 및 생성
    path('fish-types/', FishTypeView.as_view(), name='fish-type-list'),
    
    # 단일 어종 조회, 수정, 삭제
    path('fish-types/<int:fish_type_id>/', FishTypeView.as_view(), name='fish-type-detail'),
] 