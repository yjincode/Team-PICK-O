from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'fish_analysis'

# DRF Router (ViewSet용 - 현재는 미사용)
router = DefaultRouter()

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # 메인 분석 API
    path('analyze/', views.analyze_fish_image, name='analyze'),
    path('batch-analyze/', views.batch_analyze_fish_images, name='batch-analyze'),
    path('mobile-analyze/', views.mobile_analyze_fish_image, name='mobile-analyze'),
    
    # 결과 조회
    path('history/', views.AnalysisHistoryListView.as_view(), name='history'),
    path('detail/<uuid:id>/', views.AnalysisDetailView.as_view(), name='detail'),
    
    # 통계 및 요약
    path('health-summary/', views.get_health_summary, name='health-summary'),
    
    # 세션 관리
    path('sessions/', views.AnalysisSessionListView.as_view(), name='sessions'),
    path('sessions/<uuid:id>/', views.AnalysisSessionDetailView.as_view(), name='session-detail'),
    
    # 시스템 정보
    path('supported-formats/', views.get_supported_formats, name='supported-formats'),
    path('model-status/', views.get_model_status, name='model-status'),
    path('initialize-models/', views.initialize_models, name='initialize-models'),
]

"""
API 엔드포인트 목록:

분석 API:
- POST /api/v1/fish/analyze/                 # 단일 이미지 분석
- POST /api/v1/fish/batch-analyze/           # 배치 이미지 분석  
- POST /api/v1/fish/mobile-analyze/          # 모바일 앱용 분석

결과 조회:
- GET  /api/v1/fish/history/                 # 분석 기록 목록 (페이지네이션)
- GET  /api/v1/fish/detail/<uuid>/           # 분석 결과 상세

통계:
- GET  /api/v1/fish/health-summary/          # 건강 상태 요약

세션 관리:
- GET  /api/v1/fish/sessions/                # 분석 세션 목록
- GET  /api/v1/fish/sessions/<uuid>/         # 세션 상세 정보

시스템:
- GET  /api/v1/fish/supported-formats/       # 지원 파일 형식
- GET  /api/v1/fish/model-status/            # AI 모델 상태
- POST /api/v1/fish/initialize-models/       # 모델 초기화 (관리자)
"""