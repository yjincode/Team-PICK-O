# AI 모델 디렉토리

이 디렉토리는 광어 질병 분석을 위한 AI 모델들을 저장합니다.

## 필요한 모델들

### 1. YOLO 광어 탐지 모델
- **현재**: `yolov8n.pt` (일반 YOLO 모델, 'fish' 클래스 사용)
- **권장**: 광어 전용 훈련 모델
- **경로**: `models/flounder_detection.pt`
- **데이터셋**: 광어 이미지로 훈련된 YOLO 데이터셋

### 2. 질병 분류 모델 (선택사항)
- **현재**: OpenCV 기반 이미지 처리 사용
- **권장**: 광어 질병 분류 모델 (CNN/Vision Transformer)
- **경로**: `models/flounder_disease_classifier.pt`
- **데이터셋**: 광어 질병 이미지 데이터셋

## 모델 다운로드 방법

### YOLO 모델
```bash
# 기본 YOLO 모델 (자동 다운로드)
wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt

# 광어 전용 모델이 있다면
# wget https://your-model-url/flounder_detection.pt
```

### 데이터셋 추천

1. **광어 탐지용**: 
   - Open Images Dataset (fish 카테고리)
   - 수산업 관련 공개 데이터셋
   - 직접 수집한 광어 이미지

2. **질병 분류용**:
   - 어류 질병 분류 데이터셋
   - 수산 연구소 협력 데이터
   - 병변이 있는/없는 광어 이미지 쌍

## 환경 변수 설정

`.env` 파일에 모델 경로 설정:
```env
# YOLO 모델 경로
YOLO_MODEL_PATH=models/flounder_detection.pt

# 질병 분류 모델 (Hugging Face 형식)
HF_DISEASE_MODEL=your-username/flounder-disease-classifier

# 신뢰도 임계값
CONFIDENCE_THRESHOLD=0.6
```

## 성능 최적화

1. **GPU 사용**: CUDA 설치 시 자동으로 GPU 사용
2. **모델 크기**: YOLOv8n (nano) → YOLOv8s (small) → YOLOv8m (medium)
3. **배치 처리**: 여러 이미지 동시 처리 지원

## 현재 구현 상태

✅ YOLO 모델 통합 (기본 모델 사용)  
✅ OpenCV 기반 질병 탐지  
✅ 실시간 이미지 분석  
✅ Base64 결과 이미지 반환  
⏳ 광어 전용 YOLO 모델  
⏳ 딥러닝 기반 질병 분류 모델  