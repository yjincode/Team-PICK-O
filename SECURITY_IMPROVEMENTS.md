# 🔒 보안 개선 방안

## 🚨 현재 구성의 즉시 개선 사항

### 1. Security Group 강화
```terraform
# 현재 (취약)
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]  # ❌ 전 세계에서 SSH 접근 가능
}

ingress {
  from_port   = 8000
  to_port     = 8000
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]  # ❌ Django Admin 직접 노출
}

# 개선안
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["YOUR_OFFICE_IP/32"]  # ✅ 특정 IP만 SSH 허용
}

# Django 포트 완전 차단 (Nginx를 통해서만 접근)
# ingress 8000 규칙 삭제
```

### 2. Nginx 설정 강화
```nginx
# 현재 nginx.conf에 추가할 보안 설정

# Admin 경로 IP 제한
location /api/v1/admin/ {
    allow YOUR_OFFICE_IP;
    deny all;
    proxy_pass http://backend:8000/api/v1/admin/;
}

# Rate Limiting 추가
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}

server {
    # API 요청 제한
    location /api/v1/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend:8000/api/v1/;
    }
    
    # 로그인 요청 제한
    location /api/v1/business/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://backend:8000/api/v1/business/auth/;
    }
}
```

### 3. Docker Compose 보안 강화
```yaml
# 현재 docker-compose.yml 수정

services:
  backend:
    ports:
      # - "${BACKEND_PORT:-8000}:8000"  # ❌ 외부 포트 매핑 제거
    environment:
      - DEBUG=False  # ✅ 프로덕션에서 반드시 False
      - ALLOWED_HOSTS=badaejangbu.store,www.badaejangbu.store,backend  # ✅ 특정 호스트만
      
  # React Dev Server 완전 제거 (프로덕션에서)
  # frontend는 nginx로만 서빙
```

## 🛡️ 로드밸런서 도입시 보안 아키텍처

### Architecture Comparison

#### 현재 구성 (보안 취약)
```
Internet → EC2 Public IP (직접 노출)
├── Port 22 (SSH) ← 🚨 전 세계 접근 가능
├── Port 80/443 (Nginx) ← ⚠️ 직접 노출
├── Port 8000 (Django) ← 🚨 Admin Panel 노출
└── Port 3000 (React Dev) ← 🚨 개발 서버 노출
```

#### ALB 구성 (보안 강화)
```
Internet → WAF → ALB → Private EC2
                  ├── DDoS Protection
                  ├── SSL Termination
                  └── Health Checks
                  
Private EC2 (내부망만):
├── Port 22 (SSH) ← ✅ Bastion Host만
├── Port 80 (Nginx) ← ✅ ALB에서만
├── Port 8000 (Django) ← ✅ 내부망만
└── AI/DB Services ← ✅ 완전 격리
```

## 🔧 단계별 보안 개선 로드맵

### Phase 1: 즉시 개선 (현재 구성 유지)
- [ ] Security Group SSH IP 제한
- [ ] Django 8000 포트 외부 차단
- [ ] React Dev Server 프로덕션 제거
- [ ] Nginx Rate Limiting 추가
- [ ] Admin Panel IP 제한

### Phase 2: 중기 개선 (인프라 변경)
- [ ] ALB + WAF 도입
- [ ] Private Subnet으로 EC2 이동
- [ ] Bastion Host 구성
- [ ] CloudWatch 로그 모니터링
- [ ] SSL 인증서 AWS ACM 이동

### Phase 3: 장기 개선 (고가용성)
- [ ] Multi-AZ 배포
- [ ] Auto Scaling Group
- [ ] RDS 분리 (PostgreSQL)
- [ ] ElastiCache 분리 (Redis)
- [ ] ECS/EKS 컨테이너 오케스트레이션

## 💰 비용 비교

### 현재 구성
- EC2 t3.medium: $30/월
- 총 비용: **$30/월**

### ALB 구성
- EC2 t3.medium: $30/월
- ALB: $22/월
- WAF: $5/월 (기본)
- 총 비용: **$57/월**

### 보안 vs 비용 트레이드오프
- **추가 비용**: +$27/월 (90% 증가)
- **보안 향상**: 🔴 High Risk → 🟢 Low Risk
- **가용성 향상**: 99.9% → 99.99%
- **관리 복잡도**: 증가

## 🎯 권장사항

### 즉시 실행 (무료)
1. **Security Group 수정**: SSH IP 제한
2. **Docker 포트 매핑 제거**: 8000, 3000 포트 차단
3. **Nginx Rate Limiting**: DDoS 기본 방어

### 중기 계획 (예산 확보시)
1. **ALB + WAF 도입**: 보안 대폭 강화
2. **Private Subnet**: 완전 격리
3. **모니터링 강화**: CloudWatch, 알람

### 우선순위
1. 🔴 **즉시**: SSH IP 제한 (보안 사고 예방)
2. 🟡 **1주 내**: Django 포트 차단 (Admin 보호)
3. 🟢 **1개월 내**: ALB 도입 검토 (예산 허용시)
