# Multi-stage build for Python Django backend
FROM python:3.11-slim AS builder

# 시스템 패키지 업데이트 및 필수 도구 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libasound2-dev \
    libsndfile1-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치용 임시 디렉토리
WORKDIR /build

# requirements.txt 복사 및 의존성 설치
COPY requirements.txt .

# pip 업그레이드 및 의존성 설치
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

# 보안을 위한 non-root 사용자 생성
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# 필수 런타임 패키지만 설치 (STT를 위한 오디오 라이브러리 포함)
RUN apt-get update && apt-get install -y \
    libpq5 \
    libsndfile1 \
    libasound2 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 작업 디렉토리 설정
WORKDIR /app

# builder stage에서 설치된 패키지 복사
COPY --from=builder /root/.local /home/appuser/.local

# PATH 환경변수에 사용자 로컬 bin 경로 추가
ENV PATH=/home/appuser/.local/bin:$PATH

# 애플리케이션 코드 복사
COPY --chown=appuser:appgroup . .

# 정적 파일 및 미디어 디렉토리 생성
RUN mkdir -p /app/static /app/media /app/logs && \
    chown -R appuser:appgroup /app/static /app/media /app/logs

# 포트 설정
EXPOSE 8000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

# non-root 사용자로 전환
USER appuser

# Django 마이그레이션 및 정적 파일 수집 후 애플리케이션 실행
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py runserver 0.0.0.0:8000"]