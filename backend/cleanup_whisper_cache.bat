@echo off
chcp 65001 >nul
echo 🧹 Whisper 모델 캐시 정리 시작...
echo.

REM Hugging Face 캐시 디렉토리 정리
echo 📂 Hugging Face 캐시 정리 중...
if exist "%USERPROFILE%\.cache\huggingface" (
    echo Hugging Face 캐시 디렉토리 발견: %USERPROFILE%\.cache\huggingface
    if exist "%USERPROFILE%\.cache\huggingface\transformers\models--openai--whisper*" (
        rmdir /s /q "%USERPROFILE%\.cache\huggingface\transformers\models--openai--whisper*" 2>nul
        echo ✅ Whisper 모델 캐시 삭제 완료
    ) else (
        echo Whisper 모델 캐시 없음
    )
) else (
    echo Hugging Face 캐시 디렉토리 없음
)
echo.

REM PyTorch 캐시 정리
echo 📂 PyTorch 캐시 정리 중...
if exist "%USERPROFILE%\.cache\torch" (
    echo PyTorch 캐시 디렉토리 발견: %USERPROFILE%\.cache\torch
    if exist "%USERPROFILE%\.cache\torch\hub\checkpoints\whisper*" (
        del /f /q "%USERPROFILE%\.cache\torch\hub\checkpoints\whisper*" 2>nul
        echo ✅ PyTorch Whisper 캐시 삭제 완료
    ) else (
        echo PyTorch Whisper 캐시 없음
    )
) else (
    echo PyTorch 캐시 디렉토리 없음
)
echo.

REM pip 캐시 정리
echo 📦 pip 캐시 정리 중...
pip cache remove transformers 2>nul
pip cache remove torch 2>nul
pip cache remove torchaudio 2>nul
echo ✅ pip 캐시 정리 완료
echo.

REM 사용하지 않는 패키지 제거
echo 🗑️ 사용하지 않는 패키지 제거 중...
pip uninstall -y torch torchaudio torchvision transformers accelerate
echo ✅ 패키지 제거 완료
echo.

echo ✨ Whisper 캐시 정리 완료!
echo.
echo 📋 다음 단계:
echo 1. 새로운 requirements.txt 설치: pip install -r requirements.txt
echo 2. Django 서버 재시작
echo.
pause