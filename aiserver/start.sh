#!/bin/bash

echo "🚀 AI Server 시작 중..."

# Ollama 서비스 백그라운드 시작
echo "🤖 Ollama 서비스 시작..."
ollama serve &
OLLAMA_PID=$!

# Ollama 서비스가 시작될 때까지 대기
sleep 10

# Phi-3 Mini 모델 다운로드 (처음 실행 시에만)
echo "📥 Phi-3 Mini 모델 확인 및 다운로드..."
if ! ollama list | grep -q "phi3:mini"; then
    echo "🔽 Phi-3 Mini 모델 다운로드 중... (2.3GB, 시간이 걸릴 수 있습니다)"
    ollama pull phi3:mini
    echo "✅ Phi-3 Mini 모델 다운로드 완료"
else
    echo "✅ Phi-3 Mini 모델이 이미 설치되어 있습니다"
fi

# 기존 모델 다운로드 실행
echo "📥 기존 모델 파일 확인 및 다운로드..."
./download_models.sh

# 종료 시 Ollama 프로세스도 함께 종료
trap "echo '🛑 서비스 종료 중...'; kill $OLLAMA_PID; exit" SIGTERM SIGINT

# AI 서버 시작
echo "🔧 FastAPI 서버 시작..."
exec uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1