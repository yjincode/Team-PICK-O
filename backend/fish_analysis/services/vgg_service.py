"""
VGG16 질병 분류 서비스
"""
import os
import numpy as np
from PIL import Image
import logging
from django.conf import settings
from typing import List, Dict, Any, Tuple
import json

logger = logging.getLogger(__name__)


class VGG16Service:
    """VGG16 모델을 사용한 어류 질병 분류 서비스"""
    
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(settings.BASE_DIR, 'models', 'vgg16', 'best_model.h5')
        self.classes_path = os.path.join(settings.BASE_DIR, 'models', 'vgg16', 'classes.json')
        self.disease_classes = {}
        self.input_size = (112, 112)  # 학습된 모델의 실제 입력 크기
        
    def load_model(self):
        """VGG16 모델 및 클래스 정보 로드"""
        try:
            if self.model is None:
                # TensorFlow/Keras 임포트
                try:
                    import tensorflow as tf
                    from tensorflow.keras.models import load_model
                except ImportError:
                    logger.error("tensorflow 패키지가 설치되지 않았습니다. pip install tensorflow 실행 필요")
                    return False
                
                # 모델 파일 확인 및 로드
                if not os.path.exists(self.model_path):
                    logger.error(f"VGG16 모델 파일이 없습니다: {self.model_path}")
                    logger.error("학습된 VGG16 모델을 models/vgg16/best_model.h5 경로에 저장해주세요.")
                    return False
                else:
                    logger.info(f"VGG16 모델 로드 중: {self.model_path}")
                    self.model = load_model(self.model_path)
                
                # 질병 클래스 정보 로드
                self._load_disease_classes()
                
                logger.info("VGG16 모델 로드 완료")
                return True
                
        except Exception as e:
            logger.error(f"VGG16 모델 로드 실패: {str(e)}")
            return False
    
    
    def _load_disease_classes(self):
        """질병 클래스 정보 로드"""
        try:
            if os.path.exists(self.classes_path):
                with open(self.classes_path, 'r', encoding='utf-8') as f:
                    self.disease_classes = json.load(f)
                logger.info(f"질병 클래스 정보 로드: {len(self.disease_classes)}개 클래스")
            else:
                # 기본 질병 클래스 정보 생성
                self.disease_classes = self._get_default_disease_classes()
                logger.info("기본 질병 클래스 정보 사용")
                
        except Exception as e:
            logger.error(f"질병 클래스 정보 로드 실패: {str(e)}")
            self.disease_classes = self._get_default_disease_classes()
    
    def _get_default_disease_classes(self):
        """기본 질병 클래스 정보 반환"""
        return {
            "0": {
                "class_name": "healthy",
                "disease_name_ko": "건강함",
                "disease_name_en": "Healthy",
                "description": "질병이 발견되지 않은 건강한 상태",
                "severity": "mild",
                "symptoms": "특별한 증상 없음",
                "treatment": "현재 상태 유지",
                "prevention": "정기적인 수질 관리 및 영양 공급"
            },
            "1": {
                "class_name": "fin_rot",
                "disease_name_ko": "지느러미 부패병",
                "disease_name_en": "Fin Rot",
                "description": "지느러미가 썩어가는 세균성 질병",
                "severity": "moderate",
                "symptoms": "지느러미 끝이 하얗게 변하며 서서히 썩어감",
                "treatment": "항생제 투여, 수질 개선",
                "prevention": "깨끗한 수질 유지, 스트레스 최소화"
            },
            "2": {
                "class_name": "white_spot",
                "disease_name_ko": "백점병",
                "disease_name_en": "White Spot Disease",
                "description": "기생충에 의한 피부 질병",
                "severity": "severe",
                "symptoms": "몸 전체에 하얀 점들이 나타남",
                "treatment": "온도 상승, 소금욕, 구충제 사용",
                "prevention": "적정 수온 유지, 새 물고기 격리"
            },
            "3": {
                "class_name": "gill_disease",
                "disease_name_ko": "아가미병",
                "disease_name_en": "Gill Disease",
                "description": "아가미 조직의 염증 또는 감염",
                "severity": "critical",
                "symptoms": "호흡 곤란, 아가미 부종, 색깔 변화",
                "treatment": "즉시 격리, 항생제 치료",
                "prevention": "수질 관리, 과밀사육 방지"
            },
            "4": {
                "class_name": "skin_lesion",
                "disease_name_ko": "피부 상처",
                "disease_name_en": "Skin Lesion",
                "description": "외상 또는 감염에 의한 피부 손상",
                "severity": "moderate",
                "symptoms": "피부에 상처, 궤양, 발적",
                "treatment": "상처 소독, 항생제 연고 도포",
                "prevention": "날카로운 장식물 제거, 적절한 밀도 유지"
            },
            "5": {
                "class_name": "scale_loss",
                "disease_name_ko": "비늘 탈락",
                "disease_name_en": "Scale Loss",
                "description": "스트레스나 질병으로 인한 비늘 손실",
                "severity": "moderate",
                "symptoms": "비늘이 떨어지고 피부가 노출됨",
                "treatment": "스트레스 원인 제거, 영양 공급",
                "prevention": "안정된 환경 제공, 균형 잡힌 사료"
            },
            "6": {
                "class_name": "eye_infection",
                "disease_name_ko": "눈병",
                "disease_name_en": "Eye Infection",
                "description": "세균이나 바이러스에 의한 눈 감염",
                "severity": "severe",
                "symptoms": "눈이 부어오르고 흐려짐",
                "treatment": "항생제 점안액, 격리 치료",
                "prevention": "수질 관리, 영양 상태 개선"
            },
            "7": {
                "class_name": "ulcer",
                "disease_name_ko": "궤양",
                "disease_name_en": "Ulcer",
                "description": "피부나 근육 조직의 깊은 상처",
                "severity": "critical",
                "symptoms": "깊은 구멍 형태의 상처, 출혈",
                "treatment": "즉시 격리, 강력한 항생제 치료",
                "prevention": "스트레스 관리, 수질 최적화"
            }
        }
    
    def classify_disease(self, cropped_images: List[Dict]) -> List[Dict]:
        """
        크롭된 이미지들에서 질병 분류
        
        Args:
            cropped_images: YOLO에서 크롭된 이미지 정보 리스트
            
        Returns:
            질병 분류 결과 리스트
        """
        try:
            # 모델 로드
            if not self.load_model():
                return []
            
            classification_results = []
            
            for crop_info in cropped_images:
                try:
                    # PIL Image 가져오기
                    pil_image = crop_info['cropped_image']
                    
                    # 전처리
                    processed_image = self._preprocess_image(pil_image)
                    
                    # 예측 수행
                    predictions = self.model.predict(processed_image, verbose=0)
                    predicted_class = np.argmax(predictions[0])
                    confidence = float(predictions[0][predicted_class])
                    
                    # 질병 정보 가져오기
                    disease_info = self.disease_classes.get(
                        str(predicted_class), 
                        self.disease_classes["0"]  # 기본값
                    )
                    
                    # 결과 구성
                    result = {
                        'index': crop_info['index'],
                        'yolo_detection': crop_info['original_detection'],
                        'vgg_prediction': {
                            'class_id': predicted_class,
                            'confidence': confidence,
                            'disease_class': disease_info['class_name'],
                            'disease_name_ko': disease_info['disease_name_ko'],
                            'disease_name_en': disease_info['disease_name_en'],
                            'description': disease_info['description'],
                            'severity': disease_info['severity'],
                            'symptoms': disease_info['symptoms'],
                            'treatment': disease_info['treatment'],
                            'prevention': disease_info['prevention']
                        },
                        'crop_info': {
                            'coords': crop_info['crop_coords'],
                            'size': crop_info['crop_size']
                        }
                    }
                    
                    classification_results.append(result)
                    
                    logger.info(f"질병 분류 완료 (인덱스 {crop_info['index']}): "
                              f"{disease_info['disease_name_ko']} (신뢰도: {confidence:.3f})")
                    
                except Exception as e:
                    logger.error(f"개별 이미지 분류 중 오류 (인덱스 {crop_info['index']}): {str(e)}")
                    continue
            
            logger.info(f"VGG16 질병 분류 완료: {len(classification_results)}개 결과")
            return classification_results
            
        except Exception as e:
            logger.error(f"VGG16 질병 분류 중 오류: {str(e)}")
            return []
    
    def _preprocess_image(self, pil_image: Image.Image) -> np.ndarray:
        """이미지 전처리 (학습된 VGG16 모델 입력 형태로 변환)"""
        try:
            # PIL Image를 numpy 배열로 변환
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # 112x112로 리사이즈 (학습된 모델의 입력 크기에 맞춤)
            pil_image = pil_image.resize(self.input_size)
            
            # numpy 배열로 변환
            img_array = np.array(pil_image)
            
            # 배치 차원 추가
            img_array = np.expand_dims(img_array, axis=0)
            
            # 단순 0-1 정규화 (학습된 모델이 이 방식으로 학습됨)
            processed_image = img_array.astype(np.float32) / 255.0
            
            return processed_image
            
        except Exception as e:
            logger.error(f"이미지 전처리 중 오류: {str(e)}")
            raise
    
    def calculate_overall_health_status(self, classification_results: List[Dict]) -> str:
        """
        전체 건강 상태 계산 (상/중/하)
        
        Args:
            classification_results: VGG16 분류 결과 리스트
            
        Returns:
            전체 건강 상태 ('good', 'fair', 'poor')
        """
        try:
            if not classification_results:
                return 'good'  # 탐지된 문제가 없으면 양호
            
            # 심각도별 점수 매핑
            severity_scores = {
                'mild': 1,
                'moderate': 2,
                'severe': 3,
                'critical': 4
            }
            
            # 총점 계산
            total_score = 0
            max_severity = 0
            
            for result in classification_results:
                severity = result['vgg_prediction']['severity']
                confidence = result['vgg_prediction']['confidence']
                
                # 신뢰도를 고려한 가중 점수
                weighted_score = severity_scores.get(severity, 1) * confidence
                total_score += weighted_score
                max_severity = max(max_severity, severity_scores.get(severity, 1))
            
            # 평균 점수 계산
            avg_score = total_score / len(classification_results)
            
            # 건강 상태 결정
            if max_severity >= 4 or avg_score >= 3.0:  # critical이 하나라도 있거나 평균이 높음
                return 'poor'  # 하
            elif max_severity >= 3 or avg_score >= 2.0:  # severe가 있거나 평균이 중간
                return 'fair'  # 중
            else:
                return 'good'  # 상
            
        except Exception as e:
            logger.error(f"건강 상태 계산 중 오류: {str(e)}")
            return 'fair'  # 오류 시 중간 상태 반환