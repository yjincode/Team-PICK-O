#!/bin/bash

# 일별 노량진 데이터 수집 스크립트
# cron job으로 매일 실행됨

set -e  # 에러 발생 시 스크립트 중단

# 로그 파일 설정
LOG_DIR="/var/log/team-pick-o"
LOG_FILE="$LOG_DIR/daily_collection_$(date +%Y%m%d).log"
ERROR_LOG="$LOG_DIR/daily_collection_error_$(date +%Y%m%d).log"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG"
}

# 시작 로그
log "=== 일별 데이터 수집 시작 ==="

# ========================================
# 환경별 설정 (배포 시 수정 필요)
# ========================================
# 로컬 개발 환경: C:/Users/201/dev/Team-PICK-O/backend
# 팀 프로덕션 환경: /app/backend
# ========================================

# 환경 감지 및 디렉토리 설정
if [ -d "/app/backend" ]; then
    # 프로덕션 환경 (팀 DB)
    PROJECT_DIR="/app/backend"
    log "프로덕션 환경 감지: $PROJECT_DIR"
elif [ -d "C:/Users/201/dev/Team-PICK-O/backend" ]; then
    # 로컬 개발 환경
    PROJECT_DIR="C:/Users/201/dev/Team-PICK-O/backend"
    log "로컬 개발 환경 감지: $PROJECT_DIR"
else
    # 현재 디렉토리 사용
    PROJECT_DIR="$(pwd)"
    log "현재 디렉토리 사용: $PROJECT_DIR"
fi

# 프로젝트 디렉토리로 이동
cd "$PROJECT_DIR"

# 가상환경 활성화 (환경별)
if [ -d "venv" ]; then
    source venv/bin/activate
    log "가상환경 활성화됨"
elif [ -d "C:/Users/201/dev/Team-PICK-O/backend/venv" ]; then
    source "C:/Users/201/dev/Team-PICK-O/backend/venv/Scripts/activate"
    log "로컬 가상환경 활성화됨"
fi

# 어제 날짜 계산
YESTERDAY=$(date -d "yesterday" +%Y%m%d)
TODAY=$(date +%Y%m%d)

log "수집 기간: $YESTERDAY ~ $TODAY"

# 데이터 수집 실행
try_collection() {
    local start_date=$1
    local end_date=$2
    
    log "데이터 수집 시작: $start_date ~ $end_date"
    
    # Django 환경 설정
    export DJANGO_SETTINGS_MODULE=config.settings
    
    # 데이터 수집 스크립트 실행
    python auction_prediction/collect_noryangjin_daily_quantity.py "$start_date" "$end_date"
    
    if [ $? -eq 0 ]; then
        log "데이터 수집 성공: $start_date ~ $end_date"
        return 0
    else
        error_log "데이터 수집 실패: $start_date ~ $end_date"
        return 1
    fi
}

# 메인 수집 로직
COLLECTION_SUCCESS=false

# 1차 시도: 어제 데이터만 수집
if try_collection "$YESTERDAY" "$YESTERDAY"; then
    COLLECTION_SUCCESS=true
    log "어제 데이터 수집 완료"
else
    log "어제 데이터 수집 실패, 3일 전부터 재시도"
    
    # 2차 시도: 3일 전부터 어제까지
    THREE_DAYS_AGO=$(date -d "3 days ago" +%Y%m%d)
    if try_collection "$THREE_DAYS_AGO" "$YESTERDAY"; then
        COLLECTION_SUCCESS=true
        log "3일 전부터 어제까지 데이터 수집 완료"
    else
        error_log "모든 수집 시도 실패"
    fi
fi

# 수집 결과 요약
if [ "$COLLECTION_SUCCESS" = true ]; then
    log "=== 데이터 수집 성공 ==="
    
    # 수집된 데이터 통계
    log "수집된 데이터 통계:"
    python -c "
import os
import sys
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from prediction.models import FishAuctionData
from datetime import date, timedelta

yesterday = date.today() - timedelta(days=1)
today = date.today()

# 어제 수집된 데이터 수
yesterday_count = FishAuctionData.objects.filter(
    auction_date=yesterday,
    data_source='노량진수산시장_일별_규격별'
).count()

# 오늘 수집된 데이터 수
today_count = FishAuctionData.objects.filter(
    auction_date=today,
    data_source='노량진수산시장_일별_규격별'
).count()

print(f'어제 데이터: {yesterday_count}건')
print(f'오늘 데이터: {today_count}건')
print(f'총 데이터: {FishAuctionData.objects.count():,}건')
"
    
    # 종료 코드 0 (성공)
    exit 0
else
    error_log "=== 데이터 수집 실패 ==="
    # 종료 코드 1 (실패)
    exit 1
fi
