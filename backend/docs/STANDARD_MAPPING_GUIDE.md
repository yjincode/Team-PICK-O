# 수산물 규격 표준화 시스템 가이드

## 📋 개요

Team-PICK-O 프로젝트에서는 노량진 수산시장의 다양한 규격 표기를 표준화하여 일관된 데이터 분석과 모델 학습을 가능하게 합니다.

## 🎯 배경 및 목적

### 문제점
- 노량진 수산시장의 규격 표기가 시기별로 변화
- **2024년 12월 11일 이전**: "소", "중", "대" 표기
- **2024년 12월 11일 이후**: "1미", "3/4미", "5미", "2kg", "3kg" 등 다양한 표기
- 일관성 없는 규격으로 인한 데이터 분석 어려움

### 해결 방안
- 모든 규격을 8개의 표준 등급으로 통일
- 각 등급별 평균 무게(kg) 정의
- 자동 매핑 시스템 구축

## 🏷️ 표준 등급 체계

### FishWeightTier (어류 무게 등급)

| 등급 코드 | 등급명 | 평균 무게(kg) | 설명 |
|-----------|--------|---------------|------|
| FWT_XS | 특소 | 0.2kg | 가장 작은 마리 |
| FWT_S | 소 | 0.4kg | 작은 마리 |
| FWT_Q_LOW | 품질 이슈 | 0.5kg | 품질 문제가 있는 상품 |
| FWT_Q_MIX | 혼합/비선별 | 0.7kg | 크기가 섞인 상품 |
| FWT_M | 중 | 0.8kg | 중간 마리 (가장 일반적) |
| FWT_L | 대 | 1.5kg | 큰 마리 |
| FWT_XL | 특대 | 2.5kg | 매우 큰 마리 |
| FWT_XXL | 특대+ | 3.5kg | 최대 마리 |

## 🔄 매핑 규칙

### 1. 미(尾) 규격 자동 매핑

**미 규격의 의미**: 1kg에 들어가는 마리 수
- `1미` = 1kg에 1마리 = 1kg/마리
- `5미` = 1kg에 5마리 = 0.2kg/마리
- `10미` = 1kg에 10마리 = 0.1kg/마리

**매핑 규칙**:
```
미 숫자 → 등급 코드
≤ 1미    → FWT_L    (1kg/마리, 큰 마리)
≤ 2미    → FWT_M    (0.5kg/마리)
≤ 5미    → FWT_S    (0.2-0.33kg/마리)
≤ 10미   → FWT_XS   (0.1-0.17kg/마리, 작은 마리)
> 10미   → FWT_XS   (0.1kg/마리 이하, 가장 작은 마리)
```

**분수 미 규격 처리**:
- `3/4미` = 0.75미 → 1.33kg/마리 → `FWT_L`
- `1/2미` = 0.5미 → 2kg/마리 → `FWT_L`

### 2. kg 단위 규격 자동 매핑

**매핑 규칙**:
```
무게 범위 → 등급 코드
0-0.5kg   → FWT_XS   (0.25kg)
0.5-1kg   → FWT_S    (0.75kg)
1-2kg     → FWT_M    (1.5kg)
2-4kg     → FWT_L    (3.0kg)
4-8kg     → FWT_XL   (6.0kg)
8kg+      → FWT_XXL  (10.0kg)
```

### 3. 기존 규격 매핑 테이블

120개의 기존 규격이 `SizeStandardMapping` 테이블에 사전 정의됨:
- "소", "중", "대" 규격
- "특소", "특대" 규격
- "전체", "혼합" 규격
- 기타 특수 규격들

## 💻 기술 구현

### 핵심 모듈: `prediction/standard_mapping.py`

#### 주요 함수들

