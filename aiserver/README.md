# Fish Disease Analysis AI Server

FastAPI 기반 어류 질병 분석 AI 서버

## 🚀 기능

- **YOLO11**: 어류 증상 탐지 (바운딩박스)
- **VGG16**: 질병 분류 및 심각도 판정
- **통합 분석**: 증상 탐지 → 영역 크롭 → 질병 분류 파이프라인
- **건강 상태**: 전체 건강 상태 평가 (상/중/하)
- **🆕 LLM 텍스트 파싱**: Phi-3 Mini 기반 수산물 주문 텍스트 구조화

## 📋 요구사항

### Python 패키지
```bash
pip install -r requirements.txt
```

### 🤖 LLM 텍스트 파싱 (로컬 개발용)
```bash
# 자동 설정 스크립트 실행 (권장)
./setup_local_llm.sh

# 또는 수동 설정
# 1. Ollama 설치
curl -fsSL https://ollama.com/install.sh | sh

# 2. Ollama 서비스 시작
ollama serve &

# 3. Phi-3 Mini 모델 다운로드 (2.3GB)
ollama pull phi3:mini
```

> 📚 **자세한 LLM 설정 가이드**: [README_LLM.md](./README_LLM.md) 참조

### 주요 의존성
- **FastAPI**: 웹 API 프레임워크
- **ultralytics>=8.3.185**: YOLO11 C3k2 모듈 지원
- **tensorflow==2.15.0**: VGG16 모델
- **opencv-python**: 이미지 처리

## 🗂️ 프로젝트 구조

```
aiserver/
├── main.py                    # FastAPI 애플리케이션 진입점
├── requirements.txt           # Python 의존성
├── .env                      # 환경 변수
├── app/
│   ├── api/
│   │   └── analysis.py       # API 엔드포인트
│   ├── models/
│   │   └── schemas.py        # Pydantic 데이터 모델
│   └── services/
│       ├── analysis_service.py   # 통합 분석 서비스
│       ├── yolo_service.py       # YOLO11 서비스
│       └── vgg_service.py        # VGG16 서비스
├── models/
│   ├── yolo11/
│   │   └── best.pt          # YOLO11 모델 파일
│   └── vgg16/
│       ├── best_model.h5    # VGG16 모델 파일
│       └── classes.json     # 질병 클래스 정보
└── uploads/                 # 임시 업로드 폴더
```

## 🚦 실행

### macOS / Linux
```bash
# 1. 가상환경 생성 및 활성화
cd aiserver
python -m venv venv
source venv/bin/activate

# 2. pip 업그레이드
pip install --upgrade pip

# 3. 패키지 설치
pip install -r requirements.txt

# 4. 서버 실행
python main.py
```

### Windows
```cmd
# 1. 가상환경 생성 및 활성화
cd aiserver
python -m venv venv
venv\Scripts\activate

# 2. pip 업그레이드
pip install --upgrade pip

# 3. 패키지 설치
pip install -r requirements.txt

# 4. 서버 실행
python main.py
```

서버 실행 후:
- **API 서버**: http://localhost:8001
- **API 문서**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## 📡 API 엔드포인트

### 1. 이미지 분석
```bash
POST /api/v1/analysis/predict
Content-Type: multipart/form-data

# 예시
curl -X POST "http://localhost:8001/api/v1/analysis/predict" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "image=@fish_image.jpg"
```

### 2. 서비스 상태 확인
```bash
GET /api/v1/analysis/status
```

### 3. 모델 정보 조회
```bash
GET /api/v1/analysis/models/info
```

### 4. 모델 재로드
```bash
POST /api/v1/analysis/models/reload
```

## 📊 응답 예시

### 성공적인 분석 결과
```json
{
  "success": true,
  "message": "어류 질병 분석이 완료되었습니다.",
  "overall_health_status": "fair",
  "total_detections": 2,
  "yolo_confidence_avg": 0.85,
  "detections": [
    {
      "bbox": {
        "x": 0.2,
        "y": 0.3,
        "width": 0.4,
        "height": 0.3
      },
      "yolo_confidence": 0.87,
      "disease": {
        "class": "fin_rot",
        "name_ko": "지느러미 부패병",
        "name_en": "Fin Rot",
        "confidence": 0.92,
        "severity": "moderate",
        "description": "지느러미가 썩어가는 세균성 질병",
        "symptoms": "지느러미 끝이 하얗게 변하며 서서히 썩어감",
        "treatment": "항생제 투여, 수질 개선",
        "prevention": "깨끗한 수질 유지, 스트레스 최소화"
      }
    }
  ]
}
```

### 호환성 문제 오류
```json
{
  "success": false,
  "message": "YOLO11 모델 호환성 문제: 버전 8.0.206은 YOLO11을 지원하지 않음",
  "error_type": "compatibility_error",
  "solution": {
    "steps": [
      "pip install --upgrade ultralytics",
      "AI 서버 재시작",
      "최신 YOLO11 모델 파일 사용"
    ],
    "technical_details": "C3k2 모듈을 지원하는 ultralytics>=8.3.11 버전이 필요합니다."
  }
}
```

## 🔧 환경 변수

```env
# 서버 설정
AI_SERVER_PORT=8001
AI_SERVER_HOST=0.0.0.0

# 모델 경로
YOLO11_MODEL_PATH=./models/yolo11/best.pt
VGG16_MODEL_PATH=./models/vgg16/best_model.h5

# 업로드 설정
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_EXTENSIONS=jpg,jpeg,png,bmp

# 로그 설정
LOG_LEVEL=INFO
```

## 🐳 Docker (선택사항)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["python", "main.py"]
```

## 🔍 문제 해결

### YOLO11 C3k2 오류
```bash
# ultralytics 업그레이드
pip install --upgrade ultralytics

# 서버 재시작
python main.py
```

### TensorFlow 오류
```bash
# TensorFlow 재설치
pip uninstall tensorflow
pip install tensorflow==2.15.0
```

### 모델 파일 없음
1. `models/yolo11/best.pt` - 학습된 YOLO11 모델 파일
2. `models/vgg16/best_model.h5` - 학습된 VGG16 모델 파일

## 🔗 기존 Django 백엔드와 연동

Django 백엔드에서 AI 서버 호출:
```python
import httpx

async def call_ai_server(image_file):
    async with httpx.AsyncClient() as client:
        files = {"image": image_file}
        response = await client.post(
            "http://localhost:8001/api/v1/analysis/predict",
            files=files
        )
        return response.json()
```

## 📝 로그

로그는 `loguru`를 사용하여 콘솔에 출력됩니다.
로그 레벨은 `.env` 파일의 `LOG_LEVEL`로 설정 가능합니다.

v0.12