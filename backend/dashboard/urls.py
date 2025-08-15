from django.urls import path
from . import views
from .views import DashboardStatsView, DashboardRecentOrdersView, DashboardLowStockView

app_name = 'dashboard'

urlpatterns = [
    # 관리자 대시보드
    path('admin/stats/', views.get_dashboard_stats, name='admin_stats'),
    
    # 사용자 대시보드 API
    path('stats/', DashboardStatsView.as_view(), name='stats'),
    path('recent-orders/', DashboardRecentOrdersView.as_view(), name='recent_orders'),
    path('low-stock/', DashboardLowStockView.as_view(), name='low_stock'),
]