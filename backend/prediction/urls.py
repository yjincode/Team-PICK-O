"""
예측 API URL 설정
"""
from django.urls import path
from . import views

app_name = 'prediction'

urlpatterns = [
    # 단일 어종 예측
    path('single/', views.predict_single_species, name='predict_single'),
    
    # 모든 어종 예측
    path('all/', views.predict_all_species, name='predict_all'),
    
    # 지원하는 어종 목록
    path('species/', views.get_supported_species, name='supported_species'),
    
    # 실제 경매가 데이터 조회
    path('actual/', views.get_actual_auction_data, name='actual_auction_data'),
    
    # 헬스 체크
    path('health/', views.health_check, name='health_check'),
    
    # 대시보드
    path('dashboard/', views.dashboard_view, name='dashboard'),
]