```python
def extract_mi_number(standard: str) -> Optional[float]:
    """미 규격에서 숫자 추출 (분수 포함)"""

def calculate_mi_weight(mi_number: float) -> float:
    """미 숫자를 실제 무게로 변환"""

def determine_tier_by_mi_number(mi_number: float) -> str:
    """미 숫자를 등급 코드로 매핑"""

def map_kg_standard_to_tier(standard: str) -> Tuple[Optional[str], Optional[float], str]:
    """kg 단위 규격을 등급으로 매핑"""

def map_standard_to_tier(standard: str) -> Tuple[Optional[str], Optional[float], str]:
    """통합 매핑 함수 (모든 규격 처리)"""
```

#### 매핑 우선순위

1. **미 규격 자동 매핑** (최우선)
2. 매핑 테이블 직접 매칭
3. kg 단위 자동 매핑
4. 매핑 실패

### 데이터베이스 스키마

#### FishAuctionData 모델 확장
```python
class FishAuctionData(models.Model):
    # ... 기존 필드들 ...
    
    # 새로 추가된 표준화 필드
    tier_code = models.ForeignKey(FishWeightTier, on_delete=models.SET_NULL, null=True, blank=True)
    avg_weight_kg = models.FloatField(null=True, blank=True)
```

## 📊 매핑 성과

### 변환 결과 (2025-08-19 기준)
- **총 데이터**: 15,889건
- **매핑 성공률**: 100% (매핑 실패 0건)
- **표준화된 데이터**: 11,889건

### 등급별 분포
```
FWT_XS (0.2kg): 1,560건 (13.1%) - 가장 작은 마리
FWT_S (0.4kg):  1,842건 (15.5%) - 작은 마리
FWT_M (0.8kg):  5,907건 (49.7%) - 중간 마리 (가장 많음)
FWT_L (1.5kg):  2,540건 (21.4%) - 큰 마리
FWT_XL (2.5kg):    13건 (0.1%)  - 특대 마리
FWT_XXL (3.5kg):   19건 (0.2%)  - 최대 마리
기타:              8건 (0.1%)   - 품질/혼합 등급
```

## 🔧 사용법

### 새로운 데이터 수집 시 자동 적용
```python
# collect_noryangjin_daily_quantity.py에서 자동 실행
from prediction.standard_mapping import map_standard_to_tier

tier_code, avg_weight_kg, logic = map_standard_to_tier(standard)
```

### 기존 데이터 재변환
```python
# 기존 데이터를 새로운 매핑으로 재변환
python convert_existing_data.py
```

### 매핑 테스트
```python
from prediction.standard_mapping import map_standard_to_tier

# 테스트 예시
tier_code, weight, logic = map_standard_to_tier("5미")
# 결과: ('FWT_S', 0.2, '미 규격 자동 매핑: 5미 -> 5미 -> FWT_S (0.200kg/마리)')
```

## 📈 모델 학습 활용

### 새로운 피처
- `tier_code`: 표준화된 등급 (카테고리 변수)
- `avg_weight_kg`: 표준화된 무게 (연속 변수)

### 예상 성능 개선
- 일관된 규격으로 인한 노이즈 감소
- 무게 정보 추가로 더 정확한 예측
- 등급별 세분화된 분석 가능

## 🚨 주의사항

### 환경별 설정
- **로컬 개발**: SQLite/PostgreSQL 로컬 DB
- **팀 프로덕션**: 팀 공용 DB
- 환경 전환 시 경로 및 DB 설정 확인 필요

### 데이터 일관성
- 2024-12-11 이전/이후 데이터 모두 표준화됨
- 미 규격 계산 로직 검증 완료 (1미=1kg/마리, 5미=0.2kg/마리)
- 매핑 실패율 0% 달성

## 🔍 문제 해결

### 매핑 확인
```python
from prediction.standard_mapping import get_mapping_statistics
stats = get_mapping_statistics()
```

### 매핑 실패 분석
```python
from prediction.standard_mapping import validate_mapping_coverage
coverage = validate_mapping_coverage(standards_list)
```

---

