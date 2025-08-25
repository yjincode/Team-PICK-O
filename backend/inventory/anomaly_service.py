from django.utils import timezone
from django.db.models import Q
import logging
from datetime import datetime, timedelta

from .models import Inventory, InventoryLog, InventoryAnomaly

logger = logging.getLogger(__name__)


class InventoryAnomalyService:
    """재고 이상탐지 서비스"""
    
    # 단위별 소량 컷 (무시 구간)
    SMALL_QUANTITY_CUTS = {
        '박스': 5,
        'kg': 10,
        '마리': 3,
        '포': 2,
        '개': 5,
        '통': 2,
        '팩': 3
    }
    
    # 단위별 안전재고 기본값
    DEFAULT_SAFETY_STOCKS = {
        '박스': 20,
        'kg': 50,
        '마리': 10,
        '포': 5,
        '개': 20,
        '통': 5,
        '팩': 10
    }
    
    # 경매 시간 (03:00-09:00)
    AUCTION_START_HOUR = 3
    AUCTION_END_HOUR = 9
    
    @classmethod
    def detect_anomaly(cls, inventory_log, inventory, fish_type):
        """
        재고 이상탐지 메인 함수 (우선순위 기반)
        
        Args:
            inventory_log: InventoryLog 객체
            inventory: Inventory 객체
            fish_type: FishType 객체
            
        Returns:
            dict: 스마트 그룹화된 이상탐지 결과 또는 None
        """
        try:
            all_anomalies = []
            
            # 1. 마이너스 재고 탐지 (최우선)
            negative_anomaly = cls._detect_negative_stock(inventory, fish_type)
            if negative_anomaly:
                all_anomalies.append(negative_anomaly)
            
            # 2. 급격한 재고 변동 탐지
            sudden_change_anomaly = cls._detect_sudden_change(inventory_log, inventory, fish_type)
            if sudden_change_anomaly:
                all_anomalies.append(sudden_change_anomaly)
            
            # 3. 재고 부족 탐지
            low_stock_anomaly = cls._detect_low_stock(inventory, fish_type)
            if low_stock_anomaly:
                all_anomalies.append(low_stock_anomaly)
            
            # 4. 중복 입력 탐지
            duplicate_anomaly = cls._detect_duplicate_log(inventory_log, inventory, fish_type)
            if duplicate_anomaly:
                all_anomalies.append(duplicate_anomaly)
            
            # 5. 단가/금액 정합성 탐지
            price_anomaly = cls._detect_price_consistency(inventory_log, inventory, fish_type)
            if price_anomaly:
                all_anomalies.append(price_anomaly)
            
            # 이상탐지 결과 저장
            if all_anomalies:
                cls._save_anomalies(all_anomalies, inventory_log, inventory, fish_type)
                
                # 스마트 그룹화: 우선순위 기반으로 정리
                return cls._smart_group_anomalies(all_anomalies)
            
            return None
            
        except Exception as e:
            logger.error(f"이상탐지 실행 중 오류: {e}")
            return None
    
    @classmethod
    def _detect_negative_stock(cls, inventory, fish_type):
        """마이너스 재고 탐지"""
        if inventory.stock_quantity < 0:
            return {
                'type': '마이너스 재고',
                'severity': 'CRITICAL',
                'description': f"재고가 0보다 적습니다. 바로 확인해주세요. (예: {fish_type.name} {inventory.stock_quantity}{inventory.unit})",
                'recommended_action': '즉시 재고 수량을 확인하고 수정해주세요.',
                'anomaly_score': 1.0
            }
        return None
    
    @classmethod
    def _detect_sudden_change(cls, inventory_log, inventory, fish_type):
        """급격한 재고 변동 탐지"""
        if inventory_log.before_quantity <= 0:
            return None
        
        # 소량 컷 적용
        unit = inventory.unit
        if unit in cls.SMALL_QUANTITY_CUTS:
            if abs(inventory_log.change) < cls.SMALL_QUANTITY_CUTS[unit]:
                return None
        
        # 변동률 계산
        change_rate = abs(inventory_log.change) / inventory_log.before_quantity
        
        # 경매 시간 확인
        current_hour = inventory_log.created_at.hour
        is_auction_time = cls.AUCTION_START_HOUR <= current_hour <= cls.AUCTION_END_HOUR
        
        # 심각도 결정
        if change_rate >= 0.8:  # 80% 이상
            severity = 'MEDIUM' if is_auction_time else 'HIGH'
        elif change_rate >= 0.5:  # 50% 이상
            severity = 'MEDIUM'
        else:
            return None
        
        # 단위별 소수점 제거
        before_qty = cls._format_quantity(inventory_log.before_quantity, unit)
        after_qty = cls._format_quantity(inventory_log.after_quantity, unit)
        
        return {
            'type': '급격한 재고 변동',
            'severity': severity,
            'description': f"재고가 크게 변했습니다. (이전 {before_qty}{unit} → 현재 {after_qty}{unit})",
            'recommended_action': '재고 변동 사유를 확인하고 필요시 실사를 진행해주세요.',
            'anomaly_score': 0.8 if severity == 'MEDIUM' else 0.9
        }
    
    @classmethod
    def _format_quantity(cls, quantity, unit):
        """단위별 수량 포맷팅 (소수점 제거)"""
        if unit in ['박스', '마리', '포', '개', '통', '팩']:
            return int(quantity)  # 정수로 변환
        else:
            return quantity  # kg 등은 소수점 유지
    
    @classmethod
    def _smart_group_anomalies(cls, anomalies):
        """
        이상탐지를 스마트하게 그룹화
        
        Returns:
            dict: {
                'primary': 가장 중요한 이상탐지,
                'secondary': 추가 확인사항들,
                'total_count': 전체 개수
            }
        """
        if not anomalies:
            return None
        
        # 우선순위별 정렬 (CRITICAL > HIGH > MEDIUM > LOW)
        priority_order = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        sorted_anomalies = sorted(anomalies, key=lambda x: priority_order.get(x['severity'], 0), reverse=True)
        
        # 가장 중요한 이상탐지 (최우선)
        primary_anomaly = sorted_anomalies[0]
        
        # 추가 확인사항들 (나머지)
        secondary_anomalies = sorted_anomalies[1:] if len(sorted_anomalies) > 1 else []
        
        return {
            'primary': primary_anomaly,
            'secondary': secondary_anomalies,
            'total_count': len(anomalies),
            'has_secondary': len(secondary_anomalies) > 0
        }
    
    @classmethod
    def _detect_low_stock(cls, inventory, fish_type):
        """재고 부족 탐지"""
        # 안전재고 계산 (우선순위)
        safety_stock = cls._calculate_safety_stock(inventory)
        
        if inventory.stock_quantity <= safety_stock:
            # 심각도 결정
            if inventory.stock_quantity <= safety_stock / 2:
                severity = 'HIGH'
            else:
                severity = 'MEDIUM'
            
            return {
                'type': '재고 부족',
                'severity': severity,
                'description': f"재고가 부족합니다. 안전재고 {safety_stock}{inventory.unit} 미만입니다. (현재 {inventory.stock_quantity}{inventory.unit})",
                'recommended_action': '재고를 보충하거나 실사를 진행해주세요.',
                'anomaly_score': 0.7 if severity == 'MEDIUM' else 0.8
            }
        return None
    
    @classmethod
    def _detect_duplicate_log(cls, inventory_log, inventory, fish_type):
        """중복 입력 탐지"""
        if inventory_log.type in ['in', 'out']:  # 입출고만 체크
            # 3분 이내 동일 어종 + 수량 + 단가 로그 확인
            three_minutes_ago = inventory_log.created_at - timezone.timedelta(minutes=3)
            
            duplicate_logs = InventoryLog.objects.filter(
                fish_type=fish_type,
                type=inventory_log.type,
                change=inventory_log.change,
                unit_price=inventory_log.unit_price,
                created_at__gte=three_minutes_ago,
                created_at__lt=inventory_log.created_at
            )
            
            if duplicate_logs.exists():
                        return {
            'type': '중복 입력',
            'severity': 'MEDIUM',
            'description': f"같은 입출고가 중복 기록됐습니다. 확인해주세요.",
            'recommended_action': '중복 입력 여부를 확인하고 필요시 삭제해주세요.',
            'anomaly_score': 0.6
        }
        return None
    
    @classmethod
    def _detect_price_consistency(cls, inventory_log, inventory, fish_type):
        """단가/금액 정합성 탐지"""
        if inventory_log.unit_price and inventory_log.total_amount:
            # 단가가 0 이하인 경우
            if inventory_log.unit_price <= 0:
                return {
                    'type': '단가/금액 정합성',
                    'severity': 'MEDIUM',
                    'description': f"단가/금액 계산이 맞지 않습니다. 가격 입력을 확인해주세요.",
                    'recommended_action': '단가를 올바르게 입력해주세요.',
                    'anomaly_score': 0.7
                }
            
            # 계산 정합성 확인 (±0.01 허용)
            # 음수 수량도 정상적인 재고 수정이므로 절댓값 사용
            change_quantity = abs(inventory_log.change)
            expected_total = inventory_log.unit_price * change_quantity
            
            # 총액이 0.01 이하의 차이면 정상으로 간주
            if abs(expected_total - abs(inventory_log.total_amount)) > 0.01:
                return {
                    'type': '단가/금액 정합성',
                    'severity': 'MEDIUM',
                    'description': f"단가/금액 계산이 맞지 않습니다. 가격 입력을 확인해주세요.",
                    'recommended_action': '단가와 수량을 확인하고 총액을 다시 계산해주세요.',
                    'anomaly_score': 0.7
                }
        
        return None
    
    @classmethod
    def _calculate_safety_stock(cls, inventory):
        """안전재고 계산 (우선순위 적용)"""
        # 1. 지정값
        if inventory.safety_stock_quantity:
            return inventory.safety_stock_quantity
        
        # 2. 재주문점
        if inventory.reorder_point:
            return inventory.reorder_point
        
        # 3. 단위별 기본값
        unit = inventory.unit
        if unit in cls.DEFAULT_SAFETY_STOCKS:
            default_value = cls.DEFAULT_SAFETY_STOCKS[unit]
        else:
            default_value = 20  # 기본값
        
        # 4. 현재 재고의 15% (기본값보다 작으면 기본값 적용)
        calculated_value = inventory.stock_quantity * 0.15
        return max(calculated_value, default_value)
    
    @classmethod
    def _save_anomalies(cls, anomalies, inventory_log, inventory, fish_type):
        """이상탐지 결과 저장"""
        try:
            for anomaly_data in anomalies:
                # InventoryLog 업데이트
                inventory_log.is_anomaly = True
                inventory_log.anomaly_type = anomaly_data['type']
                inventory_log.anomaly_score = anomaly_data['anomaly_score']
                inventory_log.save()
                
                # InventoryAnomaly 생성
                InventoryAnomaly.objects.create(
                    log=inventory_log,
                    inventory=inventory,
                    anomaly_type=anomaly_data['type'],
                    severity=anomaly_data['severity'],
                    confidence_score=anomaly_data['anomaly_score'],
                    description=anomaly_data['description'],
                    recommended_action=anomaly_data['recommended_action'],
                    ai_model_version='v1.0'
                )
                
                logger.warning(f"이상탐지 저장됨: {anomaly_data['type']} - {anomaly_data['severity']}")
                
        except Exception as e:
            logger.error(f"이상탐지 저장 실패: {e}")
    
    @classmethod
    def detect_inventory_check_anomaly(cls, inventory, actual_quantity, fish_type):
        """실사 차이 이상탐지"""
        try:
            system_quantity = inventory.stock_quantity
            difference = actual_quantity - system_quantity
            difference_rate = abs(difference) / system_quantity if system_quantity > 0 else 0
            
            # 허용 오차 기준 (고가 어종 ±1-2%, 저가 어종 ±5%)
            # TODO: 어종별 고가/저가 구분 로직 추가
            allowed_rate = 0.05  # 기본값 5%
            
            if difference_rate > allowed_rate:
                return {
                    'type': '실사 차이',
                    'severity': 'MEDIUM',
                    'description': f"실사 차이 발생: 시스템 {system_quantity}{inventory.unit} vs 실제 {actual_quantity}{inventory.unit} ({difference:+d}{inventory.unit}, {difference_rate:.1%})",
                    'recommended_action': '실사 결과를 확인하고 필요시 재고를 조정해주세요.',
                    'anomaly_score': 0.7
                }
            
            return None
            
        except Exception as e:
            logger.error(f"실사 차이 이상탐지 실패: {e}")
            return None
