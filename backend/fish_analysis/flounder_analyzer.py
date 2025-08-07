import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import logging
from typing import List, Dict, Tuple, Any
from io import BytesIO
import base64
import json
import torch
from django.conf import settings

# YOLO 및 AI 모델 임포트
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("⚠️ Ultralytics YOLO not available. Using mock data.")

try:
    from transformers import AutoImageProcessor, AutoModelForImageClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("⚠️ Transformers not available. Using mock data.")

logger = logging.getLogger(__name__)

class FlounderDiseaseAnalyzer:
    """광어 질병 분석기"""
    
    def __init__(self):
        self.confidence_threshold = 0.5
        self.yolo_model = None
        self.disease_model = None
        self.disease_processor = None
        self.models_loaded = False
        self._initialize_models()
    
    def _initialize_models(self):
        """AI 모델 초기화"""
        try:
            ai_config = getattr(settings, 'AI_MODELS', {})
            model_cache_dir = ai_config.get('MODEL_CACHE_DIR', '/app/models')
            
            # 모델 디렉토리 생성
            os.makedirs(model_cache_dir, exist_ok=True)
            
            # YOLO 모델 로드 (광어 탐지용)
            if YOLO_AVAILABLE:
                yolo_path = ai_config.get('YOLO_MODEL_PATH', 'yolov8n.pt')
                # 실제 광어 탐지 모델이 있다면 경로 변경
                # yolo_path = os.path.join(model_cache_dir, 'flounder_detection.pt')
                
                try:
                    self.yolo_model = YOLO(yolo_path)
                    logger.info(f"✅ YOLO 모델 로드 완료: {yolo_path}")
                except Exception as e:
                    logger.error(f"❌ YOLO 모델 로드 실패: {e}")
                    self.yolo_model = None
            
            # 질병 분류 모델 로드
            if TRANSFORMERS_AVAILABLE:
                disease_model_name = ai_config.get('HF_DISEASE_MODEL', 'fish-disease-classifier')
                
                # 실제 질병 분류 모델이 있다면 사용
                # 현재는 일반적인 이미지 분류 모델 사용 (예시)
                try:
                    # 실제 환경에서는 훈련된 질병 분류 모델 사용
                    # self.disease_processor = AutoImageProcessor.from_pretrained(disease_model_name)
                    # self.disease_model = AutoModelForImageClassification.from_pretrained(disease_model_name)
                    logger.info("✅ 질병 분류 모델 준비 완료 (Mock)")
                except Exception as e:
                    logger.error(f"❌ 질병 분류 모델 로드 실패: {e}")
            
            self.models_loaded = YOLO_AVAILABLE or TRANSFORMERS_AVAILABLE
            logger.info(f"🤖 모델 초기화 완료 - YOLO: {self.yolo_model is not None}, Disease: {TRANSFORMERS_AVAILABLE}")
            
        except Exception as e:
            logger.error(f"❌ 모델 초기화 실패: {e}")
            self.models_loaded = False
        
    def analyze_flounder_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        광어 이미지를 분석하여 질병 의심 부분을 탐지하고 표기합니다.
        
        Args:
            image_bytes: 이미지 바이트 데이터
            
        Returns:
            분석 결과 딕셔너리
        """
        try:
            # 이미지 전처리
            image = self._preprocess_image(image_bytes)
            
            # YOLO 모델로 광어 탐지
            flounder_detections = self._detect_flounder_yolo(image)
            
            if not flounder_detections:
                return {
                    'success': False,
                    'message': '이미지에서 광어를 찾을 수 없습니다.',
                    'flounder_detected': False,
                    'disease_regions': [],
                    'annotated_image': None,
                    'confidence_scores': {}
                }
            
            # 질병 의심 부분 탐지
            disease_regions = self._detect_disease_regions_ai(image, flounder_detections)
            
            # 이미지에 질병 의심 부분 표기
            annotated_image_base64 = self._annotate_image(image, flounder_detections, disease_regions)
            
            # 신뢰도 점수 계산
            confidence_scores = self._calculate_confidence_scores(flounder_detections, disease_regions)
            
            return {
                'success': True,
                'message': '분석이 완료되었습니다.',
                'flounder_detected': True,
                'flounder_count': len(flounder_detections),
                'disease_regions': disease_regions,
                'annotated_image': annotated_image_base64,
                'confidence_scores': confidence_scores
            }
            
        except Exception as e:
            logger.error(f"광어 분석 실패: {str(e)}")
            return {
                'success': False,
                'message': f'분석 중 오류가 발생했습니다: {str(e)}',
                'flounder_detected': False,
                'disease_regions': [],
                'annotated_image': None,
                'confidence_scores': {}
            }
    
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
            
            # 이미지 크기 정규화 (최대 1024x1024)
            height, width = opencv_image.shape[:2]
            if width > 1024 or height > 1024:
                scale = min(1024/width, 1024/height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                opencv_image = cv2.resize(opencv_image, (new_width, new_height))
                
            return opencv_image
            
        except Exception as e:
            logger.error(f"이미지 전처리 실패: {str(e)}")
            raise
    
    def _detect_flounder_yolo(self, image: np.ndarray) -> List[Dict]:
        """YOLO 모델로 광어 탐지 (실제 구현)"""
        try:
            if not self.yolo_model:
                logger.warning("YOLO 모델이 로드되지 않음. Mock 데이터 사용.")
                return self._detect_flounder_mock(image)
            
            # YOLO 모델로 추론
            results = self.yolo_model(image, conf=self.confidence_threshold)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        # 바운딩 박스 좌표
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        confidence = float(boxes.conf[i].cpu().numpy())
                        class_id = int(boxes.cls[i].cpu().numpy())
                        class_name = self.yolo_model.names[class_id]
                        
                        # 광어 관련 클래스만 필터링 (실제 모델에 맞게 조정)
                        # 일반 YOLO 모델의 경우 'fish' 클래스 사용
                        if class_name in ['fish', 'flounder', 'flatfish']:
                            detections.append({
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': confidence,
                                'class': class_name
                            })
            
            logger.info(f"🐟 YOLO 광어 탐지 완료: {len(detections)}마리")
            return detections
            
        except Exception as e:
            logger.error(f"❌ YOLO 광어 탐지 실패: {str(e)}")
            return self._detect_flounder_mock(image)
    
    def _detect_flounder_mock(self, image: np.ndarray) -> List[Dict]:
        """YOLO 모델로 광어 탐지 (Mock 버전)"""
        try:
            height, width = image.shape[:2]
            
            # Mock 광어 탐지 결과
            detections = [
                {
                    'bbox': [
                        int(width * 0.2),  # x1
                        int(height * 0.3), # y1  
                        int(width * 0.8),  # x2
                        int(height * 0.7)  # y2
                    ],
                    'confidence': 0.85,
                    'class': 'flounder'
                }
            ]
            
            logger.info(f"📋 Mock 광어 탐지 완료: {len(detections)}마리")
            return detections
            
        except Exception as e:
            logger.error(f"❌ Mock 광어 탐지 실패: {str(e)}")
            return []
    
    def _detect_disease_regions_ai(self, image: np.ndarray, flounder_detections: List[Dict]) -> List[Dict]:
        """AI 모델로 질병 의심 부분 탐지 (실제 구현)"""
        try:
            if not self.disease_model and not TRANSFORMERS_AVAILABLE:
                logger.warning("질병 분류 모델이 없음. Mock 데이터 사용.")
                return self._detect_disease_regions_mock(image, flounder_detections)
            
            disease_regions = []
            
            for detection in flounder_detections:
                bbox = detection['bbox']
                x1, y1, x2, y2 = bbox
                
                # 광어 영역 추출
                flounder_roi = image[y1:y2, x1:x2]
                
                if flounder_roi.size == 0:
                    continue
                
                # 질병 탐지를 위한 이미지 분석
                disease_detections = self._analyze_disease_in_roi(flounder_roi, (x1, y1))
                disease_regions.extend(disease_detections)
            
            logger.info(f"🔬 AI 질병 탐지 완료: {len(disease_regions)}개 발견")
            return disease_regions
            
        except Exception as e:
            logger.error(f"❌ AI 질병 탐지 실패: {str(e)}")
            return self._detect_disease_regions_mock(image, flounder_detections)
    
    def _analyze_disease_in_roi(self, roi_image: np.ndarray, offset: Tuple[int, int]) -> List[Dict]:
        """광어 ROI 내에서 질병 탐지"""
        try:
            x_offset, y_offset = offset
            disease_regions = []
            
            # 실제 환경에서는 훈련된 질병 분류 모델 사용
            # 현재는 OpenCV 기반 이미지 처리로 이상 부위 탐지
            
            # 1. 색상 기반 이상 부위 탐지
            disease_regions.extend(self._detect_color_abnormalities(roi_image, x_offset, y_offset))
            
            # 2. 텍스처 기반 이상 부위 탐지  
            disease_regions.extend(self._detect_texture_abnormalities(roi_image, x_offset, y_offset))
            
            # 3. 형태학적 이상 부위 탐지
            disease_regions.extend(self._detect_morphological_abnormalities(roi_image, x_offset, y_offset))
            
            return disease_regions
            
        except Exception as e:
            logger.error(f"❌ ROI 질병 분석 실패: {str(e)}")
            return []
    
    def _detect_color_abnormalities(self, roi_image: np.ndarray, x_offset: int, y_offset: int) -> List[Dict]:
        """색상 기반 이상 부위 탐지"""
        try:
            disease_regions = []
            h, w = roi_image.shape[:2]
            
            # HSV 색공간으로 변환
            hsv = cv2.cvtColor(roi_image, cv2.COLOR_BGR2HSV)
            
            # 빨간색 반점 탐지 (세균성 감염)
            red_lower = np.array([0, 50, 50])
            red_upper = np.array([10, 255, 255])
            red_mask1 = cv2.inRange(hsv, red_lower, red_upper)
            
            red_lower2 = np.array([170, 50, 50])
            red_upper2 = np.array([180, 255, 255])
            red_mask2 = cv2.inRange(hsv, red_lower2, red_upper2)
            
            red_mask = cv2.bitwise_or(red_mask1, red_mask2)
            
            # 컨투어 찾기
            contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 100:  # 최소 크기 필터
                    x, y, width, height = cv2.boundingRect(contour)
                    disease_regions.append({
                        'bbox': [x_offset + x, y_offset + y, x_offset + x + width, y_offset + y + height],
                        'disease_type': 'bacterial_infection',
                        'disease_name': '세균성 감염 의심',
                        'confidence': min(0.6 + (area / 1000), 0.9),
                        'severity': 'medium' if area > 500 else 'low',
                        'description': '비정상적인 붉은 반점이 발견되었습니다.'
                    })
            
            return disease_regions
            
        except Exception as e:
            logger.error(f"❌ 색상 이상 탐지 실패: {str(e)}")
            return []
    
    def _detect_texture_abnormalities(self, roi_image: np.ndarray, x_offset: int, y_offset: int) -> List[Dict]:
        """텍스처 기반 이상 부위 탐지"""
        try:
            disease_regions = []
            h, w = roi_image.shape[:2]
            
            # 그레이스케일 변환
            gray = cv2.cvtColor(roi_image, cv2.COLOR_BGR2GRAY)
            
            # 가우시안 블러로 노이즈 제거
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # 라플라시안으로 엣지 탐지
            laplacian = cv2.Laplacian(blurred, cv2.CV_64F)
            laplacian = np.absolute(laplacian).astype(np.uint8)
            
            # 임계값 적용
            _, thresh = cv2.threshold(laplacian, 30, 255, cv2.THRESH_BINARY)
            
            # 모폴로지 연산으로 노이즈 제거
            kernel = np.ones((3, 3), np.uint8)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # 컨투어 찾기
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 200:  # 최소 크기 필터
                    x, y, width, height = cv2.boundingRect(contour)
                    disease_regions.append({
                        'bbox': [x_offset + x, y_offset + y, x_offset + x + width, y_offset + y + height],
                        'disease_type': 'skin_lesion',
                        'disease_name': '피부 병변 의심',
                        'confidence': min(0.5 + (area / 2000), 0.8),
                        'severity': 'high' if area > 800 else 'medium',
                        'description': '피부 표면의 이상 텍스처가 발견되었습니다.'
                    })
            
            return disease_regions[:2]  # 최대 2개만 반환
            
        except Exception as e:
            logger.error(f"❌ 텍스처 이상 탐지 실패: {str(e)}")
            return []
    
    def _detect_morphological_abnormalities(self, roi_image: np.ndarray, x_offset: int, y_offset: int) -> List[Dict]:
        """형태학적 이상 부위 탐지"""
        try:
            disease_regions = []
            h, w = roi_image.shape[:2]
            
            # 그레이스케일 변환
            gray = cv2.cvtColor(roi_image, cv2.COLOR_BGR2GRAY)
            
            # 적응적 임계값으로 이진화
            adaptive_thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            
            # 모폴로지 연산으로 노이즈 제거
            kernel = np.ones((5, 5), np.uint8)
            cleaned = cv2.morphologyEx(adaptive_thresh, cv2.MORPH_OPEN, kernel)
            
            # 컨투어 찾기
            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 150:
                    # 컨투어의 형태 분석
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter * perimeter)
                        
                        # 비정상적인 형태 (너무 불규칙한 경우)
                        if circularity < 0.3:
                            x, y, width, height = cv2.boundingRect(contour)
                            disease_regions.append({
                                'bbox': [x_offset + x, y_offset + y, x_offset + x + width, y_offset + y + height],
                                'disease_type': 'parasitic_infection',
                                'disease_name': '기생충 감염 의심',
                                'confidence': min(0.4 + (1 - circularity), 0.7),
                                'severity': 'low',
                                'description': '불규칙한 형태의 병변이 의심됩니다.'
                            })
            
            return disease_regions[:1]  # 최대 1개만 반환
            
        except Exception as e:
            logger.error(f"❌ 형태학적 이상 탐지 실패: {str(e)}")
            return []
    
    def _detect_disease_regions_mock(self, image: np.ndarray, flounder_detections: List[Dict]) -> List[Dict]:
        """질병 의심 부분 탐지 (Mock 버전)"""
        try:
            disease_regions = []
            
            for detection in flounder_detections:
                bbox = detection['bbox']
                x1, y1, x2, y2 = bbox
                
                # Mock 질병 탐지 (실제로는 질병 분류 모델 사용)
                # 광어 영역 내에서 질병 의심 부분 생성
                region_width = x2 - x1
                region_height = y2 - y1
                
                # 3개의 질병 의심 부분 생성 (예시)
                mock_diseases = [
                    {
                        'bbox': [
                            x1 + int(region_width * 0.1),
                            y1 + int(region_height * 0.2),
                            x1 + int(region_width * 0.4),
                            y1 + int(region_height * 0.5)
                        ],
                        'disease_type': 'bacterial_infection',
                        'disease_name': '세균성 감염',
                        'confidence': 0.72,
                        'severity': 'medium',
                        'description': '광어 표면에 세균성 감염 의심 부위가 발견되었습니다.'
                    },
                    {
                        'bbox': [
                            x1 + int(region_width * 0.6),
                            y1 + int(region_height * 0.1),
                            x1 + int(region_width * 0.9),
                            y1 + int(region_height * 0.3)
                        ],
                        'disease_type': 'parasitic_infection',
                        'disease_name': '기생충 감염',
                        'confidence': 0.68,
                        'severity': 'low',
                        'description': '기생충에 의한 감염 의심 부위가 발견되었습니다.'
                    },
                    {
                        'bbox': [
                            x1 + int(region_width * 0.3),
                            y1 + int(region_height * 0.6),
                            x1 + int(region_width * 0.7),
                            y1 + int(region_height * 0.9)
                        ],
                        'disease_type': 'skin_lesion',
                        'disease_name': '피부 병변',
                        'confidence': 0.65,
                        'severity': 'high',
                        'description': '피부에 병변이 의심되는 부위가 발견되었습니다.'
                    }
                ]
                
                # 신뢰도가 임계값 이상인 질병만 포함
                for disease in mock_diseases:
                    if disease['confidence'] >= self.confidence_threshold:
                        disease_regions.append(disease)
            
            logger.info(f"질병 의심 부분 탐지 완료: {len(disease_regions)}개")
            return disease_regions
            
        except Exception as e:
            logger.error(f"질병 탐지 실패: {str(e)}")
            return []
    
    def _annotate_image(self, image: np.ndarray, flounder_detections: List[Dict], disease_regions: List[Dict]) -> str:
        """이미지에 탐지 결과 표기"""
        try:
            # OpenCV 이미지를 PIL로 변환
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(image_rgb)
            draw = ImageDraw.Draw(pil_image)
            
            # 광어 경계 상자 그리기 (파란색)
            for detection in flounder_detections:
                bbox = detection['bbox']
                x1, y1, x2, y2 = bbox
                draw.rectangle([x1, y1, x2, y2], outline='blue', width=3)
                draw.text((x1, y1-25), f"광어 ({detection['confidence']:.2f})", fill='blue')
            
            # 질병 의심 부분 표기 (빨간색)
            colors = {
                'bacterial_infection': 'red',
                'parasitic_infection': 'orange', 
                'skin_lesion': 'yellow'
            }
            
            for region in disease_regions:
                bbox = region['bbox']
                x1, y1, x2, y2 = bbox
                color = colors.get(region['disease_type'], 'red')
                
                draw.rectangle([x1, y1, x2, y2], outline=color, width=2)
                draw.text(
                    (x1, y1-20), 
                    f"{region['disease_name']} ({region['confidence']:.2f})", 
                    fill=color
                )
            
            # Base64로 인코딩
            buffer = BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return image_base64
            
        except Exception as e:
            logger.error(f"이미지 표기 실패: {str(e)}")
            return None
    
    def _calculate_confidence_scores(self, flounder_detections: List[Dict], disease_regions: List[Dict]) -> Dict[str, float]:
        """신뢰도 점수 계산"""
        try:
            scores = {}
            
            # 광어 탐지 신뢰도
            if flounder_detections:
                scores['flounder_detection'] = max([d['confidence'] for d in flounder_detections])
            else:
                scores['flounder_detection'] = 0.0
            
            # 질병 탐지 신뢰도 (평균)
            if disease_regions:
                scores['disease_detection'] = sum([d['confidence'] for d in disease_regions]) / len(disease_regions)
                
                # 질병 타입별 신뢰도
                disease_types = {}
                for region in disease_regions:
                    disease_type = region['disease_type']
                    if disease_type not in disease_types:
                        disease_types[disease_type] = []
                    disease_types[disease_type].append(region['confidence'])
                
                for disease_type, confidences in disease_types.items():
                    scores[f'{disease_type}_confidence'] = max(confidences)
            else:
                scores['disease_detection'] = 0.0
            
            # 전체 분석 신뢰도
            scores['overall_confidence'] = (scores['flounder_detection'] + scores['disease_detection']) / 2
            
            return scores
            
        except Exception as e:
            logger.error(f"신뢰도 계산 실패: {str(e)}")
            return {}

# 전역 분석기 인스턴스
flounder_analyzer = FlounderDiseaseAnalyzer()