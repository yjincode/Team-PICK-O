#!/bin/bash

# 자동 종료 스크립트
# 스테이징 환경에서만 사용 (1시간 후 종료)

SHUTDOWN_HOURS=${1:-1}
SHUTDOWN_SECONDS=$((SHUTDOWN_HOURS * 3600))

echo "🕐 $SHUTDOWN_HOURS 시간 후 서버가 자동 종료됩니다."
echo "종료를 취소하려면: sudo pkill -f auto-shutdown.sh"

# 백그라운드에서 대기
(
    sleep $SHUTDOWN_SECONDS
    echo "⏰ 자동 종료 시간이 되었습니다. 서버를 종료합니다."
    
    # Docker 컨테이너 정리
    cd /home/ec2-user || cd /home/ubuntu || cd ~
    docker-compose down 2>/dev/null || true
    
    # 시스템 종료 (EC2에서만)
    if [ -f /sys/hypervisor/uuid ] && grep -q "^ec2" /sys/hypervisor/uuid 2>/dev/null; then
        sudo shutdown -h now
    else
        echo "⚠️ EC2 환경이 아니므로 시스템 종료를 건너뜁니다."
    fi
) &

echo "🆔 자동 종료 프로세스 ID: $!"
echo "$!" > /tmp/auto-shutdown.pid