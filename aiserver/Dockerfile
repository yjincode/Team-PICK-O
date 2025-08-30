# Multi-stage build for minimal image
FROM python:3.11-slim as builder

WORKDIR /tmp

# 의존성 설치용 최소 패키지만
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /tmp/wheels \
    --index-url https://download.pytorch.org/whl/cpu torch torchvision && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /tmp/wheels \
    tensorflow-cpu>=2.12.0 ultralytics>=8.3.185 opencv-python-headless==4.8.1.78 \
    pillow>=10.0.0 numpy>=1.24.0 python-dotenv==1.0.0 requests>=2.31.0 \
    loguru==0.7.2 fastapi==0.104.1 uvicorn[standard]==0.24.0 \
    python-multipart==0.0.6 pydantic==2.5.0 --no-deps

# 런타임 이미지 (최소화)
FROM python:3.11-slim

# 런타임 필수 패키지만
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 작업 디렉토리 설정
WORKDIR /app

# 빌드된 wheels 복사 및 설치
COPY --from=builder /tmp/wheels /tmp/wheels
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --find-links /tmp/wheels \
    torch torchvision tensorflow-cpu pillow numpy python-dotenv requests \
    loguru fastapi uvicorn python-multipart pydantic && \
    pip install --no-cache-dir opencv-python-headless==4.8.1.78 && \
    pip install --no-cache-dir ultralytics>=8.3.185 && \
    pip uninstall -y opencv-python opencv-contrib-python && \
    rm -rf /tmp/wheels

# AWS CLI 간소화 (경량)
RUN curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip -q awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws /usr/local/aws-cli/v2/current/dist/awscli/examples

# 애플리케이션 코드 복사
COPY app/ ./app/
COPY main.py .
COPY download_models.sh .
COPY start.sh .

# 모델 디렉토리 생성
RUN mkdir -p /app/models/yolo /app/models/vgg16

# 실행 권한 설정
RUN chmod +x download_models.sh start.sh

# 환경 변수 설정
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV CUDA_VISIBLE_DEVICES=""

# 포트 노출
EXPOSE 8001

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# 시작 스크립트로 실행
CMD ["./start.sh"]