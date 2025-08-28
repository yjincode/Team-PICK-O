"""
Pydantic 데이터 모델 정의
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """바운딩박스 정보"""
    x: float = Field(..., description="정규화된 X 좌표 (0-1)")
    y: float = Field(..., description="정규화된 Y 좌표 (0-1)")
    width: float = Field(..., description="정규화된 너비 (0-1)")
    height: float = Field(..., description="정규화된 높이 (0-1)")


class DiseaseInfo(BaseModel):
    """질병 정보"""
    class_name: str = Field(..., description="질병 클래스명")
    name_ko: str = Field(..., description="한국어 질병명")
    name_en: str = Field(..., description="영어 질병명")
    confidence: float = Field(..., description="분류 신뢰도")
    severity: str = Field(..., description="심각도 (mild/moderate/severe/critical)")
    description: str = Field(..., description="질병 설명")
    symptoms: str = Field(..., description="증상")
    treatment: str = Field(..., description="치료법")
    prevention: str = Field(..., description="예방법")


class YoloDetection(BaseModel):
    """YOLO 탐지 결과 (VGG 분류 전)"""
    bbox_x: float = Field(..., description="정규화된 X 좌표 (0-1)")
    bbox_y: float = Field(..., description="정규화된 Y 좌표 (0-1)")
    bbox_width: float = Field(..., description="정규화된 너비 (0-1)")
    bbox_height: float = Field(..., description="정규화된 높이 (0-1)")
    confidence: float = Field(..., description="YOLO 탐지 신뢰도")
    class_id: int = Field(..., description="클래스 ID")
    class_name: str = Field(..., description="클래스명")
    absolute_coords: Dict[str, int] = Field(..., description="절대 좌표")


class Detection(BaseModel):
    """완전한 탐지 결과 (YOLO + VGG)"""
    bbox: BoundingBox = Field(..., description="바운딩박스 정보")
    yolo_confidence: float = Field(..., description="YOLO 탐지 신뢰도")
    disease: Optional[DiseaseInfo] = Field(None, description="질병 분류 결과")
    class_name: str = Field(..., description="YOLO 클래스명")
    symptom_severity: Optional[float] = Field(None, description="증상 심각도 점수")
    bbox_size_score: Optional[float] = Field(None, description="바운딩박스 크기 점수")
    vgg_available: Optional[bool] = Field(True, description="VGG 분류 가능 여부")


class AnalysisRequest(BaseModel):
    """분석 요청"""
    # FastAPI에서는 파일 업로드가 별도로 처리되므로 여기서는 필요 없음
    pass


class AnalysisResponse(BaseModel):
    """분석 결과"""
    model_config = {"protected_namespaces": ()}
    
    success: bool = Field(..., description="분석 성공 여부")
    message: str = Field(..., description="결과 메시지")
    overall_health_status: Optional[str] = Field(None, description="전체 건강 상태 (good/fair/poor)")
    health_evaluation: Optional[Dict[str, Any]] = Field(None, description="다차원 건강 평가 결과")
    health_grade_info: Optional[Dict[str, Any]] = Field(None, description="건강 등급 및 메시지")
    total_detections: int = Field(0, description="총 탐지 개수")
    yolo_confidence_avg: float = Field(0.0, description="YOLO 평균 신뢰도")
    detections: List[Detection] = Field(default=[], description="탐지 결과 리스트")
    image_info: Optional[Dict[str, Any]] = Field(None, description="이미지 정보")
    model_info: Optional[Dict[str, Any]] = Field(None, description="모델 정보")
    vgg_available: Optional[bool] = Field(None, description="VGG 모델 사용 가능 여부")
    error: Optional[str] = Field(None, description="오류 메시지")
    error_type: Optional[str] = Field(None, description="오류 타입")
    solution: Optional[Dict[str, Any]] = Field(None, description="해결 방안")
    suggestions: Optional[List[str]] = Field(None, description="개선 제안사항")
    guidelines: Optional[Dict[str, Any]] = Field(None, description="촬영 가이드라인")
    validation_details: Optional[Dict[str, Any]] = Field(None, description="검증 상세 정보")


class YoloResponse(BaseModel):
    """YOLO 탐지 전용 응답"""
    model_config = {"protected_namespaces": ()}
    
    success: bool = Field(..., description="탐지 성공 여부")
    message: str = Field(..., description="결과 메시지")
    total_detections: int = Field(0, description="총 탐지 개수")
    detections: List[YoloDetection] = Field(default=[], description="YOLO 탐지 결과 리스트")
    model_info: Optional[Dict[str, Any]] = Field(None, description="모델 정보")
    error: Optional[str] = Field(None, description="오류 메시지")
    error_type: Optional[str] = Field(None, description="오류 타입")


class ModelStatus(BaseModel):
    """모델 상태"""
    model_config = {"protected_namespaces": ()}
    
    loaded: bool = Field(..., description="모델 로드 여부")
    model_path: str = Field(..., description="모델 파일 경로")
    model_exists: bool = Field(..., description="모델 파일 존재 여부")
    version: Optional[str] = Field(None, description="모델 버전")
    error: Optional[str] = Field(None, description="오류 메시지")


class HealthCheckResponse(BaseModel):
    """헬스 체크 응답"""
    model_config = {"protected_namespaces": ()}
    
    status: str = Field(..., description="서버 상태")
    models: Dict[str, ModelStatus] = Field(..., description="모델 상태")
    server: Dict[str, str] = Field(..., description="서버 정보")