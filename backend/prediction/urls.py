"""
예측 API URL 설정
"""
from django.urls import path
from . import views

app_name = 'prediction'

urlpatterns = [
    # 단일 어종 예측
    path('single/', views.predict_price, name='predict_single'),
    
    # 실제 경매가 데이터 조회
    path('actual/', views.get_actual_auction_data, name='actual_auction_data'),
    
    # 모델 캐시 상태 확인
    path('cache-status/', views.get_model_cache_status, name='cache_status'),
    
    # 대시보드
    path('dashboard/', views.prediction_dashboard, name='dashboard'),
]
