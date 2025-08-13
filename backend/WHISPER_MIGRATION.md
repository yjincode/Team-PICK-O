# Whisper 모델 마이그레이션 가이드

## 변경사항

### 이전 (Hugging Face Transformers)
- Hugging Face Transformers로 `openai/whisper-large-v3` 모델 다운로드
- GPU/CPU에서 직접 모델 실행
- 큰 메모리 사용량 (수 GB)
- 초기 로딩 시간 필요

### 이후 (오픈소스 Whisper)
- OpenAI의 오픈소스 Whisper 라이브러리 사용
- API 키 불필요
- 로컬에서 모델 실행
- 안정적이고 효율적인 음성 인식

## 마이그레이션 단계

### 1. 기존 Whisper 캐시 정리

#### Linux/macOS
```bash
# 자동 정리 스크립트 실행
./cleanup_whisper_cache.sh

# 또는 수동 정리
rm -rf ~/.cache/huggingface/transformers/models--openai--whisper*
rm -rf ~/.cache/torch/hub/checkpoints/whisper*
pip uninstall -y torch torchaudio torchvision transformers accelerate
```

#### Windows
```cmd
# CMD에서 배치 파일 실행
cleanup_whisper_cache.bat

# 또는 PowerShell에서 실행
.\cleanup_whisper_cache.ps1

# 또는 수동 정리
rmdir /s /q "%USERPROFILE%\.cache\huggingface\transformers\models--openai--whisper*"
del /f /q "%USERPROFILE%\.cache\torch\hub\checkpoints\whisper*"
pip uninstall -y torch torchaudio torchvision transformers accelerate
```

### 2. 새로운 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. Django 서버 재시작
```bash
python manage.py runserver
```

## 코드 변경사항

### transcription/views.py
- `transformers`, `torch`, `torchaudio` 제거
- `whisper` 패키지 추가
- `process_audio_directly()` → `process_audio_with_whisper()` 변경
- 오픈소스 Whisper 모델 로딩 코드 추가

### requirements.txt
- PyTorch 관련 패키지 제거: `torch`, `torchaudio`, `torchvision`
- Transformers 패키지 제거: `transformers`, `accelerate`
- 오픈소스 Whisper 패키지 추가: `openai-whisper==20231117`

## 비용 및 성능

### 비용
- 오픈소스 Whisper: 완전 무료
- API 호출 비용 없음

### 성능
- 응답 속도: 안정적 (첫 로딩 후 빠름)
- 메모리 사용량: 적절한 수준 (~1GB)
- 안정성: 로컬 실행으로 높은 안정성

### 장점
- 완전 무료 사용
- API 키 불필요
- 인터넷 연결 불필요 (모델 다운로드 후)
- 데이터 프라이버시 보장

### 단점
- 초기 모델 다운로드 필요
- 로컬 리소스 사용

## 트러블슈팅

### 1. 모델 다운로드 오류
```
FileNotFoundError: [Errno 2] No such file or directory
```
**해결**: 인터넷 연결 확인 및 모델 재다운로드

### 2. 메모리 부족 오류
```
RuntimeError: CUDA out of memory
```
**해결**: 더 작은 모델 사용 (base → tiny) 또는 CPU 모드로 실행

### 3. 오디오 파일 형식 오류
```
ffmpeg.Error: ffmpeg not found
```
**해결**: ffmpeg 설치 필요 (brew install ffmpeg)

## 모니터링

### 모델 로딩 상태 확인
```python
# views.py에서 로그 확인
logger.info(f"✅ Whisper 모델 로딩 완료")
logger.info(f"✅ Whisper STT 처리 완료: {transcription_text[:50]}...")
```

### 메모리 사용량 모니터링
```bash
# 시스템 메모리 사용량 확인
htop
# 또는
ps aux | grep python
```