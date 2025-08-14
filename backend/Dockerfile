# 경량화된 Django backend
FROM python:3.11-alpine

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1000 appgroup && adduser -D -s /bin/sh -u 1000 -G appgroup appuser

# 필수 시스템 패키지 설치 (Alpine 패키지 + OCR)
RUN apk add --no-cache \
    postgresql-dev \
    postgresql-client \
    gcc \
    g++ \
    musl-dev \
    libffi-dev \
    curl \
    tesseract-ocr \
    tesseract-ocr-data-kor \
    && rm -rf /var/cache/apk/*

# 작업 디렉토리 설정
WORKDIR /app

# 경량화된 requirements.txt 생성
COPY requirements.txt .

# 필수 의존성 설치 (활성화된 기능만)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    Django==4.2.7 \
    djangorestframework==3.15.2 \
    django-cors-headers==4.3.1 \
    python-dotenv==1.0.0 \
    psycopg2-binary==2.9.9 \
    drf-spectacular==0.26.5 \
    djangorestframework-simplejwt==5.3.0 \
    firebase-admin==6.2.0 \
    PyJWT==2.8.0 \
    httpx==0.25.2 \
    requests==2.31.0 \
    pytesseract==0.3.10 \
    Pillow==10.1.0 \
    python-dateutil==2.8.2 \
    celery==5.3.0 \
    gunicorn==21.2.0 \
    whitenoise==6.6.0

# 애플리케이션 코드 복사
COPY --chown=appuser:appgroup . .

# 정적 파일 디렉토리 생성
RUN mkdir -p /app/static /app/logs && \
    chown -R appuser:appgroup /app/static /app/logs

# 포트 설정
EXPOSE 8000

# 간단한 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# non-root 사용자로 전환
USER appuser

# 프로덕션용 gunicorn으로 실행
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 30 config.wsgi:application"]