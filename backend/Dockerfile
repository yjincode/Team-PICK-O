# Ubuntu 기반 Django backend (faster-whisper 지원)
FROM python:3.11-slim

# 보안을 위한 non-root 사용자 생성
RUN groupadd -g 1000 appgroup && useradd -r -u 1000 -g appgroup appuser

# 시스템 패키지 업데이트 및 필수 도구 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    curl \
    tesseract-ocr \
    tesseract-ocr-kor \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 작업 디렉토리 설정
WORKDIR /app

# 프로덕션용 requirements 복사
COPY requirements.prod.txt .

# 경량화된 의존성 설치
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.prod.txt

# 애플리케이션 코드 복사
COPY --chown=appuser:appgroup . .

# 로그 디렉토리만 생성
RUN mkdir -p /app/logs && \
    chown -R appuser:appgroup /app/logs

# 포트 설정
EXPOSE 8000

# 간단한 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# non-root 사용자로 전환
USER appuser

# 프로덕션용 gunicorn으로 실행 (collectstatic 건너뛰기)
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 30 config.wsgi:application"]