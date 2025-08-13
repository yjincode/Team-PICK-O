#!/bin/bash

# 시스템 업데이트
yum update -y

# Docker 설치
yum install -y docker

# Docker 서비스 시작 및 자동 시작 설정
systemctl start docker
systemctl enable docker

# ec2-user를 docker 그룹에 추가
usermod -a -G docker ec2-user

# Docker Compose Plugin 설치 (v2)
mkdir -p ~/.docker/cli-plugins/
curl -SL "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-linux-x86_64" -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose

# 전역 설치를 위해 /usr/local/lib/docker/cli-plugins/ 디렉토리도 생성
mkdir -p /usr/local/lib/docker/cli-plugins/
cp ~/.docker/cli-plugins/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose

# 하위 호환성을 위한 심볼릭 링크 (docker-compose 명령어도 지원)
ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Git 설치
yum install -y git

# AWS CLI v2 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Node.js 설치 (선택사항)
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Python3 pip 설치
yum install -y python3-pip

# 필요한 디렉토리 생성
mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app

# 시스템 정보 로그
echo "=== System Setup Complete ===" >> /var/log/user-data.log
echo "Docker version: $(docker --version)" >> /var/log/user-data.log
echo "Docker Compose v2 version: $(docker compose version)" >> /var/log/user-data.log
echo "Docker Compose v1 version: $(docker-compose --version)" >> /var/log/user-data.log
echo "AWS CLI version: $(aws --version)" >> /var/log/user-data.log
echo "Node.js version: $(node --version)" >> /var/log/user-data.log
echo "Setup completed at: $(date)" >> /var/log/user-data.log