"""
간단한 비즈니스 룰 어댑터
하이브리드 이상탐지 시스템을 위한 빠른 룰 구현
"""
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class SimpleRuleAdapter:
    """간단한 비즈니스 룰 어댑터"""
    
    def __init__(self):
        # 기본 임계값 설정
        self.safety_stock_threshold = 0.1  # 안전재고 10% 이하
        self.large_change_threshold = 0.5   # 재고 변화 50% 이상
        self.negative_stock_threshold = 0   # 음수 재고
        self.price_anomaly_threshold = 3.0  # 가격 이상 (표준편차 3배)
        self.frequency_threshold = 10       # 시간당 최대 처리 건수
    
    def detect_anomaly(
        self, 
        inventory_log, 
        inventory=None, 
        fish_type=None
    ) -> Dict[str, Any]:
        """
        간단한 룰 기반 이상탐지
        
        Args:
            inventory_log: 재고 로그 객체 또는 딕셔너리
            inventory: 재고 객체 (선택사항)
            fish_type: 어종 객체 (선택사항)
            
        Returns:
            Dict: 이상탐지 결과 (InventoryAnomalyService와 호환)
        """
        try:
            # 기본 점수
            base_score = 0.0
            rule_hits = []
            severity = 'NORMAL'
            
            # 1. 음수 재고 체크
            if self._check_negative_stock(inventory_log):
                base_score = max(base_score, 1.0)
                rule_hits.append('negative_stock')
                severity = 'CRITICAL'
            
            # 2. 안전재고 부족 체크
            if self._check_safety_stock(inventory_log, inventory):
                base_score = max(base_score, 0.8)
                rule_hits.append('safety_stock_low')
                severity = 'HIGH'
            
            # 3. 대량 변화 체크
            if self._check_large_change(inventory_log):
                base_score = max(base_score, 0.6)
                rule_hits.append('large_change')
                severity = 'MEDIUM'
            
            # 4. 가격 이상 체크
            if self._check_price_anomaly(inventory_log):
                base_score = max(base_score, 0.7)
                rule_hits.append('price_anomaly')
                severity = 'HIGH'
            
            # 5. 처리 빈도 체크
            if self._check_frequency_anomaly(inventory_log):
                base_score = max(base_score, 0.5)
                rule_hits.append('frequency_anomaly')
                severity = 'MEDIUM'
            
            return {
                'primary': {
                    'type': 'simple_rules',
                    'severity': severity,
                    'description': self._generate_description(rule_hits),
                    'score': base_score
                },
                'rule_hits': rule_hits,
                'total_score': base_score
            }
            
        except Exception as e:
            logger.error(f"룰 점수 계산 실패: {e}")
            return {
                'score': 0.0,
                'severity': 'NORMAL',
                'rule_hits': [],
                'type': 'error',
                'description': '룰 계산 오류'
            }
    
    def _check_negative_stock(self, log) -> bool:
        """음수 재고 체크"""
        try:
            if hasattr(log, 'after_quantity'):
                return getattr(log, 'after_quantity', 0) < self.negative_stock_threshold
            else:
                return log.get('after_quantity', 0) < self.negative_stock_threshold
        except:
            return False
    
    def _check_safety_stock(self, log, inventory) -> bool:
        """안전재고 부족 체크"""
        try:
            if not inventory:
                return False
            
            current_stock = getattr(log, 'after_quantity', 0) if hasattr(log, 'after_quantity') else log.get('after_quantity', 0)
            safety_stock = getattr(inventory, 'safety_stock_quantity', 0)
            
            if safety_stock > 0:
                return current_stock <= safety_stock * self.safety_stock_threshold
            
            return False
        except:
            return False
    
    def _check_large_change(self, log) -> bool:
        """대량 변화 체크"""
        try:
            if hasattr(log, 'before_quantity') and hasattr(log, 'change'):
                before = getattr(log, 'before_quantity', 0)
                change = abs(getattr(log, 'change', 0))
            else:
                before = log.get('before_quantity', 0)
                change = abs(log.get('change', 0))
            
            if before > 0:
                change_ratio = change / before
                return change_ratio >= self.large_change_threshold
            
            return False
        except:
            return False
    
    def _check_price_anomaly(self, log) -> bool:
        """가격 이상 체크"""
        try:
            if hasattr(log, 'unit_price'):
                price = getattr(log, 'unit_price', 0)
            else:
                price = log.get('unit_price', 0)
            
            # 간단한 가격 이상 체크 (0 또는 매우 높은 값)
            if price == 0 or price > 1000000:  # 100만원 이상
                return True
            
            return False
        except:
            return False
    
    def _check_frequency_anomaly(self, log) -> bool:
        """처리 빈도 이상 체크"""
        try:
            # 간단한 구현 - 실제로는 시간대별 집계 필요
            if hasattr(log, 'created_at'):
                hour = getattr(log, 'created_at').hour
            else:
                # 딕셔너리인 경우 시간 정보가 없으면 False
                return False
            
            # 새벽 시간대 (0-6시) 처리 시 이상
            if 0 <= hour <= 6:
                return True
            
            return False
        except:
            return False
    
    def _generate_description(self, rule_hits: List[str]) -> str:
        """룰 적중 설명 생성"""
        if not rule_hits:
            return "정상"
        
        descriptions = {
            'negative_stock': '음수 재고',
            'safety_stock_low': '안전재고 부족',
            'large_change': '대량 변화',
            'price_anomaly': '가격 이상',
            'frequency_anomaly': '비정상 시간대'
        }
        
        desc_list = [descriptions.get(hit, hit) for hit in rule_hits]
        return ', '.join(desc_list)
    
    def update_thresholds(self, **kwargs):
        """임계값 업데이트"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
                logger.info(f"임계값 업데이트: {key} = {value}")
    
    def get_config(self) -> Dict[str, Any]:
        """현재 설정 반환"""
        return {
            'safety_stock_threshold': self.safety_stock_threshold,
            'large_change_threshold': self.large_change_threshold,
            'negative_stock_threshold': self.negative_stock_threshold,
            'price_anomaly_threshold': self.price_anomaly_threshold,
            'frequency_threshold': self.frequency_threshold
        }
