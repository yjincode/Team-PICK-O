#!/bin/bash

echo "🤖 AI Server LLM 로컬 개발 환경 설정"
echo "=================================="

# OS 감지
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "🖥️  감지된 OS: $MACHINE"

# Ollama 설치 확인
if command -v ollama &> /dev/null; then
    echo "✅ Ollama가 이미 설치되어 있습니다."
else
    echo "📥 Ollama 설치 중..."
    
    if [[ "$MACHINE" == "Mac" ]]; then
        if command -v brew &> /dev/null; then
            echo "🍺 Homebrew로 Ollama 설치 중..."
            brew install ollama
        else
            echo "📦 공식 스크립트로 Ollama 설치 중..."
            curl -fsSL https://ollama.com/install.sh | sh
        fi
    elif [[ "$MACHINE" == "Linux" ]]; then
        echo "🐧 Linux용 Ollama 설치 중..."
        curl -fsSL https://ollama.com/install.sh | sh
    else
        echo "❌ 지원하지 않는 OS입니다. 수동으로 설치해주세요:"
        echo "   https://ollama.com/download"
        exit 1
    fi
fi

# Ollama 서비스 시작
echo "🚀 Ollama 서비스 시작 중..."
if pgrep -x "ollama" > /dev/null; then
    echo "✅ Ollama 서비스가 이미 실행 중입니다."
else
    echo "🔄 Ollama 서비스 시작..."
    ollama serve &
    OLLAMA_PID=$!
    echo "📝 Ollama PID: $OLLAMA_PID"
    sleep 5
fi

# Phi-3 Mini 모델 확인 및 다운로드
echo "🧠 Phi-3 Mini 모델 확인 중..."
if ollama list | grep -q "phi3:mini"; then
    echo "✅ Phi-3 Mini 모델이 이미 설치되어 있습니다."
else
    echo "📥 Phi-3 Mini 모델 다운로드 중... (2.3GB, 시간이 걸릴 수 있습니다)"
    ollama pull phi3:mini
    
    if [ $? -eq 0 ]; then
        echo "✅ Phi-3 Mini 모델 다운로드 완료!"
    else
        echo "❌ 모델 다운로드에 실패했습니다."
        exit 1
    fi
fi

# 설치 확인
echo ""
echo "🔍 설치 확인:"
echo "- Ollama 버전: $(ollama --version)"
echo "- 설치된 모델:"
ollama list

# 테스트
echo ""
echo "🧪 간단 테스트 실행 중..."
sleep 2

RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi3:mini",
    "prompt": "Hello, world!",
    "stream": false,
    "options": {"num_predict": 10}
  }')

if [[ $RESPONSE == *"response"* ]]; then
    echo "✅ LLM 테스트 성공!"
else
    echo "⚠️  LLM 테스트 실패. 수동으로 확인해주세요."
fi

echo ""
echo "🎉 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. AI Server 시작: cd aiserver && python main.py"
echo "2. 테스트: curl http://localhost:8001/api/v1/text/health"
echo "3. 종료 시: pkill ollama"
echo ""
echo "📚 자세한 사용법: README_LLM.md 참조"
