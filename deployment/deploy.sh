#!/bin/bash

# Deploy script for Team-PICK-O
# Usage: ./deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}

echo "🚀 Team-PICK-O 배포 시작 (환경: $ENVIRONMENT)"

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되지 않았습니다."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose가 설치되지 않았습니다."
    exit 1
fi

# Load environment variables
if [ "$ENVIRONMENT" = "prod" ]; then
    if [ ! -f ".env.prod" ]; then
        echo "❌ .env.prod 파일이 없습니다."
        echo "deployment/.env.example을 참고하여 .env.prod를 생성해주세요."
        exit 1
    fi
    export $(cat .env.prod | grep -v '^#' | xargs)
    COMPOSE_FILE="docker-compose.yml"
else
    if [ ! -f ".env.dev" ]; then
        echo "⚠️  .env.dev 파일이 없습니다. 기본값을 사용합니다."
    else
        export $(cat .env.dev | grep -v '^#' | xargs)
    fi
    COMPOSE_FILE="docker-compose.dev.yml"
fi

echo "📦 Docker 이미지 빌드 중..."
docker-compose -f $COMPOSE_FILE build

echo "🔄 기존 컨테이너 중지 중..."
docker-compose -f $COMPOSE_FILE down

echo "🏃 새 컨테이너 시작 중..."
docker-compose -f $COMPOSE_FILE up -d

echo "⏳ 서비스 준비 대기 중..."
sleep 30

echo "🔍 서비스 상태 확인 중..."
docker-compose -f $COMPOSE_FILE ps

# Health check
if [ "$ENVIRONMENT" = "prod" ]; then
    HEALTH_URL="https://$DOMAIN/health"
else
    HEALTH_URL="http://localhost:8000/health"
fi

echo "🏥 헬스 체크 수행 중... ($HEALTH_URL)"
if curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "✅ 배포 성공!"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "⏰ 프로덕션 서버는 1시간 후 자동 종료됩니다."
        echo "sudo shutdown -h +60" | at now
    fi
else
    echo "❌ 헬스 체크 실패!"
    echo "🔄 롤백 중..."
    docker-compose -f $COMPOSE_FILE down
    exit 1
fi

echo "🎉 배포 완료!"