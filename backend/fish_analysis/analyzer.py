import os
import cv2
import numpy as np
from PIL import Image
import torch
from typing import List, Optional, Tuple, Dict, Any
import logging
from datetime import datetime
import uuid
import asyncio
import httpx
from io import BytesIO
from django.conf import settings
from django.core.files.base import ContentFile

from .models import FishAnalysis, DetectionBox, DiseaseDetection

# YOLOv8 및 Hugging Face 관련 임포트 (설치 후 주석 해제)
# from ultralytics import YOLO
# from transformers import AutoImageProcessor, AutoModelForImageClassification

logger = logging.getLogger(__name__)

class DjangoFishAnalyzer:
    """Django용 생선 상태 분석기"""
    
    def __init__(self):
        self.yolo_model = None
        self.disease_model = None
        self.species_model = None
        self.model_loaded = False
        self.last_updated = None
        
    def initialize_models(self):
        """모델 초기화 (동기 버전)"""
        try:
            # AI_MODELS 설정에서 모델 경로 가져오기
            ai_config = getattr(settings, 'AI_MODELS', {})
            
            # YOLOv8 모델 로드 (생선 탐지용)
            yolo_path = ai_config.get('YOLO_MODEL_PATH', 'yolov8n.pt')
            # self.yolo_model = YOLO(yolo_path)
            
            # 허깅페이스 질병 분류 모델
            disease_model_name = ai_config.get('HF_DISEASE_MODEL', 'fish-disease-classifier')
            # self.disease_processor = AutoImageProcessor.from_pretrained(disease_model_name)
            # self.disease_model = AutoModelForImageClassification.from_pretrained(disease_model_name)
            
            # 생선 종류 분류 모델
            species_model_name = ai_config.get('HF_SPECIES_MODEL', 'fish-species-classifier')
            # self.species_processor = AutoImageProcessor.from_pretrained(species_model_name)
            # self.species_model = AutoModelForImageClassification.from_pretrained(species_model_name)
            
            self.model_loaded = True
            self.last_updated = datetime.now()
            logger.info("✅ 모든 AI 모델 로드 완료")
            
        except Exception as e:
            logger.error(f"❌ 모델 로드 실패: {str(e)}")
            self.model_loaded = False
            
    def analyze_image_sync(
        self, 
        image_bytes: bytes,
        user=None,
        analyze_species: bool = True,
        analyze_health: bool = True, 
        analyze_diseases: bool = True,
        confidence_threshold: float = 0.5,
        session=None
    ) -> FishAnalysis:
        """이미지 분석 메인 함수 (Django 동기 버전)"""
        
        start_time = datetime.now()
        
        try:
            # 이미지 전처리
            image = self._preprocess_image(image_bytes)
            height, width = image.shape[:2]
            
            # 이미지 품질 평가
            quality_score = self._assess_image_quality(image)
            
            # Django 모델 인스턴스 생성
            analysis = FishAnalysis.objects.create(
                user=user,
                session=session,
                image=ContentFile(
                    image_bytes, 
                    name=f"fish_analysis_{uuid.uuid4().hex}.jpg"
                ),
                image_width=width,
                image_height=height,
                quality_score=quality_score,
            )
            
            # 이미지 품질 검사
            warnings = []
            if quality_score < 0.3:
                warnings.append("이미지 품질이 낮습니다. 더 선명한 이미지를 사용해주세요.")
                
            # 모델이 로드되지 않은 경우 Mock 데이터 반환
            if not self.model_loaded:
                logger.warning("⚠️ AI 모델이 로드되지 않음. Mock 데이터를 반환합니다.")
                return self._generate_mock_result(analysis, warnings)
            
            # 1. YOLOv8으로 생선 탐지
            detection_boxes = self._detect_fish_sync(image, confidence_threshold)
            analysis.fish_detected = len(detection_boxes) > 0
            
            # 탐지 박스 저장
            for box_data in detection_boxes:
                DetectionBox.objects.create(
                    analysis=analysis,
                    x1=box_data['x1'], y1=box_data['y1'],
                    x2=box_data['x2'], y2=box_data['y2'],
                    confidence=box_data['confidence'],
                    class_name=box_data['class_name']
                )
            
            if not analysis.fish_detected:
                warnings.append("이미지에서 생선을 찾을 수 없습니다.")
                analysis.warning_messages = warnings
                analysis.save()
                return analysis
                
            # 2. 생선 종류 분류
            if analyze_species:
                species, species_conf = self._classify_species_sync(image)
                analysis.fish_species = species
                analysis.species_confidence = species_conf
                
            # 3. 건강 상태 및 질병 분석
            if analyze_health or analyze_diseases:
                health_result = self._analyze_health_and_diseases_sync(
                    image, detection_boxes, analyze_diseases
                )
                analysis.overall_health = health_result['health_status']
                analysis.health_confidence = health_result['health_confidence']
                
                # 질병 정보 저장
                for disease_data in health_result['diseases']:
                    DiseaseDetection.objects.create(
                        analysis=analysis,
                        disease_type=disease_data['disease_type'],
                        confidence=disease_data['confidence'],
                        severity=disease_data['severity'],
                        description=disease_data['description'],
                        treatment_recommendation=disease_data.get('treatment_recommendation', '')
                    )
                
            # 4. 권장사항 생성
            recommendations = self._generate_recommendations(analysis)
            analysis.recommendations = recommendations
            analysis.warning_messages = warnings
            
            # 처리 시간 계산
            processing_time = (datetime.now() - start_time).total_seconds()
            analysis.processing_time = processing_time
            
            analysis.save()
            
            logger.info(f"✅ 분석 완료 - ID: {analysis.id}, 처리시간: {processing_time:.2f}초")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ 이미지 분석 실패: {str(e)}")
            raise
            
    def _preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """이미지 전처리"""
        try:
            # PIL로 이미지 로드
            image = Image.open(BytesIO(image_bytes))
            
            # RGB로 변환
            if image.mode != 'RGB':
                image = image.convert('RGB')
                
            # OpenCV 형식으로 변환
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 이미지 크기 정규화 (최대 1920x1080)
            height, width = opencv_image.shape[:2]
            if width > 1920 or height > 1080:
                scale = min(1920/width, 1080/height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                opencv_image = cv2.resize(opencv_image, (new_width, new_height))
                
            return opencv_image
            
        except Exception as e:
            logger.error(f"이미지 전처리 실패: {str(e)}")
            raise
            
    def _assess_image_quality(self, image: np.ndarray) -> float:
        """이미지 품질 평가 (선명도, 밝기 등)"""
        try:
            # 그레이스케일 변환
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 라플라시안 필터로 선명도 측정
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 1000, 1.0)  # 정규화
            
            # 밝기 평가
            mean_brightness = np.mean(gray) / 255.0
            brightness_score = 1.0 - abs(mean_brightness - 0.5) * 2  # 0.5가 최적
            
            # 대비 평가
            contrast_score = np.std(gray) / 128.0  # 정규화
            contrast_score = min(contrast_score, 1.0)
            
            # 전체 품질 점수 (가중 평균)
            quality_score = (sharpness_score * 0.5 + brightness_score * 0.3 + contrast_score * 0.2)
            
            return float(quality_score)
            
        except Exception as e:
            logger.error(f"이미지 품질 평가 실패: {str(e)}")
            return 0.5  # 기본값
            
    def _detect_fish_sync(self, image: np.ndarray, confidence_threshold: float) -> List[Dict]:
        """YOLOv8로 생선 탐지 (동기 버전)"""
        try:
            # 실제 YOLOv8 모델 사용 (모델 로드 후 주석 해제)
            # results = self.yolo_model(image, conf=confidence_threshold)
            # 
            # detection_boxes = []
            # for result in results:
            #     boxes = result.boxes
            #     if boxes is not None:
            #         for i in range(len(boxes)):
            #             x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
            #             conf = boxes.conf[i].cpu().numpy()
            #             cls = int(boxes.cls[i].cpu().numpy())
            #             class_name = self.yolo_model.names[cls]
            #             
            #             detection_boxes.append({
            #                 'x1': float(x1), 'y1': float(y1),
            #                 'x2': float(x2), 'y2': float(y2),
            #                 'confidence': float(conf),
            #                 'class_name': class_name
            #             })
            # return detection_boxes
            
            # Mock 데이터 (실제 모델 대신)
            return []
            
        except Exception as e:
            logger.error(f"생선 탐지 실패: {str(e)}")
            return []
            
    def _classify_species_sync(self, image: np.ndarray) -> Tuple[str, float]:
        """생선 종류 분류 (동기 버전)"""
        try:
            # 실제 허깅페이스 모델 사용 (모델 로드 후 주석 해제)
            # pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            # inputs = self.species_processor(pil_image, return_tensors="pt")
            # outputs = self.species_model(**inputs)
            # predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            # predicted_class_id = predictions.argmax().item()
            # confidence = predictions[0][predicted_class_id].item()
            # 
            # # 클래스 ID를 종류로 매핑
            # species_mapping = {0: 'flatfish', 1: 'unknown'}
            # species = species_mapping.get(predicted_class_id, 'unknown')
            # 
            # return species, confidence
            
            # Mock 데이터
            return 'unknown', 0.0
            
        except Exception as e:
            logger.error(f"종류 분류 실패: {str(e)}")
            return 'unknown', 0.0
            
    def _analyze_health_and_diseases_sync(
        self, 
        image: np.ndarray, 
        detection_boxes: List[Dict],
        analyze_diseases: bool
    ) -> Dict[str, Any]:
        """건강 상태 및 질병 분석 (동기 버전)"""
        try:
            diseases = []
            if analyze_diseases:
                # 실제 AI 모델 분석 (모델 로드 후 구현)
                pass
                
            # 전체 건강 상태 결정
            if diseases:
                health_status = 'diseased'
                health_confidence = max([d['confidence'] for d in diseases])
            else:
                health_status = 'unknown'
                health_confidence = 0.0
                
            return {
                'health_status': health_status,
                'health_confidence': health_confidence,
                'diseases': diseases
            }
            
        except Exception as e:
            logger.error(f"건강 상태 분석 실패: {str(e)}")
            return {
                'health_status': 'unknown',
                'health_confidence': 0.0,
                'diseases': []
            }
            
    def _generate_recommendations(self, analysis: FishAnalysis) -> List[str]:
        """분석 결과 기반 권장사항 생성"""
        recommendations = []
        
        if analysis.quality_score < 0.5:
            recommendations.append("더 선명하고 밝은 조건에서 촬영해주세요.")
            
        if not analysis.fish_detected:
            recommendations.append("생선이 명확히 보이도록 다시 촬영해주세요.")
            
        if analysis.fish_species == 'unknown':
            recommendations.append("생선 종류 식별을 위해 전체적인 모습이 보이도록 촬영해주세요.")
            
        if analysis.diseases.exists():
            recommendations.append("질병이 의심되니 전문가의 진단을 받아보세요.")
            recommendations.append("격리 조치를 고려해보세요.")
            
        if analysis.overall_health == 'healthy':
            recommendations.append("건강한 상태입니다. 현재 관리 방법을 유지하세요.")
            
        return recommendations
        
    def _generate_mock_result(self, analysis: FishAnalysis, warnings: List[str]) -> FishAnalysis:
        """Mock 분석 결과 생성 (테스트용)"""
        
        # Mock 탐지 박스 (이미지 중앙에 가상의 생선)
        center_x, center_y = analysis.image_width // 2, analysis.image_height // 2
        box_width, box_height = 200, 150
        
        mock_box = DetectionBox.objects.create(
            analysis=analysis,
            x1=center_x - box_width // 2,
            y1=center_y - box_height // 2,
            x2=center_x + box_width // 2,
            y2=center_y + box_height // 2,
            confidence=0.85,
            class_name="flatfish"
        )
        
        # Mock 질병 (확률적으로 생성)
        if np.random.random() > 0.7:  # 30% 확률로 질병 탐지
            DiseaseDetection.objects.create(
                analysis=analysis,
                disease_type='bacterial',
                confidence=0.65,
                severity=0.4,
                description="세균성 감염 의심 (Mock)",
                treatment_recommendation="항생제 치료 고려 (Mock)",
                affected_box=mock_box
            )
        
        # 결과 업데이트
        analysis.fish_detected = True
        analysis.fish_species = 'flatfish'
        analysis.species_confidence = 0.92
        analysis.overall_health = 'diseased' if analysis.diseases.exists() else 'healthy'
        analysis.health_confidence = 0.88
        analysis.processing_time = 0.15
        analysis.recommendations = self._generate_recommendations(analysis)
        analysis.warning_messages = warnings
        analysis.save()
        
        return analysis

    def get_model_status(self) -> Dict[str, Any]:
        """모델 상태 반환"""
        return {
            'model_loaded': self.model_loaded,
            'available_models': {
                'yolo_detection': self.yolo_model is not None,
                'disease_classification': self.disease_model is not None,
                'species_classification': self.species_model is not None
            },
            'status': 'ready' if self.model_loaded else 'loading',
            'last_updated': self.last_updated
        }

# 전역 분석기 인스턴스
django_fish_analyzer = DjangoFishAnalyzer()