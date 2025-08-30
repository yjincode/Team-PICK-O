"""
하이브리드 이상탐지 스코어링 시스템
룰 기반 + AI 기반을 조합하여 더 정확한 이상탐지
"""
import numpy as np
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from .pyod_engine import PyODAnomalyDetector
from ..anomaly_service import InventoryAnomalyService
from ..anomaly_detection_services.rule_adapter import SimpleRuleAdapter

logger = logging.getLogger(__name__)


class HybridAnomalyScorer:
    """하이브리드 이상탐지 스코어링 시스템"""
    
    def __init__(self, alpha: float = 0.5, use_simple_rules: bool = False):
        """
        Args:
            alpha: 룰 기반 가중치 (0.0 = AI만, 1.0 = 룰만, 0.5 = 균형)
            use_simple_rules: 간단한 룰 어댑터 사용 여부
        """
        self.alpha = alpha
        self.pyod_detector = PyODAnomalyDetector()
        self.use_simple_rules = use_simple_rules
        
        if use_simple_rules:
            self.rule_service = SimpleRuleAdapter()
        else:
            self.rule_service = InventoryAnomalyService()
        
        # 자동 임계값 계산을 위한 설정
        self.threshold_method = 'percentile'  # 'percentile' 또는 'mad'
        self.warning_threshold = 0.95  # P95
        self.notice_threshold = 0.85   # P85
    
    def calculate_hybrid_score(
        self, 
        inventory_log, 
        inventory: Any, 
        fish_type: Any
    ) -> Dict[str, Any]:
        """
        하이브리드 이상탐지 점수 계산
        
        Args:
            inventory_log: 재고 로그 데이터 (Dict 또는 Django 모델 객체)
            inventory: 재고 객체
            fish_type: 어종 객체
            
        Returns:
            Dict: 하이브리드 이상탐지 결과
        """
        try:
            # 1. 룰 기반 점수 계산
            rule_result = self._calculate_rule_score(inventory_log, inventory, fish_type)
            
            # 2. AI 기반 점수 계산
            ai_result = self._calculate_ai_score(inventory_log)
            
            # 3. 하이브리드 점수 계산
            hybrid_score = self._combine_scores(rule_result, ai_result)
            
            # 4. 심각도 결정
            severity = self._determine_severity(hybrid_score)
            
            # 5. 이유 설명 생성
            reason_text = self._generate_reason_text(rule_result, ai_result, hybrid_score)
            
            return {
                'method': 'hybrid',
                'score_raw': hybrid_score,
                'score_norm': hybrid_score,
                'threshold': self._get_threshold(),
                'severity': severity,
                'model_version': f"hybrid-{datetime.now().strftime('%Y%m%d')}",
                'reason_text': reason_text,
                'rule_score': rule_result.get('score', 0.0),
                'ai_score': ai_result.get('score_norm', 0.0),
                'is_anomaly': hybrid_score >= self.notice_threshold
            }
            
        except Exception as e:
            logger.error(f"하이브리드 점수 계산 실패: {e}")
            return self._get_fallback_result()
    
    def _calculate_rule_score(
        self, 
        inventory_log, 
        inventory: Any, 
        fish_type: Any
    ) -> Dict[str, Any]:
        """룰 기반 점수 계산"""
        try:
            # Django 모델 객체를 직접 전달 (__dict__ 대신)
            anomaly_result = self.rule_service.detect_anomaly(
                inventory_log, inventory, fish_type
            )
            
            if anomaly_result:
                # 기존 룰 기반 결과를 점수로 변환
                primary_anomaly = anomaly_result.get('primary', {})
                severity = primary_anomaly.get('severity', 'LOW')
                
                # 심각도를 점수로 변환
                severity_scores = {
                    'CRITICAL': 1.0,
                    'HIGH': 0.8,
                    'MEDIUM': 0.6,
                    'LOW': 0.4
                }
                
                score = severity_scores.get(severity, 0.0)
                
                return {
                    'score': score,
                    'severity': severity,
                    'type': primary_anomaly.get('type', ''),
                    'description': primary_anomaly.get('description', '')
                }
            else:
                return {
                    'score': 0.0,
                    'severity': 'NORMAL',
                    'type': '',
                    'description': '정상'
                }
                
        except Exception as e:
            logger.error(f"룰 기반 점수 계산 실패: {e}")
            return {'score': 0.0, 'severity': 'NORMAL', 'type': '', 'description': '정상'}
    
    def _calculate_ai_score(self, inventory_log: Dict) -> Dict[str, Any]:
        """AI 기반 점수 계산"""
        try:
            # PyOD 엔진으로 예측
            ai_result = self.pyod_detector.predict(inventory_log)
            
            return {
                'score_norm': ai_result.get('score_norm', 0.0),
                'score_raw': ai_result.get('score_raw', 0.0),
                'is_anomaly': ai_result.get('is_anomaly', False),
                'method': ai_result.get('method', 'pyod-ecod'),
                'model_version': ai_result.get('model_version', 'unknown')
            }
            
        except Exception as e:
            logger.error(f"AI 점수 계산 실패: {e}")
            return {
                'score_norm': 0.0,
                'score_raw': 0.0,
                'is_anomaly': False,
                'method': 'error',
                'model_version': 'error'
            }
    
    def _combine_scores(self, rule_result: Dict, ai_result: Dict) -> float:
        """룰과 AI 점수를 조합"""
        try:
            rule_score = rule_result.get('score', 0.0)
            ai_score = ai_result.get('score_norm', 0.0)
            
            # 가중 평균으로 조합
            hybrid_score = (self.alpha * rule_score + (1 - self.alpha) * ai_score)
            
            # 0-1 범위로 클리핑
            hybrid_score = max(0.0, min(1.0, hybrid_score))
            
            return float(hybrid_score)
            
        except Exception as e:
            logger.error(f"점수 조합 실패: {e}")
            return 0.0
    
    def _determine_severity(self, score: float) -> str:
        """점수에 따른 심각도 결정"""
        if score >= self.warning_threshold:
            return 'warning'
        elif score >= self.notice_threshold:
            return 'notice'
        else:
            return 'normal'
    
    def _generate_reason_text(
        self, 
        rule_result: Dict, 
        ai_result: Dict, 
        hybrid_score: float
    ) -> str:
        """이상탐지 이유 설명 생성"""
        try:
            rule_type = rule_result.get('type', '')
            ai_score = ai_result.get('score_norm', 0.0)
            
            if rule_type:
                return f"{rule_type}, AI={ai_score:.2f} → {self._determine_severity(hybrid_score)}"
            else:
                return f"AI 점수 {ai_score:.2f} → {self._determine_severity(hybrid_score)}"
                
        except Exception as e:
            logger.error(f"이유 설명 생성 실패: {e}")
            return f"하이브리드 점수 {hybrid_score:.2f}"
    
    def _get_threshold(self) -> float:
        """현재 임계값 반환"""
        return self.notice_threshold
    
    def _get_fallback_result(self) -> Dict[str, Any]:
        """오류 시 기본 결과"""
        return {
            'method': 'hybrid',
            'score_raw': 0.0,
            'score_norm': 0.0,
            'threshold': self.notice_threshold,
            'severity': 'normal',
            'model_version': f"hybrid-{datetime.now().strftime('%Y%m%d')}",
            'reason_text': '오류 발생',
            'rule_score': 0.0,
            'ai_score': 0.0,
            'is_anomaly': False
        }
    
    def update_alpha(self, new_alpha: float):
        """가중치 업데이트"""
        if 0.0 <= new_alpha <= 1.0:
            self.alpha = new_alpha
            logger.info(f"하이브리드 가중치 업데이트: {new_alpha}")
        else:
            logger.warning(f"잘못된 가중치 값: {new_alpha}")
    
    def get_config(self) -> Dict[str, Any]:
        """현재 설정 반환"""
        return {
            'alpha': self.alpha,
            'threshold_method': self.threshold_method,
            'warning_threshold': self.warning_threshold,
            'notice_threshold': self.notice_threshold,
            'pyod_available': self.pyod_detector.get_model_info().get('pyod_available', False)
        }
