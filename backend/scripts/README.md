# 🐟 넙치 질병 데이터셋 활용 가이드

AI Hub의 넙치 질병 데이터셋을 사용하여 광어 질병 분석 AI를 개발하는 가이드입니다.

## 📚 단계별 진행

### 1단계: AI Hub 계정 및 데이터 신청
```bash
# 1. AI Hub 회원가입
https://www.aihub.or.kr/join/joinForm.do

# 2. 넙치 질병 데이터셋 신청
https://www.aihub.or.kr/aihubdata/data/view.do?dataSetSn=71345

# 3. 승인 대기 (1-3일)
```

### 2단계: 데이터셋 다운로드
```bash
# 스크립트 실행
cd backend/scripts
python download_aihub_dataset.py

# 또는 수동 다운로드 후
# data/aihub_flounder/ 폴더에 압축 해제
```

### 3단계: 데이터셋 전처리
```bash
# 전처리 스크립트 실행
python process_flounder_dataset.py

# 결과:
# - data/disease_regions/: 질병별 ROI 이미지
# - data/training_data/: 훈련용 데이터셋
```

### 4단계: 질병 분류 모델 훈련
```bash
# 모델 훈련 스크립트 실행
python train_disease_classifier.py
```

## 📊 데이터셋 정보

- **총 이미지**: 107,915개
- **RGB 이미지**: 60,956개  
- **하이퍼스펙트럴**: 46,959개
- **성능**: F1-score 0.95

### 질병 타입
- 세균성 감염 (Bacterial Infection)
- 바이러스 감염 (Viral Infection)
- 기생충 감염 (Parasitic Infection)
- 피부 병변 (Skin Lesion)
- 정상 (Healthy)

## 🔧 설치 요구사항

```bash
pip install opencv-python pillow numpy pandas matplotlib tqdm requests
```

## 📁 폴더 구조

```
data/
├── aihub_flounder/          # 원본 데이터셋
│   ├── Training/
│   │   ├── RGB/
│   │   └── Hyperspectral/
│   ├── Validation/
│   └── annotations.json
├── disease_regions/         # 질병별 ROI 이미지
│   ├── bacterial_infection/
│   ├── viral_infection/
│   ├── parasitic_infection/
│   ├── skin_lesion/
│   └── healthy/
└── training_data/          # 훈련용 데이터
    ├── train/
    └── val/
```

## 🚀 다음 단계

1. **데이터 확보**: AI Hub에서 데이터셋 다운로드
2. **전처리**: 질병별 이미지 분류 및 정리
3. **모델 훈련**: CNN/Vision Transformer 훈련
4. **통합**: 기존 OpenCV 분석을 AI 모델로 교체
5. **최적화**: 실시간 추론 성능 개선

## 💡 참고사항

- 데이터셋 라이선스를 확인하고 상업적 사용 가능 여부 체크
- RGB 이미지만 사용해도 충분한 성능 확보 가능
- 하이퍼스펙트럴 데이터는 고급 분석에 활용
- 질병 타입별 데이터 불균형 고려하여 훈련