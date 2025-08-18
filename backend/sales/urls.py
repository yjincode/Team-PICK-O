from django.urls import path
from . import views

urlpatterns = [
    # 매출 통계 조회
    path('stats/', views.SalesStatsView.as_view(), name='sales-stats'),
    
    # 일별 매출 조회
    path('daily/', views.DailySalesView.as_view(), name='daily-sales'),
]