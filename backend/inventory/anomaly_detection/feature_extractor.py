"""
재고 데이터 특징 추출기
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class InventoryFeatureExtractor:
    """재고 데이터에서 AI 모델용 특징을 추출하는 클래스"""
    
    def __init__(self):
        self.feature_names = [
            'delta_stock',      # 전일 대비 재고 변화량
            'pct_change',       # 변화율
            'weekday',          # 요일 (0=월요일, 6=일요일)
            'stock_quantity',   # 현재 재고량
            'change_quantity',  # 변화 수량
            'unit_price',       # 단가
            'total_amount'      # 총액
        ]
    
    def extract_features(self, inventory_logs) -> np.ndarray:
        """
        재고 로그 데이터에서 특징 추출
        
        Args:
            inventory_logs: InventoryLog 객체들의 리스트
            
        Returns:
            np.ndarray: 추출된 특징 행렬 (n_samples, n_features)
        """
        try:
            if not inventory_logs:
                return np.array([]).reshape(0, len(self.feature_names))
            
            features = []
            
            for log in inventory_logs:
                feature_vector = self._extract_single_features(log)
                if feature_vector is not None:
                    features.append(feature_vector)
            
            if not features:
                return np.array([]).reshape(0, len(self.feature_names))
            
            return np.array(features)
            
        except Exception as e:
            logger.error(f"특징 추출 실패: {e}")
            return np.array([]).reshape(0, len(self.feature_names))
    
    def _extract_single_features(self, log) -> List[float]:
        """단일 로그에서 특징 추출 - Django 모델 객체 및 딕셔너리 처리"""
        try:
            # Django 모델 객체와 딕셔너리 모두 처리
            if hasattr(log, 'before_quantity'):
                # Django 모델 객체 - 실제 필드명 사용
                before_quantity = getattr(log, 'before_quantity', 0) or 0
                after_quantity = getattr(log, 'after_quantity', 0) or 0
                change_quantity = getattr(log, 'change', 0) or 0
                unit_price = getattr(log, 'unit_price', 0) or 0
                total_amount = getattr(log, 'total_amount', 0) or 0
                created_at = getattr(log, 'created_at', None)
            else:
                # 딕셔너리 - 키 이름 확인
                before_quantity = log.get('before_quantity', 0) or 0
                after_quantity = log.get('after_quantity', 0) or 0
                change_quantity = log.get('change', 0) or 0
                unit_price = log.get('unit_price', 0) or 0
                total_amount = log.get('total_amount', 0) or 0
                created_at = log.get('created_at', None)
            
            # 전일 대비 변화량 (delta_stock) - change 필드 사용
            delta_stock = change_quantity
            
            # 변화율 계산 (pct_change) - before_quantity 기준
            if before_quantity > 0:
                pct_change = change_quantity / before_quantity
            else:
                pct_change = 0.0 if change_quantity == 0 else 1.0
            
            # 요일 (weekday)
            if created_at:
                if hasattr(created_at, 'weekday'):
                    # datetime 객체
                    weekday = created_at.weekday()
                else:
                    # 문자열인 경우 파싱
                    try:
                        if isinstance(created_at, str):
                            dt = datetime.strptime(created_at, '%Y-%m-%d')
                            weekday = dt.weekday()
                        else:
                            weekday = 0
                    except:
                        weekday = 0
            else:
                weekday = 0
            
            # 특징 벡터 구성 - 실제 필드값 사용
            feature_vector = [
                delta_stock,           # change_quantity
                pct_change,            # 변화율
                weekday,               # 요일
                before_quantity,       # 이전 수량 (stock_quantity 대신)
                change_quantity,       # 변화 수량
                unit_price,            # 단가
                total_amount           # 총액
            ]
            
            return feature_vector
            
        except Exception as e:
            logger.error(f"단일 특징 추출 실패: {e}")
            return None
    
    def get_feature_names(self) -> List[str]:
        """특징 이름 리스트 반환"""
        return self.feature_names.copy()
    
    def django_extract_single_features(self, log) -> List[float]:
        """구버전 호환성을 위한 메서드 (기존 저장된 모델에서 호출)"""
        return self._extract_single_features(log)
    
    def normalize_features(self, features: np.ndarray) -> np.ndarray:
        """
        특징 정규화 (Z-score normalization)
        
        Args:
            features: 원본 특징 행렬
            
        Returns:
            np.ndarray: 정규화된 특징 행렬
        """
        try:
            if features.size == 0:
                return features
            
            # 각 특징별로 정규화
            normalized = np.zeros_like(features)
            
            for i in range(features.shape[1]):
                col = features[:, i]
                if np.std(col) > 0:
                    normalized[:, i] = (col - np.mean(col)) / np.std(col)
                else:
                    normalized[:, i] = col
            
            return normalized
            
        except Exception as e:
            logger.error(f"특징 정규화 실패: {e}")
            return features
