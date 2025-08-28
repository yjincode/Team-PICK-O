"""
어류 질병 분석 API URL 라우팅
"""
from django.urls import path
from .views import (
    FishAnalysisView,
    FishAnalysisDetailView,
    EfficientNetClassificationView,
)

app_name = 'fish_analysis'

urlpatterns = [
    # 분석 관련 API
    path('analyze/', FishAnalysisView.as_view(), name='analyze'),  # POST: 분석 요청, GET: 분석 목록
    path('analyze/<int:analysis_id>/', FishAnalysisDetailView.as_view(), name='analyze_detail'),  # GET: 상세 조회, DELETE: 삭제
    path('classify/', EfficientNetClassificationView.as_view(), name='efficientnet_classify'),  # POST: EfficientNet 질병 분류
    path('predict/', FishAnalysisView.as_view(), name='predict'),  # POST: 메인 분석 파이프라인 (별칭)
    path('predict', FishAnalysisView.as_view(), name='predict_no_slash'),  # 슬래시 없는 버전
]