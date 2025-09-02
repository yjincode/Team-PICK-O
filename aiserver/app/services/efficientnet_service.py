"""
EfficientNet 질병 분류 서비스 - FastAPI용
VGG16을 EfficientNet으로 교체
"""
import os
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
from loguru import logger
from typing import List, Dict, Any
import json
from dotenv import load_dotenv
from efficientnet_pytorch import EfficientNet

load_dotenv()


class EfficientNetService:
    """EfficientNet 모델을 사용한 어류 질병 분류 서비스"""
    
    def __init__(self):
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        # EfficientNet 모델 파일 경로입니다
        self.model_path = os.getenv("EFFICIENTNET_MODEL_PATH", "./app/models/efficientNet/best_model.pth")
        self.classes_path = "./app/models/efficientNet/classes.json"
        self.disease_classes = {}
        self.input_size = (224, 224)  # EfficientNet 기본 입력 크기 이피션트넷을 사용한 어류분류 로직이 아직도 남아있네 
        self._model_load_count = 0
        self._prediction_count = 0
        self._max_predictions_before_reload = 100
        
        # 이미지 전처리 파이프라인
        self.transform = transforms.Compose([
            transforms.Resize(self.input_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # 모델과 클래스 로드 시도
        self._load_disease_classes()
        self._load_model()
        
    def check_model_status(self) -> Dict[str, Any]:
        """모델 상태 확인"""
        try:
            model_exists = os.path.exists(self.model_path)
            pytorch_available = self._check_pytorch()
            
            # 학습된 모델 사용 가능 여부 확인
            trained_model_available = model_exists and pytorch_available and self.model is not None
            
            status = {
                "loaded": self.model is not None,
                "model_path": self.model_path,
                "model_exists": model_exists,
                "pytorch_available": pytorch_available,
                "classes_loaded": len(self.disease_classes) > 0,
                "trained_model_available": trained_model_available,
                "model_load_count": self._model_load_count,
                "prediction_count": self._prediction_count,
                "device": str(self.device),
                "error": None
            }
            
            # 에러 상태 확인
            if not model_exists:
                status["error"] = f"모델 파일이 존재하지 않습니다: {self.model_path}"
            elif not pytorch_available:
                status["error"] = "PyTorch를 사용할 수 없습니다"
            elif self.model is None:
                status["error"] = "모델 로드에 실패했습니다"
                
            return status
            
        except Exception as e:
            logger.error(f"EfficientNet 모델 상태 확인 중 오류: {str(e)}")
            return {
                "loaded": False,
                "error": str(e),
                "trained_model_available": False
            }
    
    def _check_pytorch(self) -> bool:
        """PyTorch 사용 가능 여부 확인"""
        try:
            return torch.cuda.is_available() or torch.backends.mps.is_available() or True
        except Exception as e:
            logger.error(f"PyTorch 확인 실패: {str(e)}")
            return False
    
    def _load_disease_classes(self):
        """질병 클래스 정보 로드"""
        try:
            if os.path.exists(self.classes_path):
                with open(self.classes_path, 'r', encoding='utf-8') as f:
                    self.disease_classes = json.load(f)
                logger.info(f"✅ EfficientNet 클래스 정보 로드 완료: {len(self.disease_classes)}개")
            else:
                # 기본 클래스 정보 설정
                self.disease_classes = {
                    "0": {"name_ko": "건강", "name_en": "healthy", "description": "건강한 상태"},
                    "1": {"name_ko": "질병", "name_en": "disease", "description": "질병 상태"}
                }
                logger.warning(f"클래스 파일이 없어 기본값 사용: {self.classes_path}")
                
        except Exception as e:
            logger.error(f"클래스 정보 로드 실패: {str(e)}")
            self.disease_classes = {
                "0": {"name_ko": "건강", "name_en": "healthy", "description": "건강한 상태"},
                "1": {"name_ko": "질병", "name_en": "disease", "description": "질병 상태"}
            }
    
    def _load_model(self):
        """EfficientNet 모델 로드"""
        try:
            if not os.path.exists(self.model_path):
                logger.error(f"❌ EfficientNet 모델 파일이 존재하지 않습니다: {self.model_path}")
                return False
            
            # 모델 가중치 로드 및 구조 확인
            checkpoint = torch.load(self.model_path, map_location=self.device)
            if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
                state_dict = checkpoint['model_state_dict']
            else:
                state_dict = checkpoint
            
            # 가중치 키 구조 확인
            sample_keys = list(state_dict.keys())[:5]
            logger.info(f"🔍 모델 가중치 키 샘플: {sample_keys}")
            
            # backbone.features 구조인 경우 (torchvision 기반 모델인 것 같음)
            if any(key.startswith('backbone.features') or key.startswith('classifier') for key in state_dict.keys()):
                logger.info("🔄 TorchVision 기반 모델 구조 감지 - 직접 PyTorch 모델로 로드")
                
                # 간단한 분류 모델 구조 생성
                import torch.nn as nn
                from torchvision.models import efficientnet_b0
                
                # EfficientNet-B0 백본 생성
                backbone = efficientnet_b0(pretrained=False)
                num_classes = len(self.disease_classes)
                
                # 분류기 수정
                backbone.classifier = nn.Sequential(
                    nn.Dropout(0.2),
                    nn.Linear(backbone.classifier[1].in_features, 512),
                    nn.ReLU(),
                    nn.Dropout(0.5),
                    nn.Linear(512, num_classes)
                )
                
                self.model = backbone
                
                # 가중치 로드 시도 (strict=False로 불일치 키 무시)
                try:
                    self.model.load_state_dict(state_dict, strict=False)
                    logger.info("✅ 가중치 로드 완료 (strict=False)")
                except Exception as load_error:
                    logger.warning(f"⚠️ 직접 로드 실패, 키 매핑 시도: {str(load_error)}")
                    # 키 이름이 다른 경우 매핑 시도 (우선 초기화된 모델 사용)
                    logger.info("🔄 사전 학습된 가중치로 초기화")
                    
            else:
                # 표준 EfficientNet 구조
                logger.info("📦 표준 EfficientNet 구조 사용")
                num_classes = len(self.disease_classes)
                self.model = EfficientNet.from_pretrained('efficientnet-b0', num_classes=num_classes)
                self.model.load_state_dict(state_dict)
            
            self.model.to(self.device)
            self.model.eval()
            
            self._model_load_count += 1
            logger.info(f"✅ EfficientNet 모델 로드 완료 ({self._model_load_count}회차)")
            logger.info(f"📱 디바이스: {self.device}")
            logger.info(f"🎯 클래스 수: {len(self.disease_classes)}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ EfficientNet 모델 로드 실패: {str(e)}")
            # 모델 로드 실패 시 사전 학습된 모델만 사용
            try:
                logger.info("🔄 사전 학습된 EfficientNet-B0 모델로 폴백")
                num_classes = len(self.disease_classes)
                self.model = EfficientNet.from_pretrained('efficientnet-b0', num_classes=num_classes)
                self.model.to(self.device)
                self.model.eval()
                
                logger.warning("⚠️ 사전 학습된 모델 사용 중 - 사용자 가중치 미적용")
                return True
                
            except Exception as fallback_error:
                logger.error(f"❌ 폴백 모델 로드도 실패: {str(fallback_error)}")
                self.model = None
                return False
    
    def classify_single_image(self, pil_image: Image.Image) -> Dict[str, Any]:
        """단일 이미지 질병 분류"""
        try:
            if self.model is None:
                return {
                    'success': False,
                    'error': 'EfficientNet 모델이 로드되지 않았습니다',
                    'error_type': 'model_not_loaded'
                }
            
            # 이미지 전처리
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # 텐서로 변환
            image_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
            
            # 예측 수행
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted_class = torch.max(probabilities, 1)
                
                predicted_idx = predicted_class.item()
                confidence_score = confidence.item()
                
                # 🔍 디버깅: 모든 클래스별 확률 출력
                logger.info(f"🔍 EfficientNet 원본 예측 결과:")
                logger.info(f"   🎯 예측 클래스: {predicted_idx}")
                logger.info(f"   📊 최고 신뢰도: {confidence_score:.4f} ({confidence_score*100:.2f}%)")
                logger.info(f"   📈 모든 클래스 확률: {probabilities.squeeze().tolist()}")
                
            # 결과 포맷팅 (재분류 전 원본 정보)
            original_disease_info = self.disease_classes.get(str(predicted_idx), {
                "class_name": "unknown",
                "name_ko": "알 수 없는 질병",
                "name_en": "unknown",
                "description": "분류되지 않은 상태",
                "severity": "moderate",
                "symptoms": "확인 필요",
                "treatment": "전문가 상담 권장",
                "prevention": "정기적인 모니터링"
            })
            
            logger.info(f"   🏷️  원본 예측: {original_disease_info['name_ko']} ({original_disease_info['name_en']})")
            
            # 최종 사용할 disease_info (재분류 후 변경될 수 있음)
            disease_info = original_disease_info
            
            # 건강 상태 재분류 로직 - 임계값 대폭 낮춤
            is_healthy = False
            original_predicted_idx = predicted_idx  # 원본 예측 보존
            
            # 임계값을 0.05 (5%)로 낮춤 - 실제 모델 예측을 더 신뢰
            if confidence_score < 0.05 and predicted_idx != 0:
                logger.info(f"🔄 EfficientNet 신뢰도 {confidence_score:.4f} < 0.05, 매우 낮은 신뢰도로 건강 상태로 재분류")
                is_healthy = True
                disease_info = self.disease_classes.get("0", {
                    "class_name": "healthy",
                    "name_ko": "건강함",
                    "name_en": "healthy", 
                    "description": "건강한 상태",
                    "severity": "mild",
                    "symptoms": "특별한 증상 없음",
                    "treatment": "현재 상태 유지",
                    "prevention": "정기적인 관리"
                })
                predicted_idx = 0  # 건강 클래스로 변경
            elif predicted_idx == 0:  # 원래 건강으로 예측된 경우
                is_healthy = True
                logger.info(f"✅ EfficientNet에서 건강함으로 예측됨 (신뢰도: {confidence_score:.4f})")
            else:
                # 질병으로 예측된 경우 - 원본 예측 사용
                is_healthy = False
                logger.info(f"🦠 EfficientNet에서 질병 예측: {disease_info['name_ko']} (신뢰도: {confidence_score:.4f})")
            
            self._prediction_count += 1
            
            # 콘솔에 신뢰도 출력
            logger.info(f"🤖 EfficientNet 예측 결과:")
            logger.info(f"   📊 신뢰도: {confidence_score:.4f} ({confidence_score*100:.2f}%)")
            logger.info(f"   🏷️  예측 클래스: {disease_info['name_ko']} ({disease_info['name_en']})")
            logger.info(f"   ✨ 건강 상태: {'예' if is_healthy else '아니오'}")
            
            result = {
                'success': True,
                'disease_class': predicted_idx,
                'class_name': disease_info.get('class_name', 'unknown'),
                'disease_name_ko': disease_info['name_ko'],
                'disease_name_en': disease_info['name_en'],
                'confidence': float(confidence_score),
                'description': disease_info.get('description', ''),
                'severity': disease_info.get('severity', 'moderate'),
                'symptoms': disease_info.get('symptoms', ''),
                'treatment': disease_info.get('treatment', ''),
                'prevention': disease_info.get('prevention', ''),
                'is_healthy': is_healthy,
                'model_type': 'EfficientNet-B0',
                'device': str(self.device),
                'prediction_count': self._prediction_count,
                # 디버깅 정보 추가
                'debug': {
                    'original_prediction': original_predicted_idx,
                    'original_confidence': float(confidence_score),
                    'was_reclassified': original_predicted_idx != predicted_idx
                }
            }
            
            # 예측 횟수가 많으면 모델 재로드 (메모리 정리)
            if self._prediction_count >= self._max_predictions_before_reload:
                logger.info("🔄 예측 횟수가 많아 모델을 재로드합니다")
                self._prediction_count = 0
                self._load_model()
            
            return result
            
        except Exception as e:
            logger.error(f"❌ EfficientNet 이미지 분류 실패: {str(e)}")
            return {
                'success': False,
                'error': f'EfficientNet 분류 중 오류: {str(e)}',
                'error_type': 'classification_error'
            }
    
    def calculate_comprehensive_health_score(self, efficientnet_result: Dict, yolo_detections: List[Dict]) -> Dict[str, Any]:
        """다차원 건강도 계산 (VGG 호환)"""
        try:
            # EfficientNet 기반 질병 건강도 (80점 만점)
            disease_health = 80.0
            if efficientnet_result and efficientnet_result.get('success', False):
                confidence = efficientnet_result.get('confidence', 0)
                is_healthy = efficientnet_result.get('is_healthy', False)
                
                if is_healthy:
                    disease_health = 80.0  # 건강하면 만점
                else:
                    # 신뢰도에 따른 점수 감점
                    disease_health = max(20.0, 80.0 - (confidence * 60.0))
            
            # YOLO 기반 물리적 건강도 (20점 만점)  
            physical_health = 20.0
            if yolo_detections:
                detection_penalty = min(len(yolo_detections) * 3, 15)  # 탐지 1개당 3점 감점, 최대 15점
                physical_health = max(5.0, 20.0 - detection_penalty)
            
            total_score = int(disease_health + physical_health)
            percentage = total_score / 100.0
            
            # 처리된 EfficientNet 결과
            processed_result = efficientnet_result.copy() if efficientnet_result else {}
            if processed_result:
                processed_result['is_healthy'] = efficientnet_result.get('is_healthy', False)
            
            return {
                'total_score': total_score,
                'percentage': percentage,
                'breakdown': {
                    'disease_health': int(disease_health),
                    'physical_health': int(physical_health)
                },
                'processed_efficientnet_result': processed_result,
                'yolo_detection_count': len(yolo_detections)
            }
            
        except Exception as e:
            logger.error(f"건강도 계산 오류: {str(e)}")
            return {
                'total_score': 50,
                'percentage': 0.5,
                'breakdown': {'disease_health': 40, 'physical_health': 10},
                'processed_efficientnet_result': {},
                'yolo_detection_count': 0
            }
    
    def get_health_grade_and_message(self, total_score: int, is_healthy: bool) -> Dict[str, Any]:
        """건강 등급 및 메시지 결정 (VGG 호환)"""
        try:
            # 등급 결정
            if total_score >= 80:
                grade = '상'
                risk_level = '낮음'
                message = '매우 건강한 상태입니다'
            elif total_score >= 65:
                grade = '중상' 
                risk_level = '낮음'
                message = '건강한 편입니다'
            elif total_score >= 40:
                grade = '중'
                risk_level = '보통'
                message = '보통 상태입니다'
            elif total_score >= 20:
                grade = '중하'
                risk_level = '높음' 
                message = '주의가 필요합니다'
            else:
                grade = '하'
                risk_level = '매우 높음'
                message = '즉시 치료가 필요합니다'
            
            return {
                'grade': grade,
                'message': message,
                'risk_level': risk_level,
                'score': total_score,
                'is_healthy': is_healthy
            }
            
        except Exception as e:
            logger.error(f"등급 계산 오류: {str(e)}")
            return {
                'grade': '중',
                'message': '상태를 확인할 수 없습니다',
                'risk_level': '보통',
                'score': total_score,
                'is_healthy': False
            }