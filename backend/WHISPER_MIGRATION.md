# Whisper 로컬 모델 → API 마이그레이션 가이드

## 변경사항

### 이전 (로컬 Whisper 모델)
- Hugging Face Transformers로 `openai/whisper-large-v3` 모델 다운로드
- GPU/CPU에서 직접 모델 실행
- 큰 메모리 사용량 (수 GB)
- 초기 로딩 시간 필요

### 이후 (OpenAI Whisper API)
- OpenAI API 호출로 변경
- 서버 메모리 사용량 대폭 감소
- API 호출당 과금 (분당 $0.006)
- 안정적이고 빠른 응답

## 마이그레이션 단계

### 1. 기존 Whisper 캐시 정리
```bash
# 자동 정리 스크립트 실행
./cleanup_whisper_cache.sh

# 또는 수동 정리
rm -rf ~/.cache/huggingface/transformers/models--openai--whisper*
rm -rf ~/.cache/torch/hub/checkpoints/whisper*
pip uninstall -y torch torchaudio torchvision transformers accelerate
```

### 2. 새로운 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. OpenAI API 키 설정
```bash
# 환경변수 설정
export OPENAI_API_KEY="your_openai_api_key_here"

# 또는 Django settings.py에 추가
OPENAI_API_KEY = "your_openai_api_key_here"
```

### 4. Django 서버 재시작
```bash
python manage.py runserver
```

## 코드 변경사항

### transcription/views.py
- `transformers`, `torch`, `torchaudio` 제거
- `openai` 패키지 추가
- `process_audio_directly()` → `process_audio_with_whisper_api()` 변경
- 모델 로딩 코드 제거

### requirements.txt
- PyTorch 관련 패키지 제거: `torch`, `torchaudio`, `torchvision`
- Transformers 패키지 제거: `transformers`, `accelerate`
- OpenAI 패키지 추가: `openai==1.3.7`

## 비용 및 성능

### 비용
- OpenAI Whisper API: $0.006 per minute
- 예상 비용: 100분 음성 = $0.60

### 성능
- 응답 속도: 더 빠름 (모델 로딩 시간 없음)
- 메모리 사용량: 대폭 감소 (GB → MB 단위)
- 안정성: OpenAI 인프라로 향상

### 장점
- 서버 자원 절약
- 모델 업데이트 자동 적용
- 높은 안정성과 가용성
- 초기 설정 간소화

### 단점
- 인터넷 연결 필수
- API 호출당 비용 발생
- OpenAI 서비스 의존성

## API 키 보안

### 환경변수 설정 (권장)
```bash
# .env 파일
OPENAI_API_KEY=sk-...

# 또는 시스템 환경변수
export OPENAI_API_KEY="sk-..."
```

### Django settings.py
```python
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
```

## 트러블슈팅

### 1. API 키 오류
```
openai.error.AuthenticationError: Incorrect API key provided
```
**해결**: OPENAI_API_KEY 환경변수 확인

### 2. 네트워크 오류
```
openai.error.APIConnectionError: Error communicating with OpenAI
```
**해결**: 인터넷 연결 및 방화벽 설정 확인

### 3. 요청 한도 초과
```
openai.error.RateLimitError: Rate limit reached
```
**해결**: API 사용량 확인 및 요청 간격 조정

## 모니터링

### API 사용량 추적
OpenAI 대시보드에서 월별 사용량 모니터링 가능:
- https://platform.openai.com/usage

### 로그 확인
```python
# views.py에서 로그 확인
logger.info(f"✅ Whisper API STT 처리 완료: {transcription_text[:50]}...")
```