"""
YOLO11 증상 탐지 서비스 - FastAPI용
"""
import os
import cv2
import numpy as np
from PIL import Image
from loguru import logger
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class YOLO11Service:
    """YOLO11 모델을 사용한 어류 증상 탐지 서비스"""
    
    def __init__(self):
        self.model = None
        # 현재 디렉토리 기준으로 상대 경로 설정
        self.model_path = os.getenv("YOLO_MODEL_PATH", 
                                  "/app/models/yolo/best.pt" if os.path.exists("/app/models/yolo/best.pt") 
                                  else "./app/models/yolo11/best.pt")
        self.confidence_threshold = 0.25  # 더 낮은 threshold로 더 많은 탐지 허용
        self.iou_threshold = 0.45
        
    def check_model_status(self) -> Dict[str, Any]:
        """모델 상태 확인"""
        try:
            model_exists = os.path.exists(self.model_path)
            compatibility_ok, compatibility_msg = self._check_yolo11_compatibility()
            
            return {
                "loaded": self.model is not None,
                "model_path": self.model_path,
                "model_exists": model_exists,
                "version": self._get_ultralytics_version(),
                "compatible": compatibility_ok,
                "compatibility_message": compatibility_msg,
                "error": None if compatibility_ok and model_exists else compatibility_msg
            }
        except Exception as e:
            return {
                "loaded": False,
                "model_path": self.model_path,
                "model_exists": False,
                "version": "unknown",
                "compatible": False,
                "error": str(e)
            }
        
    def load_model(self) -> bool:
        """YOLO11 모델 로드 (호환성 검사 포함)"""
        try:
            # 모델이 이미 로드되어 있으면 True 반환
            if self.model is not None:
                logger.debug("YOLO11 모델이 이미 로드되어 있습니다.")
                return True
                
            # 1. YOLO11 호환성 검사
            compatibility_ok, compatibility_msg = self._check_yolo11_compatibility()
            if not compatibility_ok:
                logger.error(f"YOLO11 호환성 문제: {compatibility_msg}")
                return False
            
            logger.info(f"YOLO11 호환성 확인 완료: {compatibility_msg}")
            
            # 2. 모델 파일 확인
            if not os.path.exists(self.model_path):
                logger.warning(f"YOLO11 모델 파일이 없습니다: {self.model_path}")
                return False
            
            # 3. 모델 파일 정보 확인
            file_size = os.path.getsize(self.model_path) / (1024 * 1024)  # MB
            logger.info(f"모델 파일 크기: {file_size:.1f} MB")
            
            # 4. 실제 YOLO 모델 로드
            try:
                from ultralytics import YOLO
                logger.info(f"YOLO11 모델 로드 시도: {self.model_path}")
                self.model = YOLO(self.model_path)
                logger.info("YOLO11 모델 로드 성공")
                return True
                
            except Exception as model_load_error:
                logger.error(f"모델 로드 중 오류: {str(model_load_error)}")
                self.model = None  # 실패 시 None으로 리셋
                return False
                
        except Exception as e:
            logger.error(f"YOLO11 서비스 초기화 중 오류: {str(e)}")
            self.model = None  # 실패 시 None으로 리셋
            return False
    
    def _check_yolo11_compatibility(self) -> tuple[bool, str]:
        """YOLO11 호환성 검사"""
        try:
            # ultralytics 버전 확인
            import ultralytics
            version = ultralytics.__version__
            logger.info(f"현재 ultralytics 버전: {version}")
            
            # 최소 버전 요구사항 확인
            try:
                from packaging import version as pkg_version
                min_version = "8.3.11"
                
                if pkg_version.parse(version) < pkg_version.parse(min_version):
                    return False, f"버전 {version}은 YOLO11을 지원하지 않음 (최소 {min_version} 필요)"
            except ImportError:
                # packaging이 없는 경우 버전 문자열로 간단 비교
                if version.startswith("8.0") or version.startswith("8.1") or version.startswith("8.2"):
                    return False, f"버전 {version}은 YOLO11을 지원하지 않음 (최소 8.3.11 필요)"
            
            # C3k2 모듈 존재 여부 확인
            try:
                from ultralytics.nn.modules.block import C3k2
                return True, f"버전 {version} - C3k2 모듈 사용 가능"
            except ImportError:
                return False, f"버전 {version}에서 C3k2 모듈을 찾을 수 없음"
                
        except Exception as e:
            return False, f"호환성 검사 중 오류: {str(e)}"
    
    def _get_ultralytics_version(self) -> str:
        """ultralytics 버전 확인"""
        try:
            import ultralytics
            return ultralytics.__version__
        except:
            return "unknown"
    
    def detect_symptoms(self, image_path: str) -> Dict[str, Any]:
        """
        이미지에서 증상 탐지
        
        Args:
            image_path: 분석할 이미지 경로
            
        Returns:
            탐지 결과 딕셔너리
        """
        try:
            # 모델 로드 확인
            if not self.load_model():
                return {
                    'success': False,
                    'error': 'YOLO11 모델 로드 실패 - 시스템 설정을 확인하세요.',
                    'detections': []
                }
            
            logger.info(f"YOLO11 증상 탐지 시작: {image_path}")
            
            # 이미지 파일 검증
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'error': f'이미지 파일을 찾을 수 없습니다: {image_path}',
                    'detections': []
                }
            
            # YOLO 추론 실행
            logger.info(f"YOLO 추론 설정 - confidence: {self.confidence_threshold}, iou: {self.iou_threshold}")
            results = self.model(
                image_path,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                verbose=True  # 더 자세한 로그를 위해 True로 변경
            )
            
            logger.info(f"YOLO 추론 결과 수: {len(results)}")
            
            # 결과 파싱
            detections = []
            original_image = cv2.imread(image_path)
            img_height, img_width = original_image.shape[:2]
            logger.info(f"원본 이미지 크기: {img_width}x{img_height}")
            
            for i, result in enumerate(results):
                logger.info(f"결과 {i}: {result}")
                boxes = result.boxes
                logger.info(f"박스 수: {len(boxes) if boxes is not None else 0}")
                
                if boxes is not None:
                    for j, box in enumerate(boxes):
                        # 바운딩박스 좌표 (픽셀 단위)
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        logger.info(f"탐지 {j}: 클래스={class_id}, 신뢰도={confidence:.3f}, 박스=({x1:.1f},{y1:.1f},{x2:.1f},{y2:.1f})")
                        
                        # 정규화된 좌표로 변환 (0~1 범위)
                        bbox_x = float(x1 / img_width)
                        bbox_y = float(y1 / img_height)
                        bbox_width = float((x2 - x1) / img_width)
                        bbox_height = float((y2 - y1) / img_height)
                        
                        # 클래스명 가져오기
                        class_name = self.model.names.get(class_id, f'class_{class_id}')
                        
                        detection = {
                            'bbox_x': bbox_x,
                            'bbox_y': bbox_y,
                            'bbox_width': bbox_width,
                            'bbox_height': bbox_height,
                            'confidence': confidence,
                            'class_id': class_id,
                            'class_name': class_name,
                            'absolute_coords': {
                                'x1': int(x1),
                                'y1': int(y1),
                                'x2': int(x2),
                                'y2': int(y2)
                            }
                        }
                        detections.append(detection)
            
            logger.info(f"YOLO11 탐지 완료: {len(detections)}개 증상 발견")
            
            return {
                'success': True,
                'detections': detections,
                'image_size': {
                    'width': img_width,
                    'height': img_height
                },
                'model_info': {
                    'confidence_threshold': self.confidence_threshold,
                    'iou_threshold': self.iou_threshold,
                    'model_path': self.model_path
                }
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"YOLO11 증상 탐지 중 오류: {error_msg}")
            
            # C3k2 관련 오류인 경우 명확한 오류 메시지
            if "C3k2" in error_msg or "Can't get attribute" in error_msg:
                return {
                    'success': False,
                    'error': 'YOLO11 C3k2 호환성 문제 - ultralytics 패키지를 8.3.11 이상으로 업그레이드하세요.',
                    'error_type': 'compatibility_error',
                    'detections': []
                }
            
            return {
                'success': False,
                'error': f'증상 탐지 중 오류가 발생했습니다: {error_msg}',
                'detections': []
            }
    
    def crop_detected_regions(self, image_path: str, detections: List[Dict]) -> List[Dict]:
        """
        탐지된 영역을 크롭하여 VGG16 입력용 이미지로 준비
        
        Args:
            image_path: 원본 이미지 경로
            detections: YOLO 탐지 결과 리스트
            
        Returns:
            크롭된 이미지 정보 리스트
        """
        try:
            original_image = cv2.imread(image_path)
            img_height, img_width = original_image.shape[:2]
            
            cropped_images = []
            
            for i, detection in enumerate(detections):
                # 절대 좌표 계산
                x1 = int(detection['bbox_x'] * img_width)
                y1 = int(detection['bbox_y'] * img_height)
                x2 = int((detection['bbox_x'] + detection['bbox_width']) * img_width)
                y2 = int((detection['bbox_y'] + detection['bbox_height']) * img_height)
                
                # 경계 확인 및 조정
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(img_width, x2)
                y2 = min(img_height, y2)
                
                # 최소 크기 확인 (너무 작은 영역은 제외)
                if (x2 - x1) < 20 or (y2 - y1) < 20:
                    logger.warning(f"탐지 영역이 너무 작음 (인덱스 {i}): {x2-x1}x{y2-y1}")
                    continue
                
                # 영역 크롭
                cropped_region = original_image[y1:y2, x1:x2]
                
                # VGG16 입력 크기로 리사이즈 (224x224)
                resized_region = cv2.resize(cropped_region, (224, 224))
                
                # PIL Image로 변환 (VGG16 전처리용)
                rgb_image = cv2.cvtColor(resized_region, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_image)
                
                cropped_info = {
                    'index': i,
                    'original_detection': detection,
                    'cropped_image': pil_image,  # PIL Image 객체
                    'cropped_array': resized_region,  # NumPy 배열
                    'crop_coords': {
                        'x1': x1, 'y1': y1,
                        'x2': x2, 'y2': y2
                    },
                    'crop_size': {
                        'width': x2 - x1,
                        'height': y2 - y1
                    }
                }
                cropped_images.append(cropped_info)
            
            logger.info(f"크롭 완료: {len(cropped_images)}개 영역 처리")
            return cropped_images
            
        except Exception as e:
            logger.error(f"이미지 크롭 중 오류: {str(e)}")
            return []