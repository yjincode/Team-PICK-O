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

# Docker Compose 설치
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Docker Compose 심볼릭 링크 생성
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

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
echo "Docker Compose version: $(docker-compose --version)" >> /var/log/user-data.log
echo "AWS CLI version: $(aws --version)" >> /var/log/user-data.log
echo "Node.js version: $(node --version)" >> /var/log/user-data.log
echo "Setup completed at: $(date)" >> /var/log/user-data.log