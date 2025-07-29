# Deployment Guide

Team-PICK-O 프로젝트의 배포 가이드입니다.

## 구조

```
deployment/
├── docker-compose.yml          # 프로덕션 환경 설정
├── docker-compose.dev.yml      # 개발 환경 설정
├── nginx.conf                  # Nginx 설정
├── deploy.sh                   # 배포 스크립트
├── .env.example               # 환경변수 예시
└── README.md                  # 이 파일
```

## 환경변수 설정

### 개발 환경
```bash
cp .env.example .env.dev
# .env.dev 파일을 수정하여 개발 환경에 맞는 값 설정
```

### 프로덕션 환경
```bash
cp .env.example .env.prod
# .env.prod 파일을 수정하여 프로덕션 환경에 맞는 값 설정
```

### 필수 환경변수 (######## 표시된 부분)

#### 데이터베이스
- `POSTGRES_DB`: 데이터베이스 이름
- `POSTGRES_USER`: 데이터베이스 사용자
- `POSTGRES_PASSWORD`: 데이터베이스 비밀번호

#### 보안
- `SECRET_KEY`: JWT 토큰 서명용 비밀키 (충분히 복잡하게)
- `ALLOWED_HOSTS`: 허용된 호스트 (프로덕션에서는 실제 도메인)

#### AWS (프로덕션)
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 키
- `AWS_S3_BUCKET_NAME`: S3 버킷 이름
- `AWS_REGION`: AWS 리전

## 로컬 개발 환경 실행

```bash
# 개발 환경으로 실행
./deploy.sh dev

# 또는 직접 docker-compose 사용
docker-compose -f docker-compose.dev.yml up -d
```

## 프로덕션 배포

### 수동 배포
```bash
# 프로덕션 환경으로 배포
./deploy.sh prod
```

### CI/CD를 통한 자동 배포

GitHub Actions를 통해 `main` 브랜치에 push할 때 자동으로 배포됩니다.

#### 필요한 GitHub Secrets

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
EC2_HOST
EC2_USER
EC2_PRIVATE_KEY
DATABASE_URL
SECRET_KEY
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

## 서비스 포트

- **Frontend**: 3000 (개발), 80/443 (프로덕션)
- **Backend**: 8000
- **Database**: 5432
- **Nginx**: 80, 443 (프로덕션)

## 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs

# 특정 서비스 로그
docker-compose logs frontend
docker-compose logs backend
docker-compose logs database

# 실시간 로그 스트림
docker-compose logs -f
```

## 문제 해결

### 컨테이너가 시작되지 않는 경우
```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs

# 이미지 다시 빌드
docker-compose build --no-cache
```

### 데이터베이스 연결 오류
```bash
# 데이터베이스 컨테이너 상태 확인
docker-compose exec database psql -U $POSTGRES_USER -d $POSTGRES_DB

# 환경변수 확인
docker-compose exec backend env | grep DATABASE
```

### SSL 인증서 설정 (프로덕션)
```bash
# SSL 폴더 생성
mkdir -p deployment/ssl

# Let's Encrypt 사용 예시
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem deployment/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem deployment/ssl/
```

## 백업 및 복원

### 데이터베이스 백업
```bash
docker-compose exec database pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

### 데이터베이스 복원
```bash
docker-compose exec -T database psql -U $POSTGRES_USER -d $POSTGRES_DB < backup.sql
```

## 모니터링

프로덕션 환경에서는 다음을 모니터링하세요:

- 컨테이너 상태: `docker-compose ps`
- 리소스 사용량: `docker stats`
- 로그: `docker-compose logs`
- 헬스 체크: `curl http://your-domain/health`

## 보안 주의사항

1. `.env` 파일들은 절대 커밋하지 마세요
2. 프로덕션에서는 강력한 SECRET_KEY를 사용하세요
3. 데이터베이스 비밀번호는 복잡하게 설정하세요
4. SSL 인증서를 사용하여 HTTPS를 활성화하세요
5. 정기적으로 의존성을 업데이트하세요