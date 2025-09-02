# AI Server LLM 텍스트 파싱 설정 가이드

## 🎯 개요
AI Server에 Phi-3 Mini 기반 LLM 텍스트 파싱 기능이 추가되었습니다.

## 🚀 로컬 개발 환경 설정

### 1. Ollama 설치

#### **macOS**
```bash
# Homebrew로 설치 (권장)



# 또는 공식 설치 스크립트
curl -fsSL https://ollama.com/install.sh | sh
```

#### **Linux**
```bash
# 공식 설치 스크립트
curl -fsSL https://ollama.com/install.sh | sh
```

#### **Windows**
1. [Ollama 공식 사이트](https://ollama.com/download)에서 Windows 설치 파일 다운로드
2. 설치 후 PowerShell에서 `ollama` 명령어 확인

### 2. Ollama 서비스 시작
```bash
# 백그라운드에서 Ollama 서비스 시작
ollama serve

# 또는 새 터미널에서
ollama serve &
```

### 3. Phi-3 Mini 모델 다운로드
```bash
# Phi-3 Mini 모델 다운로드 (2.3GB)
ollama pull phi3:mini

# 설치 확인
ollama list
```

### 4. AI Server 시작
```bash
cd aiserver
python main.py
```

## 🐳 배포 환경 (Docker)

Docker 환경에서는 자동으로 설정됩니다:

```bash
# Docker Compose로 실행
docker-compose up aiserver

# 또는 개별 빌드
docker build -t aiserver .
docker run -p 8001:8001 aiserver
```

## 🔍 테스트

### 1. 헬스체크
```bash
curl http://localhost:8001/api/v1/text/health
```

### 2. 텍스트 파싱 테스트
```bash
curl -X POST http://localhost:8001/api/v1/text/parse-text \
  -H "Content-Type: application/json" \
  -d '{"text": "바다수산에 광어 10kg, 우럭 5마리 내일까지 주문해줘"}'
```

### 예상 응답:
```json
{
  "success": true,
  "data": {
    "business_name": "바다수산",
    "items": [
      {
        "fish_name": "광어",
        "quantity": 10,
        "unit": "kg",
        "unit_price": 0
      },
      {
        "fish_name": "우럭",
        "quantity": 5,
        "unit": "마리",
        "unit_price": 0
      }
    ],
    "delivery_date": "2024-01-XX",
    "memo": "",
    "source_type": "llm"
  },
  "message": "텍스트 파싱이 완료되었습니다."
}
```

## 🔧 문제 해결

### Ollama 연결 실패 시
1. Ollama 서비스가 실행 중인지 확인: `ps aux | grep ollama`
2. 포트 11434가 사용 중인지 확인: `lsof -i :11434`
3. 방화벽 설정 확인

### 모델 다운로드 실패 시
1. 네트워크 연결 확인
2. 디스크 용량 확인 (최소 3GB 필요)
3. 재시도: `ollama pull phi3:mini`

### Fallback 동작
LLM이 실패하면 자동으로 정규식 파싱으로 전환됩니다:
```json
{
  "success": true,
  "data": {
    "memo": "LLM 파싱 실패 - 정규식 fallback",
    "source_type": "regex_fallback"
  }
}
```

## 📊 성능 비교

| 방식 | 정확도 | 속도 | 자연어 처리 |
|------|--------|------|-------------|
| LLM (Phi-3 Mini) | 85-90% | 2-3초 | ✅ |
| 정규식 Fallback | 50-60% | <1초 | ❌ |

## 🎯 지원 기능

### 자연어 패턴 인식
- ✅ "광어 열 마리" (한글 숫자)
- ✅ "바다수산에게" (조사 처리)
- ✅ "급하게 주문해줘" (감정/맥락)
- ✅ "내일까지 배송" (날짜 추론)

### 업체명 매칭
- ✅ "바다수산", "동해마트", "해양식품"
- ✅ 유사도 기반 매칭
- ✅ 오타 허용

### 품목 인식
- ✅ 어종명 + 수량 + 단위
- ✅ 복수 품목 처리
- ✅ 다양한 단위 (kg, 마리, 박스 등)
