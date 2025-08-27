"""
규격 표준화 매핑 로직 모듈
원본 규격명을 표준 등급(tier_code)으로 변환하는 함수들을 제공합니다.
"""

import re
from typing import Optional, Tuple
from .models import FishWeightTier, SizeStandardMapping


def extract_mi_number(standard: str) -> Optional[float]:
    """
    규격 문자열에서 '미' 숫자를 추출합니다.
    
    Args:
        standard (str): 규격 문자열 (예: "3미", "3/4미", "10/15미", "60/80")
    
    Returns:
        Optional[float]: 추출된 숫자, 실패 시 None
    """
    if not standard:
        return None
    
    # "미" 제거 후 숫자 추출
    clean_standard = standard.replace('미', '')
    
    # 단일 숫자 패턴 (예: "3", "10")
    single_match = re.match(r'^(\d+)$', clean_standard)
    if single_match:
        return int(single_match.group(1))
    
    # 분수 패턴 (예: "3/4", "1/2")
    fraction_match = re.match(r'^(\d+)/(\d+)$', clean_standard)
    if fraction_match:
        num1 = int(fraction_match.group(1))
        num2 = int(fraction_match.group(2))
        if num2 != 0:
            return num1 / num2  # 분수값 반환
    
    return None


def calculate_mi_weight(mi_number: float) -> float:
    """
    미 숫자를 기반으로 평균 무게를 계산합니다.
    
    Args:
        mi_number (float): '미' 숫자 (1kg에 몇 마리인지)
    
    Returns:
        float: 평균 무게 (kg)
    """
    if mi_number <= 0:
        return 0.0
    
    # 1kg에 mi_number마리 = 1마리당 1/mi_number kg
    weight_per_fish = 1.0 / mi_number
    return weight_per_fish


def determine_tier_by_mi_number(mi_number: float) -> str:
    """
    '미' 숫자를 기반으로 등급을 결정합니다.
    
    Args:
        mi_number (float): '미' 숫자 (1kg에 몇 마리인지)
    
    Returns:
        str: 등급 코드
    """
    # 미 숫자가 클수록 마리가 작음 (1미=1kg/마리, 10미=0.1kg/마리)
    # 등급 순서: XS(0.2kg) < S(0.4kg) < M(0.8kg) < L(1.5kg) < XL(2.5kg) < XXL(3.5kg)
    
    # 1미 = 1kg/마리, 5미 = 0.2kg/마리, 10미 = 0.1kg/마리
    if mi_number <= 1:
        return 'FWT_L'    # 1미급 (1kg/마리, 큰 마리)
    elif mi_number <= 2:
        return 'FWT_M'    # 2미급 (0.5kg/마리)
    elif mi_number <= 5:
        return 'FWT_S'    # 3-5미급 (0.2-0.33kg/마리)
    elif mi_number <= 10:
        return 'FWT_XS'   # 6-10미급 (0.1-0.17kg/마리, 작은 마리)
    elif mi_number <= 20:
        return 'FWT_XS'   # 11-20미급 (0.05-0.09kg/마리, 매우 작은 마리)
    else:
        return 'FWT_XS'   # 20미 이상 (0.05kg/마리 이하, 가장 작은 마리)


def map_kg_standard_to_tier(standard: str) -> Tuple[Optional[str], Optional[float], str]:
    """
    kg 단위 규격을 표준 등급으로 매핑합니다.
    
    Args:
        standard (str): kg 단위 규격명 (예: "1kg", "5kg 대", "10kg 상자")
    
    Returns:
        Tuple[Optional[str], Optional[float], str]: (등급코드, 평균무게, 처리로직)
    """
    if not standard:
        return None, None, "규격명이 비어있음"
    
    # kg 단위 매핑 규칙
    kg_mappings = {
        (0, 0.5): ('FWT_XS', 0.25),
        (0.5, 1): ('FWT_S', 0.75),
        (1, 2): ('FWT_M', 1.5),
        (2, 4): ('FWT_L', 3.0),
        (4, 8): ('FWT_XL', 6.0),
        (8, float('inf')): ('FWT_XXL', 10.0)
    }
    
    # 숫자 추출 (소수점 포함)
    numbers = re.findall(r'(\d+(?:\.\d+)?)', standard)
    if not numbers:
        return None, None, f"kg 단위 숫자를 찾을 수 없음: {standard}"
    
    try:
        weight = float(numbers[0])
        
        # 매핑 규칙 적용
        for (min_kg, max_kg), (tier_code, avg_weight) in kg_mappings.items():
            if min_kg <= weight < max_kg:
                logic = f"kg 단위 매핑: {standard} -> {weight}kg -> {tier_code}"
                return tier_code, avg_weight, logic
        
        # 범위를 벗어난 경우
        return None, None, f"kg 범위를 벗어남: {weight}kg"
        
    except ValueError:
        return None, None, f"kg 단위 변환 실패: {standard}"


