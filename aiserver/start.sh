#!/bin/bash

echo "🚀 AI Server 시작 중..."

# 모델 다운로드 실행
echo "📥 모델 파일 확인 및 다운로드..."
./download_models.sh

# AI 서버 시작
echo "🔧 FastAPI 서버 시작..."
exec uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1