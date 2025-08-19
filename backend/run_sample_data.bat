@echo off
chcp 65001 > nul
echo 🚀 샘플 데이터 생성 스크립트 실행 (윈도우)
echo.

REM 가상환경 활성화 확인
if not exist "venv\Scripts\activate.bat" (
    echo ❌ 가상환경이 없습니다. venv 폴더가 backend 디렉토리에 있는지 확인하세요.
    pause
    exit /b 1
)

echo 📦 가상환경 활성화 중...
call venv\Scripts\activate.bat

echo 🔧 Django 환경 설정 중...
set DJANGO_SETTINGS_MODULE=config.settings

echo 📊 샘플 데이터 생성 중...
python manage.py shell -c "exec(open('sample_data.py', encoding='utf-8').read())"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 샘플 데이터 생성 완료!
) else (
    echo.
    echo ❌ 샘플 데이터 생성 실패
)

echo.
pause