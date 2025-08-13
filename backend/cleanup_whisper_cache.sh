#!/bin/bash

echo "🧹 Whisper 모델 캐시 정리 시작..."

# Hugging Face 캐시 디렉토리 정리
echo "📂 Hugging Face 캐시 정리 중..."
if [ -d ~/.cache/huggingface ]; then
    echo "Hugging Face 캐시 디렉토리 발견: ~/.cache/huggingface"
    rm -rf ~/.cache/huggingface/transformers/models--openai--whisper*
    echo "✅ Whisper 모델 캐시 삭제 완료"
else
    echo "Hugging Face 캐시 디렉토리 없음"
fi

# Torch 캐시 정리
echo "📂 PyTorch 캐시 정리 중..."
if [ -d ~/.cache/torch ]; then
    echo "PyTorch 캐시 디렉토리 발견: ~/.cache/torch"
    rm -rf ~/.cache/torch/hub/checkpoints/whisper*
    echo "✅ PyTorch Whisper 캐시 삭제 완료"
else
    echo "PyTorch 캐시 디렉토리 없음"
fi

# pip 캐시에서 관련 패키지 제거
echo "📦 pip 캐시 정리 중..."
pip cache remove transformers torch torchaudio

# 사용하지 않는 패키지 제거
echo "🗑️ 사용하지 않는 패키지 제거 중..."
pip uninstall -y torch torchaudio torchvision transformers accelerate

echo "✨ Whisper 캐시 정리 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 새로운 requirements.txt 설치: pip install -r requirements.txt"
echo "2. OpenAI API 키 설정: OPENAI_API_KEY=your_api_key"
echo "3. Django 서버 재시작"