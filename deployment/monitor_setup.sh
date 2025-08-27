#!/bin/bash

# 모니터링 cron job 설정 스크립트
# 데이터 수집 모니터링을 위한 cron job을 설정합니다

echo "🔍 모니터링 cron job 설정 시작"

# 스크립트 경로 설정
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/monitor_data_collection.py"

# 스크립트 실행 권한 부여
chmod +x "$SCRIPT_PATH"

echo "📝 모니터링 스크립트 경로: $SCRIPT_PATH"
echo "🔐 실행 권한 설정 완료"

# 기존 모니터링 cron job 제거 (중복 방지)
(crontab -l 2>/dev/null | grep -v "monitor_data_collection.py") | crontab -

# ========================================
# 환경별 설정 (배포 시 수정 필요)
# ========================================
# 로컬 개발 환경: Windows Task Scheduler 사용 권장
# 팀 프로덕션 환경: Linux cron 사용
# ========================================

# 환경 감지
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "⚠️  Windows 환경 감지"
    echo "   Windows에서는 cron 대신 Task Scheduler를 사용하세요:"
    echo "   1. 작업 스케줄러 열기"
    echo "   2. 기본 작업 만들기"
    echo "   3. 트리거: 매일 오전 7시"
    echo "   4. 동작: python $SCRIPT_PATH 실행"
    echo ""
    echo "   또는 PowerShell 스케줄러 사용:"
    echo "   Register-ScheduledJob -Name 'DataMonitoring' -Trigger (New-JobTrigger -Daily -At 7AM) -ScriptBlock { cd 'C:/Users/201/dev/Team-PICK-O/backend'; python '$SCRIPT_PATH' }"
    echo ""
else
    # Linux/Unix 환경: cron job 설정
    echo "🐧 Linux/Unix 환경 감지 - cron job 설정"
    
    # 새로운 모니터링 cron job 추가
    # 매일 오전 7시에 실행 (데이터 수집 후 1시간 뒤)
    (crontab -l 2>/dev/null; echo "0 7 * * * cd /app/backend && python $SCRIPT_PATH >> /var/log/team-pick-o/monitor.log 2>&1") | crontab -
fi

echo "✅ 모니터링 cron job 설정 완료"
echo "📅 실행 시간: 매일 오전 7시"
echo "📋 현재 cron job 목록:"
crontab -l

echo ""
echo "🔍 로그 확인 방법:"
echo "   모니터링 로그: tail -f /var/log/team-pick-o/monitor.log"
echo "   수집 로그: tail -f /var/log/team-pick-o/daily_collection_YYYYMMDD.log"
echo "   에러 로그: tail -f /var/log/team-pick-o/daily_collection_error_YYYYMMDD.log"
