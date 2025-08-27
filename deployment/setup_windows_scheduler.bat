@echo off
REM Windows Task Scheduler 설정 스크립트
REM Team-PICK-O 데이터 수집 자동화를 위한 Windows 작업 스케줄러 설정

echo 🚀 Windows Task Scheduler 설정 시작
echo ========================================

REM 현재 디렉토리 확인
set CURRENT_DIR=%~dp0
set BACKEND_DIR=%CURRENT_DIR%..\backend

echo 📁 현재 디렉토리: %CURRENT_DIR%
echo 📁 Backend 디렉토리: %BACKEND_DIR%

REM 스크립트 경로 설정
set DATA_COLLECTION_SCRIPT=%CURRENT_DIR%daily_data_collection.sh
set MONITOR_SCRIPT=%CURRENT_DIR%monitor_data_collection.py

echo 📝 데이터 수집 스크립트: %DATA_COLLECTION_SCRIPT%
echo 📝 모니터링 스크립트: %MONITOR_SCRIPT%

REM 로그 디렉토리 생성
if not exist "C:\logs\team-pick-o" mkdir "C:\logs\team-pick-o"
echo ✅ 로그 디렉토리 생성: C:\logs\team-pick-o

REM PowerShell 스크립트 생성
echo 📝 PowerShell 스크립트 생성 중...

REM 데이터 수집 작업 스크립트
echo $ErrorActionPreference = 'Stop' > "%TEMP%\daily_data_collection.ps1"
echo cd "%BACKEND_DIR%" >> "%TEMP%\daily_data_collection.ps1"
echo if (Test-Path "venv\Scripts\Activate.ps1") { >> "%TEMP%\daily_data_collection.ps1"
echo     & "venv\Scripts\Activate.ps1" >> "%TEMP%\daily_data_collection.ps1"
echo } >> "%TEMP%\daily_data_collection.ps1"
echo python auction_prediction\collect_noryangjin_daily_quantity.py >> "%TEMP%\daily_data_collection.ps1"

REM 모니터링 작업 스크립트
echo $ErrorActionPreference = 'Stop' > "%TEMP%\monitor_data_collection.ps1"
echo cd "%BACKEND_DIR%" >> "%TEMP%\monitor_data_collection.ps1"
echo if (Test-Path "venv\Scripts\Activate.ps1") { >> "%TEMP%\monitor_data_collection.ps1"
echo     & "venv\Scripts\Activate.ps1" >> "%TEMP%\monitor_data_collection.ps1"
echo } >> "%TEMP%\monitor_data_collection.ps1"
echo python "%MONITOR_SCRIPT%" >> "%TEMP%\monitor_data_collection.ps1"

echo ✅ PowerShell 스크립트 생성 완료

REM 기존 작업 삭제 (중복 방지)
echo 🔄 기존 작업 삭제 중...
schtasks /delete /tn "Team-PICK-O-DailyDataCollection" /f 2>nul
schtasks /delete /tn "Team-PICK-O-Monitoring" /f 2>nul

REM 새로운 작업 생성
echo 📅 데이터 수집 작업 생성 중...
schtasks /create /tn "Team-PICK-O-DailyDataCollection" /tr "powershell.exe -ExecutionPolicy Bypass -File \"%TEMP%\daily_data_collection.ps1\"" /sc daily /st 06:00 /ru System /f

echo 📅 모니터링 작업 생성 중...
schtasks /create /tn "Team-PICK-O-Monitoring" /tr "powershell.exe -ExecutionPolicy Bypass -File \"%TEMP%\monitor_data_collection.ps1\"" /sc daily /st 07:00 /ru System /f

echo ✅ 작업 스케줄러 설정 완료!

echo.
echo 📋 설정된 작업 목록:
schtasks /query /tn "Team-PICK-O-DailyDataCollection"
schtasks /query /tn "Team-PICK-O-Monitoring"

echo.
echo 🔍 관리 명령어:
echo   작업 목록 확인: schtasks /query /fo table
echo   작업 실행: schtasks /run /tn "Team-PICK-O-DailyDataCollection"
echo   작업 삭제: schtasks /delete /tn "Team-PICK-O-DailyDataCollection" /f
echo.
echo 📁 로그 위치: C:\logs\team-pick-o\
echo.
echo ⚠️  주의사항:
echo   - 작업 스케줄러는 관리자 권한으로 실행해야 합니다
echo   - Python과 가상환경이 올바르게 설정되어 있어야 합니다
echo   - 첫 실행 시 수동으로 테스트해보세요
echo.
echo 🎉 Windows 자동화 설정이 완료되었습니다!
pause
