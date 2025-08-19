@echo off
chcp 65001 > nul
echo 🗑️ 데이터베이스 클리어 스크립트 실행 (윈도우)
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

echo ⚠️ 경고: 모든 데이터가 삭제됩니다! (사용자 제외)
echo 계속하려면 아무 키나 누르세요...
pause

echo 🗑️ 데이터 클리어 중...
python manage.py shell -c "exec(open('clear_data.py', encoding='utf-8').read())"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 데이터 클리어 완료!
) else (
    echo.
    echo ❌ 데이터 클리어 실패
)

echo.
pause