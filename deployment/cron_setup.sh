#!/bin/bash

# cron job 설정 스크립트
# 일별 데이터 수집을 위한 cron job을 설정합니다

echo "🕐 cron job 설정 시작"

# 스크립트 경로 설정
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/daily_data_collection.sh"

# 스크립트 실행 권한 부여
chmod +x "$SCRIPT_PATH"

echo "📝 스크립트 경로: $SCRIPT_PATH"
echo "🔐 실행 권한 설정 완료"

# 기존 cron job 제거 (중복 방지)
(crontab -l 2>/dev/null | grep -v "daily_data_collection.sh") | crontab -

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
    echo "   3. 트리거: 매일 오전 6시"
    echo "   4. 동작: $SCRIPT_PATH 실행"
    echo ""
    echo "   또는 PowerShell 스케줄러 사용:"
    echo "   Register-ScheduledJob -Name 'DailyDataCollection' -Trigger (New-JobTrigger -Daily -At 6AM) -ScriptBlock { & '$SCRIPT_PATH' }"
    echo ""
else
    # Linux/Unix 환경: cron job 설정
    echo "🐧 Linux/Unix 환경 감지 - cron job 설정"
    
    # 새로운 cron job 추가
    # 매일 오전 6시에 실행 (노량진 데이터가 업데이트되는 시간 고려)
    (crontab -l 2>/dev/null; echo "0 6 * * * $SCRIPT_PATH >> /var/log/team-pick-o/cron.log 2>&1") | crontab -
fi

echo "✅ cron job 설정 완료"
echo "📅 실행 시간: 매일 오전 6시"
echo "📋 현재 cron job 목록:"
crontab -l

echo ""
echo "🔍 로그 확인 방법:"
echo "   일반 로그: tail -f /var/log/team-pick-o/daily_collection_YYYYMMDD.log"
echo "   에러 로그: tail -f /var/log/team-pick-o/daily_collection_error_YYYYMMDD.log"
echo "   cron 로그: tail -f /var/log/team-pick-o/cron.log"
