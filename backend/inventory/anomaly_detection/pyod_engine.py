"""
PyOD 기반 이상탐지 엔진
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime
import pickle
import os
from django.conf import settings

try:
    from pyod.models.ecod import ECOD
    PYOD_AVAILABLE = True
except ImportError:
    PYOD_AVAILABLE = False
    logging.warning("PyOD not available. Using mock data.")

from .feature_extractor import InventoryFeatureExtractor

logger = logging.getLogger(__name__)


class PyODAnomalyDetector:
    """PyOD ECOD 기반 이상탐지 엔진"""
    
    def __init__(self, contamination: float = 0.1):
        """
        Args:
            contamination: 이상 데이터 비율 (기본값: 10%)
        """
        self.contamination = contamination
        self.model = None
        self.feature_extractor = InventoryFeatureExtractor()
        self.is_trained = False
        self.model_version = f"pyod-ecod-{datetime.now().strftime('%Y%m%d')}"
        self.model_path = os.path.join(settings.BASE_DIR, 'models', 'pyod_ecod_model.pkl')
        
        # 모델 디렉토리 생성
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        
        if PYOD_AVAILABLE:
            self.model = ECOD(contamination=contamination)
        else:
            logger.warning("PyOD not available. Using mock model.")
    
    def train(self, inventory_logs) -> bool:
        """
        모델 훈련
        
        Args:
            inventory_logs: 훈련용 재고 로그 데이터 (List[Dict] 또는 np.ndarray)
            
        Returns:
            bool: 훈련 성공 여부
        """
        try:
            if not PYOD_AVAILABLE:
                logger.warning("PyOD not available. Mock training completed.")
                self.is_trained = True
                return True
            
            if inventory_logs is None or (hasattr(inventory_logs, 'size') and inventory_logs.size == 0):
                logger.error("훈련 데이터가 없습니다.")
                return False
            
            logger.info(f"PyOD 모델 훈련 시작 - 데이터: {len(inventory_logs)}건")
            
            # 데이터 타입에 따른 특징 추출
            if isinstance(inventory_logs, np.ndarray):
                features = inventory_logs
                logger.info(f"NumPy 배열 직접 사용: {features.shape}")
            else:
                features = self.feature_extractor.extract_features(inventory_logs)
                logger.info(f"추출된 특징: {features.shape}")
            
            if features.size == 0:
                logger.error("추출된 특징이 없습니다.")
                return False
            
            # 특징 정규화
            normalized_features = self.feature_extractor.normalize_features(features)
            
            # 모델 훈련
            self.model.fit(normalized_features)
            self.is_trained = True
            
            # 모델 저장
            self._save_model()
            
            logger.info("PyOD 모델 훈련 완료")
            return True
            
        except Exception as e:
            logger.error(f"모델 훈련 실패: {e}")
            return False
    
    def predict(self, inventory_log: Dict) -> Dict[str, Any]:
        """
        단일 재고 로그에 대한 이상탐지 예측
        
        Args:
            inventory_log: 예측할 재고 로그 데이터
            
        Returns:
            Dict: 예측 결과
        """
        try:
            if not self.is_trained:
                logger.warning("모델이 훈련되지 않았습니다.")
                return self._get_mock_prediction()
            
            if not PYOD_AVAILABLE:
                return self._get_mock_prediction()
            
            # 특징 추출
            features = self.feature_extractor.extract_features([inventory_log])
            
            if features.size == 0:
                logger.warning("특징 추출 실패")
                return self._get_mock_prediction()
            
            # 특징 정규화
            normalized_features = self.feature_extractor.normalize_features(features)
            
            # 예측 수행
            anomaly_scores = self.model.decision_function(normalized_features)
            anomaly_labels = self.model.predict(normalized_features)
            
            # 결과 정규화 (0-1 범위)
            score_raw = float(anomaly_scores[0])
            score_norm = self._normalize_score(score_raw)
            is_anomaly = bool(anomaly_labels[0] == 1)
            
            return {
                'score_raw': score_raw,
                'score_norm': score_norm,
                'is_anomaly': is_anomaly,
                'method': 'pyod-ecod',
                'model_version': self.model_version,
                'confidence': score_norm
            }
            
        except Exception as e:
            logger.error(f"예측 실패: {e}")
            return self._get_mock_prediction()
    
    def predict_batch(self, inventory_logs: List[Dict]) -> List[Dict[str, Any]]:
        """
        배치 예측
        
        Args:
            inventory_logs: 예측할 재고 로그 데이터 리스트
            
        Returns:
            List[Dict]: 예측 결과 리스트
        """
        try:
            results = []
            
            for log in inventory_logs:
                result = self.predict(log)
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"배치 예측 실패: {e}")
            return [self._get_mock_prediction() for _ in inventory_logs]
    
    def _normalize_score(self, score: float) -> float:
        """점수를 0-1 범위로 정규화 (더 유연한 버전)"""
        try:
            # 더 유연한 범위: 5 ~ 25
            if score < 5:
                return 0.0
            elif score > 25:
                return 1.0
            else:
                # 5 ~ 25를 0 ~ 1로 정규화 (20점 범위)
                return (score - 5) / 20
        except:
            return 0.5  # 기본값
    
    def _get_mock_prediction(self) -> Dict[str, Any]:
        """PyOD가 없을 때 사용할 모의 예측 결과"""
        return {
            'score_raw': 0.0,
            'score_norm': 0.5,
            'is_anomaly': False,
            'method': 'mock',
            'model_version': 'mock-v1.0',
            'confidence': 0.5
        }
    
    def _save_model(self):
        """모델 저장"""
        try:
            if self.model and self.is_trained:
                with open(self.model_path, 'wb') as f:
                    pickle.dump({
                        'model': self.model,
                        'feature_extractor': self.feature_extractor,
                        'model_version': self.model_version,
                        'trained_at': datetime.now()
                    }, f)
                logger.info(f"모델 저장 완료: {self.model_path}")
        except Exception as e:
            logger.error(f"모델 저장 실패: {e}")
    
    def load_model(self) -> bool:
        """저장된 모델 로드"""
        try:
            if not os.path.exists(self.model_path):
                logger.warning("저장된 모델이 없습니다.")
                return False
            
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.feature_extractor = model_data['feature_extractor']
            self.model_version = model_data['model_version']
            self.is_trained = True
            
            logger.info(f"모델 로드 완료: {self.model_version}")
            return True
            
        except Exception as e:
            logger.error(f"모델 로드 실패: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""
        return {
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'contamination': self.contamination,
            'feature_names': self.feature_extractor.get_feature_names(),
            'pyod_available': PYOD_AVAILABLE
        }
