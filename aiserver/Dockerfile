FROM python:3.11-bullseye

# 시스템 패키지 설치 (OpenCV 의존성 및 시스템 도구)
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    unzip \
    libglib2.0-0 \
    libgomp1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libfontconfig1 \
    libice6 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libatk1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Ollama 설치 (LLM 텍스트 파싱용)
RUN curl -fsSL https://ollama.com/install.sh | sh

# 작업 디렉토리 설정
WORKDIR /app

# Python 의존성 설치 (CPU-only 최적화)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir tensorflow-cpu && \
    pip install --no-cache-dir -r requirements.txt

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