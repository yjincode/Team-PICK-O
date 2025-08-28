"""
YOLO11 증상 탐지 서비스
"""
import os
import cv2
import numpy as np
from PIL import Image
import logging
from django.conf import settings
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)


class YOLO11Service:
    """YOLO11 모델을 사용한 어류 증상 탐지 서비스"""
    
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(settings.BASE_DIR, 'models', 'yolo11', 'best.pt')
        self.confidence_threshold = 0.5
        self.iou_threshold = 0.45
        
    def load_model(self):
        """YOLO11 모델 로드 (호환성 검사 포함)"""
        try:
            if self.model is None:
                # 1. 먼저 YOLO11 호환성 검사
                compatibility_ok, compatibility_msg = self._check_yolo11_compatibility()
                if not compatibility_ok:
                    logger.error(f"YOLO11 호환성 문제: {compatibility_msg}")
                    logger.error("해결방법:")
                    logger.error("1. pip install --upgrade ultralytics")
                    logger.error("2. 서버/커널 재시작")
                    logger.error("3. 호환되는 YOLO 모델 사용")
                    return False
                
                logger.info(f"YOLO11 호환성 확인 완료: {compatibility_msg}")
                
                # 2. 모델 파일 확인
                if not os.path.exists(self.model_path):
                    logger.warning(f"YOLO11 모델 파일이 없습니다: {self.model_path}")
                    logger.warning("학습된 YOLO11 모델을 models/yolo11/best.pt 경로에 저장해주세요.")
                    logger.warning("현재는 기본 오류 처리 모드로 동작합니다.")
                    return False
                
                # 3. 모델 파일 정보 확인
                file_size = os.path.getsize(self.model_path) / (1024 * 1024)  # MB
                logger.info(f"모델 파일 크기: {file_size:.1f} MB")
                
                # 4. ultralytics 강제 리로드 (캐시 문제 해결)
                self._force_reload_ultralytics()
                
                # 5. 실제 YOLO 모델 로드 (에러 처리 강화)
                try:
                    from ultralytics import YOLO
                    logger.info(f"YOLO11 모델 로드 시도: {self.model_path}")
                    self.model = YOLO(self.model_path)
                    logger.info("YOLO11 모델 로드 성공")
                    return True
                    
                except Exception as model_load_error:
                    if "C3k2" in str(model_load_error):
                        logger.error("C3k2 모듈 호환성 오류 발생")
                        logger.error("이 오류는 주로 ultralytics 버전 문제로 발생합니다.")
                        logger.error("현재 시스템에서는 YOLO11 모델을 지원하지 않습니다.")
                        logger.error("대안: 기본 오류 처리 모드로 전환")
                    else:
                        logger.error(f"모델 로드 중 예상치 못한 오류: {str(model_load_error)}")
                    return False
                    
        except ImportError as import_error:
            logger.error(f"ultralytics 패키지 임포트 실패: {str(import_error)}")
            logger.error("pip install ultralytics 실행이 필요합니다.")
            return False
            
        except Exception as e:
            logger.error(f"YOLO11 서비스 초기화 중 알 수 없는 오류: {str(e)}")
            return False
    
    def _check_yolo11_compatibility(self):
        """YOLO11 호환성 검사"""
        try:
            # ultralytics 버전 확인
            import ultralytics
            version = ultralytics.__version__
            logger.info(f"현재 ultralytics 버전: {version}")
            
            # 최소 버전 요구사항 확인
            from packaging import version as pkg_version
            min_version = "8.3.11"
            
            if pkg_version.parse(version) < pkg_version.parse(min_version):
                return False, f"버전 {version}은 YOLO11을 지원하지 않음 (최소 {min_version} 필요)"
            
            # C3k2 모듈 존재 여부 확인
            try:
                from ultralytics.nn.modules.block import C3k2
                return True, f"버전 {version} - C3k2 모듈 사용 가능"
            except ImportError:
                return False, f"버전 {version}에서 C3k2 모듈을 찾을 수 없음"
                
        except Exception as e:
            return False, f"호환성 검사 중 오류: {str(e)}"
    
    def _force_reload_ultralytics(self):
        """ultralytics 모듈 강제 리로드"""
        try:
            import sys
            import importlib
            
            # ultralytics 관련 모듈 찾기
            modules_to_reload = [name for name in sys.modules.keys() if name.startswith('ultralytics')]
            
            # 모듈 제거
            for module_name in modules_to_reload:
                if module_name in sys.modules:
                    del sys.modules[module_name]
            
            logger.debug(f"ultralytics 모듈 {len(modules_to_reload)}개 리로드 완료")
            
        except Exception as e:
            logger.warning(f"ultralytics 모듈 리로드 중 경고: {str(e)}")
    
    def _get_ultralytics_version(self):
        """ultralytics 버전 확인"""
        try:
            import ultralytics
            return ultralytics.__version__
        except:
            return "알 수 없음"
    
    def detect_symptoms(self, image_path: str) -> Dict[str, Any]:
        """
        이미지에서 증상 탐지 (호환성 오류 처리 포함)
        
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
            results = self.model(
                image_path,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                verbose=False
            )
            
            # 결과 파싱
            detections = []
            original_image = cv2.imread(image_path)
            img_height, img_width = original_image.shape[:2]
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # 바운딩박스 좌표 (정규화됨)
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        
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
                logger.error("YOLO11 C3k2 호환성 오류 - ultralytics 업그레이드 필요")
                return {
                    'success': False,
                    'error': 'YOLO11 C3k2 호환성 문제 - ultralytics 패키지를 8.3.11 이상으로 업그레이드하세요.',
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
    
    def draw_detections(self, image_path: str, detections: List[Dict], 
                       output_path: str = None) -> str:
        """
        탐지 결과를 원본 이미지에 시각화
        
        Args:
            image_path: 원본 이미지 경로
            detections: 탐지 결과 리스트
            output_path: 출력 이미지 경로 (None이면 자동 생성)
            
        Returns:
            처리된 이미지 경로
        """
        try:
            # 이미지 로드
            image = cv2.imread(image_path)
            img_height, img_width = image.shape[:2]
            
            # 각 탐지 결과에 바운딩박스 그리기
            for detection in detections:
                # 절대 좌표 계산
                x1 = int(detection['bbox_x'] * img_width)
                y1 = int(detection['bbox_y'] * img_height)
                x2 = int((detection['bbox_x'] + detection['bbox_width']) * img_width)
                y2 = int((detection['bbox_y'] + detection['bbox_height']) * img_height)
                
                confidence = detection['confidence']
                class_name = detection['class_name']
                
                # 바운딩박스 그리기 (빨간색)
                cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 2)
                
                # 라벨 텍스트
                label = f"{class_name}: {confidence:.2f}"
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                
                # 라벨 배경 그리기
                cv2.rectangle(image, (x1, y1 - label_size[1] - 10), 
                             (x1 + label_size[0], y1), (0, 0, 255), -1)
                
                # 라벨 텍스트 그리기
                cv2.putText(image, label, (x1, y1 - 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # 출력 경로 설정
            if output_path is None:
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                output_path = os.path.join(
                    os.path.dirname(image_path),
                    f"{base_name}_detected.jpg"
                )
            
            # 이미지 저장
            cv2.imwrite(output_path, image)
            logger.info(f"탐지 결과 이미지 저장: {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"탐지 결과 시각화 중 오류: {str(e)}")
            return None