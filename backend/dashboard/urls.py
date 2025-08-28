from django.urls import path
from . import views
from .views import DashboardStatsView, DashboardRecentOrdersView, DashboardLowStockView, weather_warnings, weather_forecast, weather_status

app_name = 'dashboard'

urlpatterns = [
    # 관리자 대시보드
    path('admin/stats/', views.get_dashboard_stats, name='admin_stats'),
    
    # 사용자 대시보드 API
    path('stats/', DashboardStatsView.as_view(), name='stats'),
    path('recent-orders/', DashboardRecentOrdersView.as_view(), name='recent_orders'),
    path('low-stock/', DashboardLowStockView.as_view(), name='low_stock'),
    
    # 기상청 날씨 및 경보 API
    path('weather/warnings/', weather_warnings, name='weather_warnings'),
    path('weather/forecast/', weather_forecast, name='weather_forecast'),
    path('weather/status/', weather_status, name='weather_status'),
]