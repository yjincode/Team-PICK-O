from django.urls import path
from . import views

urlpatterns = [
    # 매출 통계 조회
    path('stats/', views.SalesStatsView.as_view(), name='sales-stats'),
    
    # 일별 매출 조회
    path('daily/', views.DailySalesView.as_view(), name='daily-sales'),
    
    # 거래처별 구매 순위
    path('business-ranking/', views.BusinessRankingView.as_view(), name='business-ranking'),
    
    # 어종별 판매량
    path('fish-sales/', views.FishTypeSalesView.as_view(), name='fish-sales'),
]