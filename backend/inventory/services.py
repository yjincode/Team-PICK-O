from django.db import transaction
from django.utils import timezone
from django.db.models import Q, F
from decimal import Decimal
import logging

from .models import Inventory, InventoryLog, InventoryAnomaly
from fish_registry.models import FishType
from .anomaly_service import InventoryAnomalyService

logger = logging.getLogger(__name__)


class InventoryService:
    """재고 관리 서비스"""
    
    @staticmethod
    def create_inventory_log(
        inventory,
        fish_type,
        change_type,
        change_quantity,
        source_type,
        memo=None,
        unit_price=None,
        total_amount=None,
        updated_by=None
    ):
        """
        재고 로그 생성 및 이상 탐지
        
        Args:
            inventory: 재고 객체 (이미 수량이 업데이트된 상태)
            fish_type: 어종 객체
            change_type: 'in', 'out', 'adjust'
            change_quantity: 변화량 (양수)
            source_type: 'manual', 'AI', 'YOLO', 'order', 'payment'
            memo: 메모
            unit_price: 단가
            total_amount: 총액
            updated_by: 사용자
        """
        try:
            with transaction.atomic():
                # 현재 재고 수량 (이미 업데이트된 상태)
                current_quantity = inventory.stock_quantity
                
                # 수량 계산 (로그용)
                if change_type == 'in':
                    # 입고: 이전 수량 = 현재 수량 - 변화량
                    before_quantity = current_quantity - change_quantity
                    after_quantity = current_quantity
                    change = change_quantity
                elif change_type == 'out':
                    # 출고: 이전 수량 = 현재 수량 + 변화량
                    before_quantity = current_quantity + change_quantity
                    after_quantity = current_quantity
                    change = -change_quantity
                elif change_type == 'adjust':
                    # 조정: 이전 수량은 현재 수량과 동일하게 설정
                    before_quantity = current_quantity
                    after_quantity = current_quantity
                    change = 0  # 조정은 변화량이 0
                else:
                    raise ValueError(f"잘못된 변화 타입: {change_type}")
                
                # 총액이 없으면 자동 계산
                if total_amount is None and unit_price and change_quantity:
                    total_amount = unit_price * change_quantity
                
                # 재고 로그 생성
                inventory_log = InventoryLog.objects.create(
                    inventory=inventory,
                    fish_type=fish_type,
                    type=change_type,
                    change=change,
                    before_quantity=before_quantity,
                    after_quantity=after_quantity,
                    unit=inventory.unit,
                    unit_price=unit_price,
                    total_amount=total_amount,
                    source_type=source_type,
                    memo=memo,
                    updated_by=updated_by
                )
                
                # 이상 탐지 실행
                anomaly_detected = InventoryAnomalyService.detect_anomaly(
                    inventory_log, inventory, fish_type
                )
                
                if anomaly_detected:
                    logger.warning(f"이상 탐지됨: {inventory_log.id} - {anomaly_detected}")
                
                return inventory_log, anomaly_detected
                
        except Exception as e:
            logger.error(f"재고 로그 생성 실패: {e}")
            raise
    
    @staticmethod
    def process_order_stock_update(order, order_items, action='out'):
        """
        주문에 따른 재고 자동 업데이트
        
        Args:
            order: 주문 객체
            order_items: 주문 아이템 리스트
            action: 'out' (출고), 'cancel' (취소로 인한 복원)
        """
        try:
            with transaction.atomic():
                logs_created = []
                anomalies_detected = []
                
                for item in order_items:
                    # 해당 어종의 재고 찾기
                    try:
                        # item이 딕셔너리인 경우 fish_type_id로 FishType 객체 가져오기
                        if isinstance(item, dict):
                            fish_type_id = item.get('fish_type_id')
                            if not fish_type_id:
                                logger.warning(f"fish_type_id 누락: {item}")
                                continue
                            
                            from fish_registry.models import FishType
                            fish_type = FishType.objects.get(id=fish_type_id)
                            quantity = item.get('quantity', 0)
                        else:
                            # item이 모델 객체인 경우
                            fish_type = item.fish_type
                            quantity = item.quantity
                        
                        inventory = Inventory.objects.get(
                            fish_type=fish_type,
                            user_id=order.user_id
                        )
                    except (Inventory.DoesNotExist, FishType.DoesNotExist) as e:
                        logger.warning(f"재고 또는 어종 없음: {e}")
                        continue
                    
                    # 수량 계산
                    if action == 'out':
                        change_type = 'out'
                        change_quantity = quantity
                        memo = f"주문 #{order.id} 출고"
                    elif action == 'cancel':
                        change_type = 'in'
                        change_quantity = quantity
                        memo = f"주문 #{order.id} 취소로 인한 복원"
                    else:
                        continue
                    
                    # 재고 로그 생성 (수정된 메서드 사용)
                    log, anomaly = InventoryService.create_inventory_log(
                        inventory=inventory,
                        fish_type=fish_type,
                        change_type=change_type,
                        change_quantity=change_quantity,
                        source_type='order',
                        memo=memo,
                        updated_by=order.user_id
                    )
                    
                    logs_created.append(log)
                    if anomaly:
                        anomalies_detected.append(anomaly)
                
                return logs_created, anomalies_detected
                
        except Exception as e:
            logger.error(f"주문 재고 업데이트 실패: {e}")
            raise






