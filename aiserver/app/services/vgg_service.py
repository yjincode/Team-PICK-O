"""
VGG16 질병 분류 서비스 - FastAPI용
"""
import os
import numpy as np
from PIL import Image
from loguru import logger
from typing import List, Dict, Any
import json
from dotenv import load_dotenv

load_dotenv()


class VGG16Service:
    """VGG16 모델을 사용한 어류 질병 분류 서비스"""
    
    def __init__(self):
        self.model = None
        # 실제 모델 파일 경로로 수정
        self.model_path = os.getenv("VGG16_MODEL_PATH", "./app/models/vgg16/best_model.h5")
        self.classes_path = "./app/models/vgg16/classes.json"
        self.disease_classes = {}
        self.input_size = (112, 112)  # 학습된 모델의 실제 입력 크기
        self._model_load_count = 0  # 모델 로드 횟수 추적
        self._prediction_count = 0  # 예측 횟수 추적
        self._max_predictions_before_reload = 50  # 50회 예측 후 모델 재로드
        
    def check_model_status(self) -> Dict[str, Any]:
        """모델 상태 확인"""
        try:
            model_exists = os.path.exists(self.model_path)
            tensorflow_available = self._check_tensorflow()
            
            # 학습된 모델 사용 가능 여부 확인
            trained_model_available = model_exists and tensorflow_available and self.model is not None
            
            status = {
                "loaded": self.model is not None,
                "model_path": self.model_path,
                "model_exists": model_exists,
                "tensorflow_available": tensorflow_available,
                "classes_loaded": len(self.disease_classes) > 0,
                "trained_model_available": trained_model_available,
                "model_load_count": self._model_load_count,
                "prediction_count": self._prediction_count,
                "error": None
            }
            
            # 에러 상태 확인
            if not tensorflow_available:
                status["error"] = "TensorFlow가 설치되지 않았거나 사용할 수 없습니다"
            elif not model_exists:
                status["error"] = f"학습된 VGG16 모델 파일이 없습니다: {self.model_path}"
            elif not trained_model_available:
                status["error"] = "학습된 VGG16 모델을 로드할 수 없습니다. 어종 질병 분류를 수행할 수 없습니다."
            
            return status
            
        except Exception as e:
            return {
                "loaded": False,
                "model_path": self.model_path,
                "model_exists": False,
                "tensorflow_available": False,
                "trained_model_available": False,
                "classes_loaded": False,
                "error": f"모델 상태 확인 중 오류: {str(e)}"
            }
    
    def _check_tensorflow(self) -> bool:
        """TensorFlow 사용 가능 여부 확인"""
        try:
            import tensorflow as tf
            return True
        except ImportError:
            return False
        
    def load_model(self) -> bool:
        """VGG16 모델 및 클래스 정보 로드"""
        try:
            if self.model is None:
                # TensorFlow/Keras 임포트
                try:
                    import tensorflow as tf
                    from tensorflow.keras.models import load_model
                    from tensorflow.keras.applications.vgg16 import preprocess_input
                    self.preprocess_input = preprocess_input
                except ImportError:
                    logger.error("tensorflow 패키지가 설치되지 않았습니다.")
                    return False
                
                # 모델 파일 확인 및 로드
                if not os.path.exists(self.model_path):
                    logger.error(f"VGG16 학습된 모델 파일이 없습니다: {self.model_path}")
                    logger.error("해결 방법:")
                    logger.error("1. Google Colab에서 학습한 best_model.h5 파일을 다운로드")
                    logger.error("2. aiserver/models/vgg16/ 디렉토리에 복사")
                    logger.error("3. classes.json 파일도 함께 복사")
                    return False
                else:
                    logger.info(f"VGG16 모델 로드 중: {self.model_path}")
                    # TensorFlow 2.19 → 2.15 호환성을 위한 단계별 로딩
                    import tensorflow as tf
                    
                    # 1단계: 기본 로딩 시도
                    try:
                        logger.info("1단계: 기본 모델 로딩 시도")
                        self.model = load_model(self.model_path, compile=False)
                        logger.info("기본 로딩 성공")
                    except Exception as basic_error:
                        logger.warning(f"기본 로딩 실패: {basic_error}")
                        
                        # 2단계: 커스텀 객체와 함께 로딩
                        try:
                            logger.info("2단계: 커스텀 객체 로딩 시도")
                            
                            # TensorFlow 버전 차이 해결을 위한 커스텀 객체들
                            custom_objects = {}
                            
                            # InputLayer 호환성 처리
                            def create_input_layer(*args, **kwargs):
                                # batch_shape 처리
                                if 'batch_shape' in kwargs:
                                    batch_shape = kwargs.pop('batch_shape')
                                    if batch_shape and len(batch_shape) > 1:
                                        kwargs['input_shape'] = batch_shape[1:]
                                
                                # 지원하지 않는 파라미터 제거
                                unsupported_params = ['ragged', 'sparse', 'type_spec']
                                for param in unsupported_params:
                                    kwargs.pop(param, None)
                                
                                return tf.keras.layers.InputLayer(*args, **kwargs)
                            
                            custom_objects['InputLayer'] = create_input_layer
                            
                            # DTypePolicy 호환성 처리
                            try:
                                # TensorFlow 2.15에서 mixed_precision 사용
                                def create_dtype_policy(name):
                                    if hasattr(tf.keras.mixed_precision, 'Policy'):
                                        return tf.keras.mixed_precision.Policy(name)
                                    else:
                                        # 구버전 호환성
                                        return tf.keras.mixed_precision.experimental.Policy(name)
                                
                                custom_objects['DTypePolicy'] = create_dtype_policy
                            except:
                                pass
                            
                            # 모델 로딩
                            self.model = load_model(
                                self.model_path, 
                                compile=False,
                                custom_objects=custom_objects
                            )
                            logger.info("커스텀 객체 로딩 성공")
                            
                        except Exception as custom_error:
                            logger.warning(f"커스텀 객체 로딩 실패: {custom_error}")
                            
                            # 3단계: 최종 호환성 처리 (가장 관대한 설정)
                            try:
                                logger.info("3단계: 최종 호환성 처리")
                                
                                # TensorFlow 경고 억제
                                import warnings
                                warnings.filterwarnings('ignore')
                                
                                # 가장 기본적인 로딩 (safe_mode)
                                self.model = tf.keras.models.load_model(
                                    self.model_path,
                                    compile=False,
                                    safe_mode=False  # TensorFlow 2.15에서 지원
                                )
                                logger.info("최종 호환성 처리 성공")
                                
                            except Exception as final_error:
                                logger.error(f"모든 로딩 방법 실패: {final_error}")
                                logger.error("TensorFlow 버전 호환성 문제로 모델을 로드할 수 없습니다.")
                                logger.error(f"학습 환경: TensorFlow 2.19, 현재 환경: TensorFlow {tf.__version__}")
                                logger.error("해결 방법: TensorFlow를 2.19로 업그레이드하거나 모델을 현재 버전으로 재학습")
                                return False
                    
                    # 모델이 성공적으로 로드된 경우 컴파일
                    if self.model is not None:
                        try:
                            self.model.compile(
                                optimizer='adam',
                                loss='categorical_crossentropy',
                                metrics=['accuracy']
                            )
                            logger.info("모델 컴파일 완료")
                        except Exception as compile_error:
                            logger.warning(f"모델 컴파일 실패: {compile_error}")
                            # 컴파일 실패해도 추론은 가능하므로 계속 진행
                
                # 질병 클래스 정보 로드
                self._load_disease_classes()
                
                # 모델 로드 카운터 증가
                self._model_load_count += 1
                self._prediction_count = 0  # 예측 카운터 초기화
                
                logger.info(f"VGG16 학습된 모델 로드 완료 (로드 횟수: {self._model_load_count})")
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
    
    def _get_default_disease_classes(self) -> Dict[str, Any]:
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
            # 모델이 이미 로드되었는지 확인
            if self.model is None:
                # 모델 로드
                if not self.load_model():
                    logger.error("학습된 VGG16 모델 로드 실패 - 질병 분류를 수행할 수 없습니다")
                    raise Exception("VGG16 모델 로드에 실패했습니다. 모델 파일을 확인해주세요.")
            
            # 학습된 모델이 실제로 로드되었는지 확인
            if self.model is None:
                logger.error("VGG16 모델이 None 상태입니다 - 질병 분류를 수행할 수 없습니다")
                raise Exception("VGG16 모델이 올바르게 로드되지 않았습니다.")
            
            # 모델 파일 존재 여부 재확인 (학습된 모델인지 확인)
            if not os.path.exists(self.model_path):
                logger.error(f"학습된 VGG16 모델 파일이 없습니다: {self.model_path}")
                raise Exception(f"VGG16 모델 파일이 존재하지 않습니다: {self.model_path}")
            
            classification_results = []
            
            # 배치 처리를 위한 이미지 및 메타데이터 수집
            batch_images = []
            batch_metadata = []
            
            for crop_info in cropped_images:
                try:
                    # PIL Image 가져오기
                    pil_image = crop_info['cropped_image']
                    
                    # 전처리
                    processed_image = self._preprocess_image(pil_image)
                    batch_images.append(processed_image[0])  # 배치 차원 제거
                    batch_metadata.append(crop_info)
                    
                except Exception as e:
                    logger.error(f"이미지 전처리 중 오류 (인덱스 {crop_info['index']}): {str(e)}")
                    continue
            
            if not batch_images:
                logger.error("전처리된 이미지가 없습니다")
                raise Exception("처리할 수 있는 이미지가 없습니다. 이미지 전처리를 확인해주세요.")
            
            try:
                # 배치로 예측 수행 (메모리 효율성 향상)
                batch_array = np.array(batch_images)
                predictions = self.model.predict(batch_array, verbose=0, batch_size=min(8, len(batch_images)))
                
                # 예측 카운터 증가
                self._prediction_count += len(batch_images)
                
                # 결과 처리
                for i, (prediction, crop_info) in enumerate(zip(predictions, batch_metadata)):
                    try:
                        # 수동 softmax 적용 (안정성을 위해 최대값 빼기)
                        exp_preds = np.exp(prediction - np.max(prediction))
                        softmax_preds = exp_preds / np.sum(exp_preds)
                        
                        predicted_class = int(np.argmax(softmax_preds))
                        confidence = float(softmax_preds[predicted_class])
                        
                        # 질병 정보 가져오기
                        disease_info = self.disease_classes.get(
                            str(predicted_class), 
                            self.disease_classes.get("0", self._get_default_disease_info())
                        )
                        
                        # 신뢰도 기반 질병 메시지 생성
                        disease_name_ko = disease_info['disease_name_ko']
                        confidence_percent = confidence * 100
                        
                        # 신뢰도에 따른 질병 메시지 결정
                        if confidence_percent < 20:
                            disease_message = f"{disease_name_ko} 가능성이 낮습니다"
                        elif confidence_percent < 40:
                            disease_message = f"{disease_name_ko}이 조금 의심됩니다"
                        elif confidence_percent < 60:
                            disease_message = f"{disease_name_ko}이 의심됩니다"
                        elif confidence_percent < 80:
                            disease_message = f"{disease_name_ko} 가능성이 높습니다"
                        else:
                            disease_message = f"{disease_name_ko}입니다"
                        
                        # 결과 구성
                        result = {
                            'index': crop_info['index'],
                            'yolo_detection': crop_info['original_detection'],
                            'vgg_prediction': {
                                'class_id': predicted_class,
                                'confidence': confidence,
                                'disease_class': disease_info['class_name'],
                                'disease_name_ko': disease_name_ko,
                                'disease_name_en': disease_info['disease_name_en'],
                                'description': disease_message,  # 신뢰도 기반 메시지 사용
                                'severity': disease_info['severity'],
                                'symptoms': disease_info['symptoms'],
                                'treatment': disease_info['treatment'],
                                'prevention': disease_info['prevention'],
                                'is_healthy': predicted_class == 0 or confidence < 0.2  # 클래스 0이거나 신뢰도 20% 미만이면 건강한 상태
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
                        logger.error(f"예측 결과 처리 중 오류 (인덱스 {crop_info['index']}): {str(e)}")
                        continue
                
                # 메모리 정리
                del batch_array
                del predictions
                
                # TensorFlow 메모리 정리 _무거움
                try:
                    import tensorflow as tf
                    tf.keras.backend.clear_session()
                except:
                    pass
                
            except Exception as prediction_error:
                logger.error(f"배치 예측 중 오류: {str(prediction_error)}")
                raise Exception(f"모델 예측 중 오류가 발생했습니다: {str(prediction_error)}")
            
            logger.info(f"VGG16 질병 분류 완료: {len(classification_results)}개 결과")
            return classification_results
            
        except Exception as e:
            logger.error(f"VGG16 질병 분류 중 오류: {str(e)}")
            # 모킹 데이터 제거 - 실제 분류 실패 시 예외 발생
            raise Exception(f"VGG16 질병 분류에 실패했습니다: {str(e)}")
    
    def _get_default_disease_info(self) -> Dict[str, str]:
        """기본 질병 정보 반환"""
        return {
            "class_name": "unknown",
            "disease_name_ko": "알 수 없는 질병",
            "disease_name_en": "Unknown Disease",
            "description": "질병을 식별할 수 없습니다",
            "severity": "mild",
            "symptoms": "증상 정보 없음",
            "treatment": "전문가 상담 권장",
            "prevention": "정기적인 건강 관리"
        }
    
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
            
            # 단순 0-1 정규화 (사용자 모델이 이 방식으로 학습된 것으로 추정)
            processed_image = img_array.astype(np.float32) / 255.0
            
            return processed_image
            
        except Exception as e:
            logger.error(f"이미지 전처리 중 오류: {str(e)}")
            raise
    
    def calculate_overall_health_status(self, classification_results: List[Dict]) -> str:
        """
        전체 건강 상태 계산 (good/fair/poor)
        
        Args:
            classification_results: VGG16 분류 결과 리스트
            
        Returns:
            전체 건강 상태
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
    
    def classify_single_image(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        단일 이미지 질병 분류 (크롭된 이미지용)
        
        Args:
            pil_image: PIL Image 객체
            
        Returns:
            질병 분류 결과
        """
        try:
            # 모델이 이미 로드되었는지 확인
            if self.model is None:
                # 모델 로드
                if not self.load_model():
                    logger.error("학습된 VGG16 모델 로드 실패 - 질병 분류를 수행할 수 없습니다")
                    raise Exception("VGG16 모델 로드에 실패했습니다. 모델 파일을 확인해주세요.")
            
            # 모델 상태 확인
            if self.model is None:
                logger.error("VGG16 모델이 None 상태입니다 - 질병 분류를 수행할 수 없습니다")
                raise Exception("VGG16 모델이 올바르게 로드되지 않았습니다.")
            
            # 모델 입력 형태 로깅 (디버깅용)
            try:
                expected_shape = self.model.input_shape
                logger.info(f"모델 입력 형태: {expected_shape}")
            except Exception as shape_error:
                logger.error(f"모델 상태 확인 실패: {shape_error}")
                raise Exception(f"모델 상태 확인에 실패했습니다: {shape_error}")
            
            # 전처리
            processed_image = self._preprocess_image(pil_image)
            
            # 예측 수행
            predictions = self.model.predict(processed_image, verbose=0, batch_size=1)
            
            # 마지막 레이어가 sigmoid인 경우 softmax 적용
            raw_predictions = predictions[0]
            
            # 수동 softmax 적용 (안정성을 위해 최대값 빼기)
            exp_preds = np.exp(raw_predictions - np.max(raw_predictions))
            softmax_preds = exp_preds / np.sum(exp_preds)
            
            predicted_class = int(np.argmax(softmax_preds))  # numpy.int64 -> int 변환
            confidence = float(softmax_preds[predicted_class])
            
            # VGG 예측 결과 로깅 (디버깅용)
            logger.info(f"VGG 예측 결과 - 클래스: {predicted_class}, 신뢰도: {confidence:.4f}")
            logger.info(f"모든 클래스별 신뢰도: {[f'{i}:{softmax_preds[i]:.4f}' for i in range(len(softmax_preds))]}")
            
            # 예측 카운터 증가
            self._prediction_count += 1
            
            # 질병 정보 가져오기
            disease_info = self.disease_classes.get(
                str(predicted_class), 
                self.disease_classes.get("0", self._get_default_disease_info())
            )
            
            # 신뢰도 기반 질병 메시지 생성
            disease_name_ko = str(disease_info.get('disease_name_ko', '알 수 없음'))
            confidence_percent = confidence * 100
            
            # 신뢰도에 따른 질병 메시지 결정
            if confidence_percent < 20:
                disease_message = f"{disease_name_ko} 가능성이 낮습니다"
            elif confidence_percent < 40:
                disease_message = f"{disease_name_ko}이 조금 의심됩니다"
            elif confidence_percent < 60:
                disease_message = f"{disease_name_ko}이 의심됩니다"
            elif confidence_percent < 80:
                disease_message = f"{disease_name_ko} 가능성이 높습니다"
            else:
                disease_message = f"{disease_name_ko}입니다"
            
            # is_healthy 판정 로직 (디버깅 로그 추가)
            is_healthy_result = predicted_class == 0 or confidence < 0.2
            logger.info(f"is_healthy 판정: class={predicted_class}, confidence={confidence:.3f} ({confidence*100:.1f}%), is_healthy={is_healthy_result}")
            
            # 결과 구성 - 모든 값을 명시적으로 Python 네이티브 타입으로 변환
            result = {
                'class_id': int(predicted_class),  # 명시적 int 변환
                'confidence': float(confidence),   # 명시적 float 변환
                'disease_class': str(disease_info.get('class_name', 'unknown')),
                'disease_name_ko': disease_name_ko,
                'disease_name_en': str(disease_info.get('disease_name_en', 'Unknown')),
                'description': disease_message,  # 신뢰도 기반 메시지 사용
                'severity': str(disease_info.get('severity', 'mild')),
                'symptoms': str(disease_info.get('symptoms', '')),
                'treatment': str(disease_info.get('treatment', '')),
                'prevention': str(disease_info.get('prevention', '')),
                'is_healthy': is_healthy_result  # 클래스 0이거나 신뢰도 20% 미만이면 건강한 상태
            }
            
            # 메모리 정리
            del predictions
            try:
                import tensorflow as tf
                tf.keras.backend.clear_session()
            except:
                pass
            
            logger.info(f"단일 이미지 질병 분류 완료: {result['disease_name_ko']} (신뢰도: {confidence:.3f})")
            return result
            
        except Exception as e:
            logger.error(f"단일 이미지 질병 분류 중 오류: {str(e)}")
            # 모킹 데이터 제거 - 실제 분류 실패 시 예외 발생
            raise Exception(f"이미지 질병 분류에 실패했습니다: {str(e)}")
    
    def get_disease_severity_weight(self, disease_class: str) -> float:
        """질병별 심각도 가중치 반환"""
        severity_weights = {
            'viral_hemorrhagic_septicemia': 0.9,  # 바이러스성출혈성패혈증 (매우 위험)
            'streptococcosis': 0.8,              # 연쇄구균증 (위험) 
            'edwardsiellosis': 0.8,              # 에드워드병 (위험)
            'scuticociliatosis': 0.7,            # 스쿠티카병 (위험)
            'vibriosis': 0.7,                    # 비브리오병 (위험)
            'emaciation': 0.6,                   # 여윔병 (중간)
            'lymphocystis': 0.3,                 # 림포시스티스병 (경미)
        }
        return severity_weights.get(disease_class, 0.5)  # 기본값 0.5
    
    def post_process_vgg_result(self, vgg_result: Dict[str, Any], yolo_detection_count: int = 0) -> Dict[str, Any]:
        """
        VGG 결과 후처리 로직
        
        Args:
            vgg_result: VGG 분류 결과
            yolo_detection_count: YOLO 탐지된 증상 개수
            
        Returns:
            후처리된 결과
        """
        try:
            if not vgg_result:
                return {
                    'class_id': 0,
                    'confidence': 0.0,
                    'disease_class': 'healthy',
                    'disease_name_ko': '건강함',
                    'disease_name_en': 'Healthy',
                    'description': '건강한 상태입니다',
                    'severity': 'mild',
                    'symptoms': '특별한 증상 없음',
                    'treatment': '현재 상태 유지',
                    'prevention': '정기적인 수질 관리 및 영양 공급',
                    'is_healthy': True
                }
            
            confidence = vgg_result.get('confidence', 0.0)
            original_disease = vgg_result.get('disease_class', 'unknown')
            
            logger.info(f"VGG 후처리 시작 - 원본 질병: {original_disease}, 신뢰도: {confidence:.4f}, YOLO 탐지: {yolo_detection_count}개")
            
            # VGG 신뢰도가 20% 미만일 경우 건강 상태로 재분류
            if confidence < 0.2:
                logger.info(f"🔄 VGG 신뢰도 {confidence:.4f} < 0.2, 건강 상태로 재분류 시작")
                
                # YOLO 증상 탐지 개수에 따라 세분화
                if yolo_detection_count == 0:
                    health_status = {
                        'class_id': 0,
                        'confidence': confidence,
                        'disease_class': 'healthy',
                        'disease_name_ko': '건강함',
                        'disease_name_en': 'Healthy',
                        'description': '건강한 상태입니다',
                        'severity': 'mild',
                        'symptoms': '특별한 증상 없음',
                        'treatment': '현재 상태 유지',
                        'prevention': '정기적인 수질 관리 및 영양 공급',
                        'is_healthy': True
                    }
                    logger.info(f"✅ 건강 상태로 재분류 완료: YOLO 탐지 0개")
                elif yolo_detection_count == 1:
                    health_status = {
                        'class_id': 0,
                        'confidence': confidence,
                        'disease_class': 'minor_wound',
                        'disease_name_ko': '경미한상처',
                        'disease_name_en': 'Minor Wound',
                        'description': '경미한 상처가 있지만 건강한 상태입니다',
                        'severity': 'mild',
                        'symptoms': '작은 외상 흔적',
                        'treatment': '자연 치유 관찰',
                        'prevention': '날카로운 장식물 점검',
                        'is_healthy': True
                    }
                    logger.info(f"✅ 경미한 상처로 재분류 완료: YOLO 탐지 1개")
                elif yolo_detection_count <= 3:
                    health_status = {
                        'class_id': 0,
                        'confidence': confidence,
                        'disease_class': 'wounds',
                        'disease_name_ko': '상처',
                        'disease_name_en': 'Wounds',
                        'description': '여러 상처가 있어 관찰이 필요합니다',
                        'severity': 'moderate',
                        'symptoms': '다수의 외상',
                        'treatment': '상처 소독, 수질 개선',
                        'prevention': '환경 안전성 점검 필요',
                        'is_healthy': True
                    }
                    logger.info(f"✅ 상처로 재분류 완료: YOLO 탐지 {yolo_detection_count}개")
                else:  # 4개 이상
                    health_status = {
                        'class_id': 0,
                        'confidence': confidence,
                        'disease_class': 'many_wounds',
                        'disease_name_ko': '상처많음',
                        'disease_name_en': 'Many Wounds',
                        'description': '심각한 다수의 상처로 치료가 필요합니다',
                        'severity': 'severe',
                        'symptoms': '광범위한 외상',
                        'treatment': '즉시 격리 및 상처 치료',
                        'prevention': '사육 환경 전면 개선',
                        'is_healthy': True
                    }
                    logger.info(f"✅ 상처많음으로 재분류 완료: YOLO 탐지 {yolo_detection_count}개")
                
                logger.info(f"🎯 건강 재분류 최종 완료: {health_status['disease_name_ko']} (건강상태: {health_status['is_healthy']})")
                return health_status
            else:
                # 20% 이상일 경우 기존 질병 분류 결과 유지
                result = vgg_result.copy()
                result['is_healthy'] = False
                logger.info(f"🔴 VGG 신뢰도 {confidence:.4f} >= 0.2, 질병 상태 유지: {result.get('disease_name_ko', '미확인')}")
                return result
                
        except Exception as e:
            logger.error(f"VGG 결과 후처리 중 오류: {str(e)}")
            return vgg_result
    
    def calculate_symptom_severity_penalty(self, yolo_detections: List[Dict]) -> float:
        """
        증상 심각도 추가 차감 계산 (바운딩박스 크기 + 평균 신뢰도 기반) - 0.1% 단위 초민감 평가
        
        Args:
            yolo_detections: YOLO 탐지 결과 리스트
            
        Returns:
            증상 심각도 차감 점수 (0-19점)
            - 면적 기준: 0.1% = 1.2점, 0.3% = 3.6점, 1% = 12점 (최대)
            - 신뢰도 기준: 최대 7점
        """
        try:
            if not yolo_detections:
                return 0.0
            
            total_area = 0.0
            total_confidence = 0.0
            
            for i, detection in enumerate(yolo_detections):
                # 바운딩박스 면적 계산 (정규화된 좌표 기준)
                bbox_width = detection.get('bbox_width', 0.0)
                bbox_height = detection.get('bbox_height', 0.0)
                area = bbox_width * bbox_height
                area_percent = area * 100  # 백분율로 변환
                
                # 개별 상처 면적 로깅
                logger.info(f"상처 {i+1}: 면적 {area:.4f} ({area_percent:.2f}%), 가로 {bbox_width:.4f}, 세로 {bbox_height:.4f}")
                
                total_area += area
                
                # 신뢰도 합계
                confidence = detection.get('confidence', 0.0)
                total_confidence += confidence
                logger.info(f"상처 {i+1}: 신뢰도 {confidence:.3f} ({confidence*100:.1f}%)")
            
            # 평균 계산
            avg_area = total_area / len(yolo_detections)
            avg_confidence = total_confidence / len(yolo_detections)
            avg_area_percent = avg_area * 100
            
            # 평균 면적 및 신뢰도 로깅
            logger.info(f"📊 전체 통계: 상처 개수 {len(yolo_detections)}개")
            logger.info(f"📊 총 면적: {total_area:.4f} ({total_area*100:.2f}%)")
            logger.info(f"📊 평균 면적: {avg_area:.4f} ({avg_area_percent:.2f}%)")
            logger.info(f"📊 평균 신뢰도: {avg_confidence:.3f} ({avg_confidence*100:.1f}%)")
            
            # 면적 기반 차감 (0-12점) - 0.1% 단위로 민감하게 조정
            area_penalty = min(avg_area * 1200, 12.0)  # 평균 면적이 0.01(1%)이면 12점 차감 (0.1% 단위 민감도)
            logger.info(f"💥 면적 기반 차감 계산: {avg_area:.4f} * 1200 = {area_penalty:.1f}점")
            
            # 신뢰도 기반 차감 (0-7점) - 더 엄격한 평가 
            confidence_penalty = min(avg_confidence * 7, 7.0)  # 평균 신뢰도 100%면 7점 차감 (기존 5점에서 증가)
            logger.info(f"💥 신뢰도 기반 차감 계산: {avg_confidence:.3f} * 7 = {confidence_penalty:.1f}점")
            
            total_penalty = area_penalty + confidence_penalty
            
            logger.info(f"증상 심각도 차감: 면적 {area_penalty:.1f} + 신뢰도 {confidence_penalty:.1f} = {total_penalty:.1f}점")
            return min(total_penalty, 19.0)  # 최대 19점 차감 (면적 12점 + 신뢰도 7점)
            
        except Exception as e:
            logger.error(f"증상 심각도 계산 중 오류: {str(e)}")
            return 0.0
    
    def calculate_comprehensive_health_score(self, vgg_result: Dict[str, Any], yolo_detections: List[Dict]) -> Dict[str, Any]:
        """
        100점 만점 다차원 건강도 계산 시스템
        
        Args:
            vgg_result: VGG 분류 결과
            yolo_detections: YOLO 탐지 결과 리스트
            
        Returns:
            종합 건강 점수 및 상세 정보
        """
        try:
            # 후처리된 VGG 결과 가져오기
            yolo_count = len(yolo_detections) if yolo_detections else 0
            processed_vgg = self.post_process_vgg_result(vgg_result, yolo_count)
            
            # 기본 점수: 100점
            base_score = 100.0
            
            # 1. 질병 위험도 차감 (최대 70점)
            disease_penalty = 0.0
            if not processed_vgg.get('is_healthy', False):
                disease_class = processed_vgg.get('disease_class', '')
                vgg_confidence = processed_vgg.get('confidence', 0.0)
                severity_weight = self.get_disease_severity_weight(disease_class)
                
                disease_penalty = severity_weight * vgg_confidence * 70
                logger.info(f"질병 차감: {disease_class} x {vgg_confidence:.3f} x {severity_weight} x 70 = {disease_penalty:.1f}점")
            
            # 2. 증상 개수 차감 (최대 20점)
            symptom_count_penalty = min(yolo_count * 5, 20.0)
            logger.info(f"증상 개수 차감: {yolo_count}개 x 5 = {symptom_count_penalty:.1f}점")
            
            # 3. 증상 심각도 차감 (최대 10점)
            symptom_severity_penalty = self.calculate_symptom_severity_penalty(yolo_detections)
            
            # 총 차감 점수 계산
            total_penalty = disease_penalty + symptom_count_penalty + symptom_severity_penalty
            final_score = max(base_score - total_penalty, 0.0)  # 최소 0점
            
            # 세부 점수 계산
            disease_health_score = max(100 - disease_penalty, 0)  # 질병 건강도
            trauma_health_score = max(100 - symptom_count_penalty - symptom_severity_penalty, 0)  # 외상 건강도
            
            logger.info(f"종합 건강 점수: {final_score:.1f}/100 (질병: {disease_health_score:.1f}, 외상: {trauma_health_score:.1f})")
            
            return {
                'total_score': round(final_score, 1),
                'disease_health_score': round(disease_health_score, 1),
                'trauma_health_score': round(trauma_health_score, 1),
                'penalties': {
                    'disease_penalty': round(disease_penalty, 1),
                    'symptom_count_penalty': round(symptom_count_penalty, 1),
                    'symptom_severity_penalty': round(symptom_severity_penalty, 1),
                    'total_penalty': round(total_penalty, 1)
                },
                'processed_vgg_result': processed_vgg,
                'yolo_detection_count': yolo_count
            }
            
        except Exception as e:
            logger.error(f"종합 건강 점수 계산 중 오류: {str(e)}")
            # 모킹 데이터 제거 - 실제 계산 실패 시 예외 발생
            raise Exception(f"종합 건강 점수 계산에 실패했습니다: {str(e)}")
    
    def get_health_grade_and_message(self, health_score: float, is_healthy: bool, vgg_confidence: float = 0.0) -> Dict[str, str]:
        """
        점수 기반 건강 등급 및 메시지 결정
        
        Args:
            health_score: 건강 점수 (0-100)
            is_healthy: 건강 상태 여부 (VGG 20% 미만)
            vgg_confidence: VGG 신뢰도 (0.0-1.0)
            
        Returns:
            등급, 메시지, 색상, 위험도 레벨 정보
        """
        try:
            # VGG 신뢰도 기반 위험도 레벨 계산
            vgg_conf_percent = vgg_confidence * 100
            
            def get_risk_level(confidence_percent: float, is_healthy_state: bool) -> str:
                if is_healthy_state or confidence_percent < 10:
                    return '건강'
                elif confidence_percent < 15:
                    return '약간의심'
                elif confidence_percent < 30:
                    return '의심'
                elif confidence_percent < 60:
                    return '질병 위험'
                else:
                    return '격리필요'
            if is_healthy:
                # 건강 상태인 경우
                if health_score >= 90:
                    return {
                        'grade': '상',
                        'message': '건강합니다',
                        'color': 'green',
                        'description': '매우 좋은 상태입니다',
                        'risk_level': get_risk_level(vgg_conf_percent, True)
                    }
                elif health_score >= 70:
                    return {
                        'grade': '중상',
                        'message': '약간의 상처가 있지만 건강합니다',
                        'color': 'green',
                        'description': '전반적으로 양호한 상태입니다',
                        'risk_level': get_risk_level(vgg_conf_percent, True)
                    }
                elif health_score >= 50:
                    return {
                        'grade': '중',
                        'message': '상처가 많아 관찰이 필요합니다',
                        'color': 'yellow',
                        'description': '지속적인 관찰이 필요합니다',
                        'risk_level': get_risk_level(vgg_conf_percent, True)
                    }
                elif health_score >= 30:
                    return {
                        'grade': '중하',
                        'message': '상처가 심각합니다',
                        'color': 'orange',
                        'description': '적극적인 관리가 필요합니다',
                        'risk_level': get_risk_level(vgg_conf_percent, True)
                    }
                else:
                    return {
                        'grade': '하',
                        'message': '즉시 치료가 필요합니다',
                        'color': 'red',
                        'description': '긴급한 치료가 필요합니다',
                        'risk_level': get_risk_level(vgg_conf_percent, True)
                    }
            else:
                # 질병 상태인 경우
                if health_score >= 80:
                    return {
                        'grade': '중상',
                        'message': '경미한 질병이 의심됩니다',
                        'color': 'yellow',
                        'description': '경미한 질병 상태입니다',
                        'risk_level': get_risk_level(vgg_conf_percent, False)
                    }
                elif health_score >= 60:
                    return {
                        'grade': '중',
                        'message': '질병 진단이 필요합니다',
                        'color': 'orange',
                        'description': '정밀한 진단이 필요합니다',
                        'risk_level': get_risk_level(vgg_conf_percent, False)
                    }
                elif health_score >= 40:
                    return {
                        'grade': '중하',
                        'message': '질병 치료가 필요합니다',
                        'color': 'red',
                        'description': '치료가 시급합니다',
                        'risk_level': get_risk_level(vgg_conf_percent, False)
                    }
                elif health_score >= 20:
                    return {
                        'grade': '하',
                        'message': '심각한 질병이 의심됩니다',
                        'color': 'red',
                        'description': '심각한 질병 상태입니다',
                        'risk_level': get_risk_level(vgg_conf_percent, False)
                    }
                else:
                    return {
                        'grade': '하',
                        'message': '즉시 격리 및 치료가 필요합니다',
                        'color': 'red',
                        'description': '매우 위험한 상태입니다',
                        'risk_level': get_risk_level(vgg_conf_percent, False)
                    }
                    
        except Exception as e:
            logger.error(f"건강 등급 계산 중 오류: {str(e)}")
            return {
                'grade': '중',
                'message': '상태를 확인 중입니다',
                'color': 'gray',
                'description': '평가 중입니다',
                'risk_level': '보통'
            }
