"""
재고 데이터셋 관리 유틸리티
"""
import numpy as np
from django.utils import timezone
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any
import logging

from inventory.models import InventoryLog

logger = logging.getLogger(__name__)


def split_inventory_data_by_time(
    train_days: int = 60,
    val_days: int = 14,
    exclude_test: bool = True
) -> Tuple[List[InventoryLog], List[InventoryLog]]:
    """
    시간 기준으로 재고 데이터를 훈련용과 검증용으로 분리
    
    Args:
        train_days: 훈련용 데이터 기간 (일)
        val_days: 검증용 데이터 기간 (일)
        exclude_test: 테스트 데이터 제외 여부
        
    Returns:
        Tuple[List[InventoryLog], List[InventoryLog]]: (훈련용, 검증용) 데이터
    """
    try:
        # 기준일 설정
        now = timezone.now()
        train_cutoff = now - timedelta(days=train_days)
        val_cutoff = now - timedelta(days=val_days)
        
        # 기본 필터 (정상 데이터 위주)
        base_filter = {
            'type__in': ['in', 'out'],      # 입출고만
            'after_quantity__gte': 0,       # 음수 재고 제외
        }
        
        # 테스트 데이터 제외
        if exclude_test:
            base_filter['memo__isnull'] = True
        
        # 훈련용 데이터 (과거)
        training_logs = InventoryLog.objects.filter(
            created_at__gte=train_cutoff,
            created_at__lt=val_cutoff,
            **base_filter
        ).exclude(
            memo__icontains='[TEST]'
        ).order_by('created_at')
        
        # 검증용 데이터 (최근)
        validation_logs = InventoryLog.objects.filter(
            created_at__gte=val_cutoff,
            **base_filter
        ).order_by('created_at')
        
        logger.info(f"데이터 분리 완료: 훈련용 {len(training_logs)}건, 검증용 {len(validation_logs)}건")
        
        return list(training_logs), list(validation_logs)
        
    except Exception as e:
        logger.error(f"데이터 분리 실패: {e}")
        return [], []


def get_filtered_training_data(
    days: int = 60,
    min_quantity: int = 0,
    max_quantity: int = None
) -> List[InventoryLog]:
    """
    훈련용 데이터 필터링 (이상치 제거)
    
    Args:
        days: 데이터 기간 (일)
        min_quantity: 최소 수량
        max_quantity: 최대 수량
        
    Returns:
        List[InventoryLog]: 필터링된 훈련용 데이터
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # 기본 필터
        logs = InventoryLog.objects.filter(
            created_at__gte=cutoff_date,
            type__in=['in', 'out'],
            after_quantity__gte=min_quantity,
            memo__isnull=True
        ).exclude(
            memo__icontains='[TEST]'
        )
        
        # 최대 수량 제한
        if max_quantity is not None:
            logs = logs.filter(after_quantity__lte=max_quantity)
        
        # IQR 필터링 (극단값 제거)
        if logs.count() > 100:  # 충분한 데이터가 있을 때만
            logs = _apply_iqr_filter(logs)
        
        return list(logs.order_by('created_at'))
        
    except Exception as e:
        logger.error(f"훈련 데이터 필터링 실패: {e}")
        return []


def _apply_iqr_filter(logs) -> List[InventoryLog]:
    """IQR 기반 극단값 필터링"""
    try:
        # 수량 기준 IQR 계산
        quantities = [log.after_quantity for log in logs]
        q1 = np.percentile(quantities, 25)
        q3 = np.percentile(quantities, 75)
        iqr = q3 - q1
        
        # IQR 범위 내 데이터만 선택
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        filtered_logs = [
            log for log in logs 
            if lower_bound <= log.after_quantity <= upper_bound
        ]
        
        logger.info(f"IQR 필터링: {len(logs)} → {len(filtered_logs)}건")
        return filtered_logs
        
    except Exception as e:
        logger.error(f"IQR 필터링 실패: {e}")
        return list(logs)


def get_anomaly_test_data(days: int = 30) -> List[InventoryLog]:
    """
    이상탐지 테스트용 데이터 (테스트 태그가 있는 데이터)
    
    Args:
        days: 데이터 기간 (일)
        
    Returns:
        List[InventoryLog]: 테스트용 이상 데이터
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days)
        
        test_logs = InventoryLog.objects.filter(
            created_at__gte=cutoff_date,
            memo__icontains='[TEST]'
        ).order_by('created_at')
        
        logger.info(f"테스트 데이터 준비: {len(test_logs)}건")
        return list(test_logs)
        
    except Exception as e:
        logger.error(f"테스트 데이터 준비 실패: {e}")
        return []


def get_data_statistics(logs: List[InventoryLog]) -> Dict[str, Any]:
    """
    데이터 통계 정보 반환
    
    Args:
        logs: 재고 로그 리스트
        
    Returns:
        Dict: 통계 정보
    """
    try:
        if not logs:
            return {}
        
        quantities = [log.after_quantity for log in logs]
        changes = [log.change for log in logs]
        
        stats = {
            'total_count': len(logs),
            'quantity_stats': {
                'min': min(quantities),
                'max': max(quantities),
                'mean': sum(quantities) / len(quantities),
                'std': np.std(quantities) if len(quantities) > 1 else 0
            },
            'change_stats': {
                'min': min(changes),
                'max': max(changes),
                'mean': sum(changes) / len(changes),
                'std': np.std(changes) if len(changes) > 1 else 0
            },
            'type_distribution': {},
            'date_range': {
                'start': min(log.created_at for log in logs),
                'end': max(log.created_at for log in logs)
            }
        }
        
        # 타입별 분포
        for log in logs:
            log_type = log.type
            stats['type_distribution'][log_type] = stats['type_distribution'].get(log_type, 0) + 1
        
        return stats
        
    except Exception as e:
        logger.error(f"통계 계산 실패: {e}")
        return {}

