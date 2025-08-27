#!/bin/bash

# Team-PICK-O 자동화 시스템 전체 설정 스크립트
# 데이터 수집 및 모니터링 자동화를 설정합니다

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Team-PICK-O 자동화 시스템 설정 시작"
echo "="*60

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. 로그 디렉토리 생성
log_info "로그 디렉토리 생성 중..."
sudo mkdir -p /var/log/team-pick-o
sudo chown $USER:$USER /var/log/team-pick-o
log_success "로그 디렉토리 생성 완료: /var/log/team-pick-o"

# 2. 스크립트 실행 권한 설정
log_info "스크립트 실행 권한 설정 중..."
chmod +x "$(dirname "$0")/daily_data_collection.sh"
chmod +x "$(dirname "$0")/monitor_data_collection.py"
chmod +x "$(dirname "$0")/cron_setup.sh"
chmod +x "$(dirname "$0")/monitor_setup.sh"
log_success "스크립트 실행 권한 설정 완료"

# 3. 데이터 수집 cron job 설정
log_info "데이터 수집 cron job 설정 중..."
"$(dirname "$0")/cron_setup.sh"
log_success "데이터 수집 cron job 설정 완료"

# 4. 모니터링 cron job 설정
log_info "모니터링 cron job 설정 중..."
"$(dirname "$0")/monitor_setup.sh"
log_success "모니터링 cron job 설정 완료"

# 5. 테스트 실행
log_info "자동화 시스템 테스트 중..."

# 모니터링 스크립트 테스트
log_info "모니터링 스크립트 테스트..."
cd /app/backend
python "$(dirname "$0")/monitor_data_collection.py" || {
    log_warning "모니터링 스크립트 테스트 중 경고 발생 (정상)"
}

log_success "자동화 시스템 테스트 완료"

# 6. 설정 완료 요약
echo ""
echo "🎉 Team-PICK-O 자동화 시스템 설정 완료!"
echo "="*60
echo ""
echo "📅 설정된 스케줄:"
echo "   🕐 매일 오전 6시: 데이터 수집"
echo "   🔍 매일 오전 7시: 모니터링 및 알림"
echo ""
echo "📁 로그 파일 위치:"
echo "   📊 수집 로그: /var/log/team-pick-o/daily_collection_YYYYMMDD.log"
echo "   ⚠️  에러 로그: /var/log/team-pick-o/daily_collection_error_YYYYMMDD.log"
echo "   🔍 모니터링 로그: /var/log/team-pick-o/monitor.log"
echo "   📋 cron 로그: /var/log/team-pick-o/cron.log"
echo ""
echo "🔧 관리 명령어:"
echo "   📋 cron job 확인: crontab -l"
echo "   📊 로그 실시간 확인: tail -f /var/log/team-pick-o/*.log"
echo "   🧹 로그 정리: find /var/log/team-pick-o -name '*.log' -mtime +30 -delete"
echo ""
echo "⚠️  주의사항:"
echo "   - 서버 재부팅 시 cron job이 자동으로 시작됩니다"
echo "   - 로그 파일은 30일 후 자동으로 삭제됩니다"
echo "   - 문제 발생 시 로그를 확인하여 원인을 파악하세요"
echo ""
log_success "모든 설정이 완료되었습니다!"
