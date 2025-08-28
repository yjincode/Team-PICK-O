# 🎯 예측 API 문서

## 📋 개요

이 API는 노량진 경매 데이터와 환경 데이터를 기반으로 학습된 머신러닝 모델을 사용하여 어종별 가격을 예측합니다.

## 🐟 지원하는 어종

- `(활)우럭` (rockfish)
- `(활)넙치` (flounder)
- `(활)참숭어` (mullet)
- `(활)참돔` (red_sea_bream)
- `(활)농어` (sea_bass)

## 🚀 API 엔드포인트

### 1. 헬스 체크
```
GET /api/v1/prediction/health/
```

**응답 예시:**
```json
{
  "success": true,
  "status": "healthy",
  "loaded_species": ["(활)우럭", "(활)넙치", "(활)참숭어", "(활)참돔", "(활)농어"],
  "total_species": 5,
  "model_directory": "/path/to/final_models"
}
```

### 2. 지원하는 어종 목록
```
GET /api/v1/prediction/species/
```

**응답 예시:**
```json
{
  "success": true,
  "supported_species": [
    {
      "korean_name": "(활)우럭",
      "english_name": "rockfish"
    },
    {
      "korean_name": "(활)넙치",
      "english_name": "flounder"
    }
  ]
}
```

### 3. 단일 어종 예측
```
POST /api/v1/prediction/single/
```

**요청 본문:**
```json
{
  "species": "(활)우럭",
  "target_date": "2024-12-01",
  "environmental_data": {
    "temperature": 15.5,
    "water_temperature": 12.3,
    "humidity": 65.0,
    "precipitation": 0.0,
    "wind_speed": 3.2,
    "pressure": 1013.2
  }
}
```

**응답 예시:**
```json
{
  "success": true,
  "prediction": {
    "species": "rockfish",
    "korean_name": "(활)우럭",
    "target_date": "2024-12-01",
    "predicted_price": 12500.50,
    "lightgbm_prediction": 12450.25,
    "xgboost_prediction": 12550.75,
    "confidence": "high"
  }
}
```

### 4. 모든 어종 예측
```
POST /api/v1/prediction/all/
```

**요청 본문:**
```json
{
  "target_date": "2024-12-01",
  "environmental_data": {
    "temperature": 15.5,
    "water_temperature": 12.3,
    "humidity": 65.0,
    "precipitation": 0.0,
    "wind_speed": 3.2,
    "pressure": 1013.2
  }
}
```

**응답 예시:**
```json
{
  "success": true,
  "target_date": "2024-12-01",
  "predictions": [
    {
      "species": "rockfish",
      "korean_name": "(활)우럭",
      "target_date": "2024-12-01",
      "predicted_price": 12500.50,
      "lightgbm_prediction": 12450.25,
      "xgboost_prediction": 12550.75,
      "confidence": "high"
    },
    {
      "species": "flounder",
      "korean_name": "(활)넙치",
      "target_date": "2024-12-01",
      "predicted_price": 18500.30,
      "lightgbm_prediction": 18450.15,
      "xgboost_prediction": 18550.45,
      "confidence": "high"
    }
  ],
  "total_species": 5
}
```

## 📊 환경 데이터 필드

| 필드명 | 타입 | 설명 | 단위 |
|--------|------|------|------|
| temperature | float | 기온 | °C |
| water_temperature | float | 수온 | °C |
| humidity | float | 습도 | % |
| precipitation | float | 강수량 | mm |
| wind_speed | float | 풍속 | m/s |
| pressure | float | 기압 | hPa |

## 🤖 모델 정보

### 사용 모델
- **LightGBM**: 그래디언트 부스팅 머신
- **XGBoost**: 익스트림 그래디언트 부스팅
- **앙상블**: LightGBM + XGBoost (50:50 비율)

### 모델 성능
- **평균 R²**: 0.816
- **검증 방법**: 짝수/홀수 날짜 분할
- **피처 수**: 31개 (깨끗한 피처만 사용)

### 신뢰도 레벨
- **high**: LightGBM과 XGBoost 예측값 차이가 1000원 미만
- **medium**: LightGBM과 XGBoost 예측값 차이가 1000원 이상

## 🧪 테스트

API 테스트를 실행하려면:

```bash
python test_prediction_api.py
```

## ⚠️ 에러 처리

### 400 Bad Request
- 필수 필드 누락
- 지원하지 않는 어종명
- 잘못된 날짜 형식

### 500 Internal Server Error
- 모델 로드 실패
- 예측 중 오류 발생

## 📝 사용 예시

### Python
```python
import requests

# 단일 어종 예측
response = requests.post(
    "http://localhost:8000/api/v1/prediction/single/",
    json={
        "species": "(활)우럭",
        "target_date": "2024-12-01",
        "environmental_data": {
            "temperature": 15.5,
            "water_temperature": 12.3,
            "humidity": 65.0,
            "precipitation": 0.0,
            "wind_speed": 3.2,
            "pressure": 1013.2
        }
    }
)

result = response.json()
print(f"예측 가격: {result['prediction']['predicted_price']}원")
```

### JavaScript
```javascript
// 단일 어종 예측
const response = await fetch('http://localhost:8000/api/v1/prediction/single/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        species: "(활)우럭",
        target_date: "2024-12-01",
        environmental_data: {
            temperature: 15.5,
            water_temperature: 12.3,
            humidity: 65.0,
            precipitation: 0.0,
            wind_speed: 3.2,
            pressure: 1013.2
        }
    })
});

const result = await response.json();
console.log(`예측 가격: ${result.prediction.predicted_price}원`);
```

## 🔧 개발 정보

- **프레임워크**: Django + Django REST Framework
- **모델 저장 위치**: `final_models/`
- **피처 엔지니어링**: 31개 깨끗한 피처 사용
- **데이터 소스**: 노량진 경매 데이터 + 환경 데이터
- **학습 기간**: 2018-2021년
- **검증 기간**: 2021년 (짝수/홀수 날짜 분할)
