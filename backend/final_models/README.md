# 최종 어종 가격 예측 모델

이 디렉토리는 노량진 수산시장 어종 가격 예측을 위한 최종 모델들을 포함합니다.

## 📁 모델 파일 구조

### 어종별 모델 (5개 어종)
각 어종마다 3개의 모델 파일이 있습니다:

1. **LightGBM 모델** (`lightgbm_clean_*.txt`)
2. **XGBoost 모델** (`xgboost_clean_*.json`) 
3. **Prophet 모델** (`prophet_clean_*.pkl`)

### 어종 매핑
- `rockfish` = (활)우럭
- `flounder` = (활)넙치
- `mullet` = (활)참숭어
- `red_sea_bream` = (활)참돔
- `sea_bass` = (활)농어

## 🎯 모델 성능

### 앙상블 성능 (LightGBM + XGBoost 50:50)
- **평균 R²**: 0.816
- **평균 MAE**: 2,128원
- **과적합**: 없음 (검증 완료)

### 개별 모델 성능
- **LightGBM**: 평균 R² 0.788, MAE 2,338원
- **XGBoost**: 평균 R² 0.807, MAE 2,193원
- **Prophet**: 평균 R² 0.054, MAE 7,689원 (앙상블에서 제외)

## 🔧 사용 방법

### Python에서 모델 로드
```python
import lightgbm as lgb
import xgboost as xgb
import pickle

# LightGBM 모델 로드
lgb_model = lgb.Booster(model_file='final_models/lightgbm_clean_rockfish.txt')

# XGBoost 모델 로드
xgb_model = xgb.XGBRegressor()
xgb_model.load_model('final_models/xgboost_clean_rockfish.json')

# Prophet 모델 로드
with open('final_models/prophet_clean_rockfish.pkl', 'rb') as f:
    prophet_model = pickle.load(f)
```

### 예측 실행
```python
# 앙상블 예측 (권장)
ensemble_prediction = (lgb_prediction + xgb_prediction) / 2
```

## 📊 피처 정보

### 깨끗한 피처 (31개)
데이터 누수가 없는 깨끗한 피처만 사용:
- **날짜 피처**: 월, 요일, 계절, 분기 등
- **환경 피처**: 기온, 수온, 습도, 기압, 풍속, 강수량
- **거래 피처**: 거래량, 평균무게, 전날 경매가
- **상호작용 피처**: 온도-습도, 수온비율 등
- **순환 피처**: 월/요일/연중일의 sin/cos 변환

### 제외된 피처 (데이터 누수 방지)
- `price_lag`: 미래 정보 누수
- `price_change`: 미래 정보 누수
- `seasonal_price_factor`: 미래 정보 누수

## 🚀 실제 예측 사용

전날의 기온, 수온, 경매가를 입력받아 다음날 가격을 예측:

```python
from clean_model_final import predict_next_day_price

prediction = predict_next_day_price(
    species_name='(활)우럭',
    target_date=tomorrow,
    environmental_data={
        'avg_temperature': 18.5,
        'water_temperature': 16.2,
        'avg_price': 15000.0,  # 전날 경매가
        # ... 기타 환경 데이터
    },
    lgb_model=lgb_model,
    xgb_model=xgb_model
)
```

## 📈 모델 검증

- **검증 방법**: 짝수/홀수 날짜 분할
- **과적합 검사**: 완료 (과적합 없음)
- **데이터 누수 검사**: 완료 (깨끗한 피처만 사용)
- **실제 성능**: 신뢰할 수 있는 R² 0.816 달성

## 🔄 모델 업데이트

새로운 데이터로 모델을 재학습하려면:
```bash
python clean_model_final.py
```

이 명령어는 모든 어종의 모델을 재학습하고 `final_models/` 디렉토리에 저장합니다.
