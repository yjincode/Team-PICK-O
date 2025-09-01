# Team-PICK-O CI/CD Pipeline 가이드

## 📋 전체 파이프라인 구조

### 1. Feature 개발 워크플로우
```
feature/** 브랜치 푸시 → feature-pr.yml → dev PR 자동 생성
```

### 2. 개별 서비스 배포 워크플로우
```
backend/** 브랜치 푸시 → deploy-backend.yml → 백엔드만 배포 + dev PR
frontend/** 브랜치 푸시 → deploy-frontend.yml → 프론트엔드만 배포 + dev PR
aiserver/** 브랜치 푸시 → deploy-aiserver.yml → AI서버만 배포 + dev PR
```

### 3. 전체 배포 워크플로우
```
main 브랜치 푸시 → main-cd.yml → 전체 서비스 배포 (PR 생성 없음)
```

---

## 🔄 상세 워크플로우

### Feature 브랜치 자동 PR (`feature-pr.yml`)
**트리거**: `feature/**` 브랜치 푸시
**동작**:
- dev 브랜치로 자동 PR 생성
- 기존 PR 존재 시 스킵

---

### Backend 개별 배포 (`deploy-backend.yml`)
**트리거**: `backend/**` 브랜치 푸시 또는 `backend/` 폴더 변경
**동작**:
1. **빌드**: Backend Docker 이미지 빌드 및 ECR 푸시
2. **배포**: 
   - 기존 `teamPicko-backend` 컨테이너 중지/삭제
   - 기존 backend 이미지 삭제
   - 새 이미지 pull 후 `docker compose up -d backend`로 재시작
3. **PR**: dev 브랜치로 자동 PR 생성

**네트워크**: `teamPicko_default` (docker-compose 기본 네트워크)

---

### Frontend 개별 배포 (`deploy-frontend.yml`)
**트리거**: `frontend/**` 브랜치 푸시 또는 `frontend/` 폴더 변경
**동작**:
1. **빌드**: Frontend Docker 이미지 빌드 및 ECR 푸시
2. **배포**: 
   - 기존 `teamPicko-frontend` 컨테이너 중지/삭제
   - 기존 frontend 이미지 삭제
   - 새 이미지 pull 후 `docker compose up -d frontend`로 재시작
3. **PR**: dev 브랜치로 자동 PR 생성

**네트워크**: `teamPicko_default` (docker-compose 기본 네트워크)

---

### AI Server 개별 배포 (`deploy-aiserver.yml`)
**트리거**: `aiserver/**` 브랜치 푸시 또는 `aiserver/` 폴더 변경
**동작**:
1. **빌드**: AI Server Docker 이미지 빌드 및 ECR 푸시
2. **배포**: 
   - 기존 `teamPicko-aiserver` 컨테이너 중지/삭제
   - 기존 aiserver 이미지 삭제
   - 새 이미지 pull 후 `docker compose up -d aiserver`로 재시작
3. **PR**: dev 브랜치로 자동 PR 생성

**네트워크**: `teamPicko_default` (docker-compose 기본 네트워크)
**특별사항**: AWS S3에서 AI 모델 자동 다운로드

---

### 전체 배포 (`main-cd.yml`)
**트리거**: `main` 브랜치 푸시
**동작**:
1. **변경 감지**: 각 서비스별 변경사항 확인
2. **빌드**: 변경된 서비스만 선택적 빌드
3. **배포**: 
   - 전체 `docker compose --env-file ~/.env up -d` 실행
   - 모든 서비스가 동일한 네트워크에서 시작
4. **헬스체크**: 각 서비스 상태 확인

**네트워크**: `teamPicko_default` (docker-compose 기본 네트워크)

---

## 🌐 서비스 간 통신

### Docker Compose 네트워크 설정
```yaml
services:
  frontend:    # 포트 80, 443
  backend:     # 포트 8000, AI_SERVER_URL=http://aiserver:8001
  database:    # 포트 5432
  aiserver:    # 포트 8001 (내부 네트워크만)
```

### 네트워크 통신
- **Frontend → Backend**: `http://backend:8000`
- **Backend → AI Server**: `http://aiserver:8001`
- **Backend → Database**: `postgresql://database:5432`

---

## 🚀 배포 플로우 예시

### 1. Feature 개발
```bash
git checkout -b feature/새기능
# 개발 작업
git push origin feature/새기능
# → feature-pr.yml 실행 → dev PR 자동 생성
```

### 2. 개별 서비스 배포
```bash
git checkout -b backend/버그수정
# backend 폴더 작업
git push origin backend/버그수정
# → deploy-backend.yml 실행 → 백엔드만 배포 + dev PR
```

### 3. 전체 배포
```bash
git checkout main
git merge dev
git push origin main
# → main-cd.yml 실행 → 전체 서비스 배포
```

---

## 📦 ECR 이미지 태깅

- **개별 배포**: `latest` 태그 사용
- **전체 배포**: `commit-hash` + `latest` 태그 동시 사용

---

## 🔧 EC2 배포 방식

### 개별 서비스 배포
1. 특정 컨테이너만 중지/삭제
2. 해당 서비스 이미지만 삭제
3. 새 이미지 pull
4. `docker compose up -d [서비스명]`로 재시작

### 전체 배포
1. `docker compose down` (전체 중지)
2. 새 이미지들 pull
3. `docker compose up -d` (전체 시작)

---

## ✅ 자동 PR 생성 규칙

| 브랜치 패턴 | 대상 브랜치 | 파이프라인 |
|-------------|-------------|------------|
| `feature/**` | dev | feature-pr.yml |
| `backend/**` | dev | deploy-backend.yml |
| `frontend/**` | dev | deploy-frontend.yml |
| `aiserver/**` | dev | deploy-aiserver.yml |
| `main` | 없음 | main-cd.yml |

---

## 🔒 보안 설정

### GitHub Secrets 필요
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY` 
- `AWS_REGION`
- `ECR_REPOSITORY_BACKEND`
- `ECR_REPOSITORY_FRONTEND`
- `ECR_REPOSITORY_AISERVER`
- `EC2_HOST`
- `EC2_USER`
- `EC2_PRIVATE_KEY`
- `PAT_TOKEN` (PR 생성용)

### 환경 변수
모든 서비스는 동일한 `.env` 파일을 공유하며, docker-compose 네트워크 내에서 서비스명으로 통신