def map_standard_to_tier(standard: str) -> Tuple[Optional[str], Optional[float], str]:
    """
    원본 규격을 표준 등급으로 매핑합니다.
    
    Args:
        standard (str): 원본 규격명
    
    Returns:
        Tuple[Optional[str], Optional[float], str]: (등급코드, 평균무게, 처리로직)
    """
    if not standard:
        return None, None, "규격명이 비어있음"
    
    # 1. '미' 규격 처리 (우선 처리)
    mi_number = extract_mi_number(standard)
    if mi_number is not None:
        tier_code = determine_tier_by_mi_number(mi_number)
        avg_weight = calculate_mi_weight(mi_number)
        try:
            tier = FishWeightTier.objects.get(tier_code=tier_code)
            logic = f"미 규격 자동 매핑: {standard} -> {mi_number}미 -> {tier_code} ({avg_weight:.3f}kg/마리)"
            return tier_code, avg_weight, logic
        except FishWeightTier.DoesNotExist:
            return None, None, f"등급 없음: {tier_code}"
    
    # 2. 매핑 테이블에서 직접 매칭
    try:
        mapping = SizeStandardMapping.objects.get(raw_label=standard)
        tier = mapping.tier_code
        return tier.tier_code, tier.avg_weight_kg, f"매핑 테이블: {mapping.processing_logic}"
    except SizeStandardMapping.DoesNotExist:
        pass
    
    # 3. kg 단위 규격 처리
    if 'kg' in standard.lower() or any(char.isdigit() for char in standard):
        tier_code, avg_weight, logic = map_kg_standard_to_tier(standard)
        if tier_code is not None:
            try:
                tier = FishWeightTier.objects.get(tier_code=tier_code)
                return tier_code, avg_weight, logic
            except FishWeightTier.DoesNotExist:
                return None, None, f"등급 없음: {tier_code}"
    
    # 4. 기본값 (매핑 실패)
    return None, None, f"매핑 실패: {standard}"


def batch_map_standards(standards: list) -> dict:
    """
    여러 규격을 일괄 매핑합니다.
    
    Args:
        standards (list): 규격명 리스트
    
    Returns:
        dict: 매핑 결과 딕셔너리
    """
    results = {}
    
    for standard in standards:
        tier_code, avg_weight, logic = map_standard_to_tier(standard)
        results[standard] = {
            'tier_code': tier_code,
            'avg_weight_kg': avg_weight,
            'processing_logic': logic,
            'success': tier_code is not None
        }
    
    return results


def get_mapping_statistics() -> dict:
    """
    매핑 통계를 반환합니다.
    
    Returns:
        dict: 매핑 통계 정보
    """
    total_tiers = FishWeightTier.objects.count()
    total_mappings = SizeStandardMapping.objects.count()
    
    # 등급별 매핑 수
    tier_counts = {}
    for tier in FishWeightTier.objects.all():
        count = SizeStandardMapping.objects.filter(tier_code=tier).count()
        tier_counts[tier.tier_code] = count
    
    return {
        'total_tiers': total_tiers,
        'total_mappings': total_mappings,
        'tier_counts': tier_counts
    }


def validate_mapping_coverage(standards: list) -> dict:
    """
    주어진 규격 리스트의 매핑 커버리지를 검증합니다.
    
    Args:
        standards (list): 검증할 규격명 리스트
    
    Returns:
        dict: 검증 결과
    """
    results = batch_map_standards(standards)
    
    total = len(standards)
    successful = sum(1 for result in results.values() if result['success'])
    failed = total - successful
    
    failed_standards = [
        standard for standard, result in results.items() 
        if not result['success']
    ]
    
    return {
        'total': total,
        'successful': successful,
        'failed': failed,
        'coverage_rate': (successful / total * 100) if total > 0 else 0,
        'failed_standards': failed_standards,
        'results': results
    }


# 테스트 함수
def test_mapping_functions():
    """매핑 함수들을 테스트합니다."""
    print("🧪 매핑 함수 테스트")
    print("="*50)
    
    # 테스트 케이스
    test_standards = [
        # 기존 규격
        '소', '중', '대', '특대', '파치', '바라',
        # 단일 미 규격
        '1미', '3미', '5미', '10미', '20미', '40미',
        # 범위 미 규격
        '1/2미', '3/4미', '5/6미', '10/11미', '15/20미', '20/30미', '60/80',
        # kg 단위 규격
        '1kg', '5kg', '10kg', '1kg 대', '5kg 상자', '10.5kg', '6.5kg',
        # 특수 케이스
        '', '없는규격', '123미', '미/미', 'kg'
    ]
    
    # 매핑 테스트
    results = batch_map_standards(test_standards)
    
    print("📋 매핑 결과:")
    for standard, result in results.items():
        status = "✅" if result['success'] else "❌"
        tier_info = f" → {result['tier_code']} ({result['avg_weight_kg']}kg)" if result['success'] else ""
        print(f"{status} {standard}{tier_info}")
        if not result['success']:
            print(f"    └─ {result['processing_logic']}")
    
    # 통계 출력
    stats = get_mapping_statistics()
    print(f"\n📊 매핑 통계:")
    print(f"   총 등급 수: {stats['total_tiers']}")
    print(f"   총 매핑 규칙 수: {stats['total_mappings']}")
    print(f"   등급별 매핑 수: {stats['tier_counts']}")
    
    # 커버리지 검증
    coverage = validate_mapping_coverage(test_standards)
    print(f"\n📈 커버리지 검증:")
    print(f"   총 테스트: {coverage['total']}개")
    print(f"   성공: {coverage['successful']}개")
    print(f"   실패: {coverage['failed']}개")
    print(f"   커버리지: {coverage['coverage_rate']:.1f}%")


if __name__ == "__main__":
    # Django 설정이 필요한 경우 여기서 설정
    import os
    import sys
    import django
    
    # Django 설정
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    
    # 테스트 실행
    test_mapping_functions()
