#!/bin/bash

# Team-PICK-O 개발환경 설정 스크립트
# 사용법: ./dev-setup.sh [start|stop|restart|logs|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 컬러 출력용
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

# Docker 및 Docker Compose 확인
check_requirements() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되지 않았습니다."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 데몬이 실행되지 않고 있습니다."
        exit 1
    fi
}

# 개발환경 시작
start_dev() {
    log_info "개발환경 시작 중..."
    check_requirements
    
    # 개발용 DB 컨테이너 시작
    docker-compose -f docker-compose.dev.yml up -d
    
    log_success "개발환경 시작 완료!"
    log_info "데이터베이스 정보:"
    echo "  - Host: localhost"
    echo "  - Port: 5432"
    echo "  - Database: teamPicko_dev"
    echo "  - Username: teamPicko"
    echo "  - Password: 12341234"
    echo ""
    log_info "Redis 정보:"
    echo "  - Host: localhost"
    echo "  - Port: 6379"
    echo ""
    log_warning "Backend와 Frontend는 로컬에서 직접 실행하세요:"
    echo "  Backend: cd ../backend && uvicorn main:app --reload"
    echo "  Frontend: cd ../frontend && npm start"
}

# 개발환경 중지
stop_dev() {
    log_info "개발환경 중지 중..."
    docker-compose -f docker-compose.dev.yml down
    log_success "개발환경 중지 완료!"
}

# 개발환경 재시작
restart_dev() {
    log_info "개발환경 재시작 중..."
    stop_dev
    start_dev
}

# 로그 확인
show_logs() {
    log_info "개발환경 로그 표시 중..."
    docker-compose -f docker-compose.dev.yml logs -f
}

# 상태 확인
show_status() {
    log_info "개발환경 상태 확인 중..."
    docker-compose -f docker-compose.dev.yml ps
    
    echo ""
    log_info "컨테이너 상태:"
    
    # 데이터베이스 연결 테스트
    if docker-compose -f docker-compose.dev.yml exec -T database pg_isready -U teamPicko -d teamPicko_dev &> /dev/null; then
        log_success "데이터베이스: 연결 가능"
    else
        log_error "데이터베이스: 연결 불가"
    fi
    
    # Redis 연결 테스트
    if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping &> /dev/null; then
        log_success "Redis: 연결 가능"
    else
        log_error "Redis: 연결 불가"
    fi
}

# 데이터베이스 초기화
reset_db() {
    log_warning "데이터베이스를 초기화하시겠습니까? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "데이터베이스 초기화 중..."
        docker-compose -f docker-compose.dev.yml down -v
        docker-compose -f docker-compose.dev.yml up -d
        log_success "데이터베이스 초기화 완료!"
    else
        log_info "초기화가 취소되었습니다."
    fi
}

# 도움말
show_help() {
    echo "Team-PICK-O 개발환경 관리 스크립트"
    echo ""
    echo "사용법: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    개발환경 시작 (DB + Redis)"
    echo "  stop     개발환경 중지"
    echo "  restart  개발환경 재시작"
    echo "  logs     실시간 로그 확인"
    echo "  status   컨테이너 상태 확인"
    echo "  reset    데이터베이스 초기화"
    echo "  help     이 도움말 표시"
    echo ""
    echo "개발 시작 가이드:"
    echo "  1. $0 start"
    echo "  2. cd ../backend && uvicorn main:app --reload"
    echo "  3. cd ../frontend && npm start"
}

# 메인 로직
case "${1:-help}" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    reset)
        reset_db
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "알 수 없는 명령어: $1"
        show_help
        exit 1
        ;;
esac