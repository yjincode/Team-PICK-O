from django.urls import path
from . import views

app_name = 'inventory'

urlpatterns = [
    # 기존 재고 시스템 (보존)
    path('', views.InventoryListCreateView.as_view(), name='inventory-list-create'),
    path('<int:pk>/', views.InventoryDetailView.as_view(), name='inventory-detail'),
    path('fish-types/', views.FishTypeListView.as_view(), name='fish-types'),
    path('stock-check/', views.StockCheckView.as_view(), name='stock-check'),
    
    # 새로운 API 엔드포인트들 (AI 이상 탐지)
    # 1. 입출고 이력 조회
    path('logs/', views.InventoryLogListView.as_view(), name='inventory-logs'),
    
    # 2. 이상 탐지 결과 조회
    path('anomalies/', views.InventoryAnomalyListView.as_view(), name='anomalies'),
    path('anomalies/<int:pk>/', views.AnomalyUpdateView.as_view(), name='anomaly-detail-update'),
    
    # 3. 대시보드용 요약 정보
    path('summary/', views.InventorySummaryView.as_view(), name='inventory-summary'),
    path('anomaly-summary/', views.AnomalySummaryView.as_view(), name='anomaly-summary'),
    
    # 4. 패턴 분석 (향후 PyOD 확장용)
    path('patterns/', views.InventoryPatternListView.as_view(), name='patterns'),
    
    # 5. 실사 관련 API (신규 추가)
    path('<int:inventory_id>/adjust/', views.InventoryAdjustView.as_view(), name='inventory-adjust'),
    path('checklist/', views.InventoryChecklistView.as_view(), name='inventory-checklist'),
    path('check-records/', views.InventoryCheckRecordsView.as_view(), name='inventory-check-records'),
    path('anomalies-list/', views.InventoryAnomaliesView.as_view(), name='anomalies-list'),
]