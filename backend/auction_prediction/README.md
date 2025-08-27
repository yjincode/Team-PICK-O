# 🎣 경매가 예측 시스템 (Auction Price Prediction)

## 📁 디렉토리 구조

```
auction_prediction/
├── data_collection/          # 데이터 수집 스크립트
│   ├── collect_noryangjin_weekly.py
│   └── check_data_count.py
├── data_analysis/            # 데이터 분석 스크립트
│   ├── check_noryangjin_data.py
│   ├── check_weather_data.py
│   ├── check_environmental_data.py
│   └── analyze_prediction_feasibility.py
├── dataset_creation/         # 데이터셋 생성 스크립트
│   └── create_noryangjin_dataset.py
├── models/                   # 훈련된 모델 파일들
│   └── species_models/
├── results/                  # 분석 결과 및 시각화
└── README.md
```

## 🎯 목표

5종 어류의 경매가 예측:
- (활)넙치
- (활)참돔  
- (활)농어
- (활)참숭어
- (활)우럭

## 📊 데이터 소스

### 경매 데이터
- **노량진수산시장**: 2020-2021 주별 데이터
- **형태**: Excel 파일 → Django DB 저장

### 환경 데이터
- **기상청 (KMA)**: 일별 기상 데이터 (온도, 강수량, 풍속)
- **해양수산부 (KHOA)**: 일별 수온 데이터
- **지점**: 주요 항구도시 (부산, 목포, 인천, 강릉, 포항)

## 🔄 데이터 분할 방식

1. **연도별 분할**: 2020년 훈련 / 2021년 검증
2. **일별 분할**: 홀수일 훈련 / 짝수일 검증

## 🚀 사용법

### 1. 데이터 수집
```bash
cd auction_prediction/data_collection
python collect_noryangjin_weekly.py
```

### 2. 데이터 분석
```bash
cd auction_prediction/data_analysis
python check_noryangjin_data.py
python analyze_prediction_feasibility.py
```

### 3. 데이터셋 생성
```bash
cd auction_prediction/dataset_creation
python create_noryangjin_dataset.py
```

## 📈 현재 상태

- ✅ 노량진 경매 데이터 수집 완료 (2020-2021)
- ✅ 기상 데이터 수집 완료 (2020-2021)
- ✅ 수온 데이터 수집 완료 (2020-2021)
- ✅ 데이터셋 생성 완료
- 🔄 모델 훈련 진행 중

## 📝 주요 파일 설명

- `collect_noryangjin_weekly.py`: 노량진 주별 데이터 수집
- `create_noryangjin_dataset.py`: 통합 데이터셋 생성
- `analyze_prediction_feasibility.py`: 예측 가능성 분석
- `check_*.py`: 각종 데이터 상태 확인

## 🔧 환경 설정

- Django 4.x
- Python 3.8+
- pandas, numpy, scikit-learn
- requests (API 호출용)

