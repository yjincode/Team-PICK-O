@echo off
echo 🚀 어종 가격 예측 자동화 시스템 설정
echo ========================================

echo.
echo 📋 설정할 내용:
echo 1. 매일 오전 6시에 데이터 수집 실행
echo 2. 어제 날짜 기준으로 데이터 수집
echo 3. 수집 결과를 로그 파일에 저장
echo.

echo 🔧 작업 스케줄러 등록 중...
echo.

REM 현재 디렉토리를 backend로 설정
cd /d "%~dp0"

REM 작업 스케줄러 등록 (schtasks 명령어)
schtasks /create /tn "FishPricePrediction" /tr "cmd /c cd /d \"%CD%\" && python manage.py daily_data_collection >> logs\daily_collection.log 2>&1" /sc daily /st 06:00 /f

if %errorlevel% equ 0 (
    echo ✅ 작업 스케줄러 등록 성공!
    echo.
    echo 📅 등록된 작업:
    echo    - 작업 이름: FishPricePrediction
    echo    - 실행 시간: 매일 오전 6시
    echo    - 실행 명령: python manage.py daily_data_collection
    echo    - 로그 파일: logs\daily_collection.log
    echo.
    echo 🔍 작업 확인 방법:
    echo    schtasks /query /tn "FishPricePrediction"
    echo.
    echo 🛑 작업 삭제 방법 (필요시):
    echo    schtasks /delete /tn "FishPricePrediction" /f
) else (
    echo ❌ 작업 스케줄러 등록 실패!
    echo 관리자 권한으로 실행해주세요.
)

echo.
echo 📁 로그 디렉토리 생성 중...
if not exist "logs" mkdir logs

echo.
echo ✅ 자동화 시스템 설정 완료!
pause
