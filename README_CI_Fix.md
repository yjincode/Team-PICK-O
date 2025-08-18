# 🔧 CI 테스트 오류 해결 가이드

## ❌ 발생한 문제들

### 1. **Node.js 버전 문제**
```
Firebase 패키지들이 Node.js 20+ 요구
현재 CI 환경: Node v18.20.8
```

### 2. **package-lock.json 동기화 문제**
```
TypeScript 의존성 누락
package.json과 package-lock.json 불일치
```

## ✅ **해결 완료!**

CI 환경이 수정되었습니다:
- ✅ Node.js 18 → **Node.js 20** 업그레이드
- ✅ package-lock.json 동기화 문제 해결
- ✅ .nvmrc 파일 생성 (Node 버전 명시)

## 🚀 로컬 개발 환경 설정

### 🍎 **macOS 로컬 환경**

#### 1. Node.js 업그레이드
```bash
# nvm 사용 (권장) - .nvmrc 파일 자동 인식
cd frontend
nvm use  # .nvmrc 파일에서 자동으로 Node 20 사용

# 또는 직접 설치
nvm install 20
nvm use 20

# 버전 확인
node --version  # v20.x.x 확인
```

#### 2. 프론트엔드 의존성 재설치
```bash
cd frontend

# package-lock.json 동기화 (이미 수정됨)
npm install --package-lock-only

# 의존성 설치
npm ci

# 또는 새로 설치
npm install
```

### 🪟 **Windows 로컬 환경**

#### 1. Node.js 업그레이드
```cmd
# Node.js 공식 사이트에서 v20 LTS 다운로드
# https://nodejs.org/

# 또는 chocolatey 사용
choco install nodejs --version=20.0.0

# 버전 확인
node --version
```

#### 2. 프론트엔드 의존성 재설치
```cmd
cd frontend

# 기존 설치 파일 삭제
rmdir /s node_modules
del package-lock.json

# 새로 설치
npm install

# CI 테스트 (선택사항)
npm ci
```

## ✅ **수정된 CI 파일들**

### 1. `.github/workflows/dev-ci.yml`
```yaml
- name: Node.js 설정
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # ✅ 18에서 20으로 변경
    cache: 'npm'

- name: Frontend 의존성 설치
  run: |
    cd frontend
    npm install --package-lock-only  # ✅ 동기화 추가
    npm ci
```

### 2. `.github/workflows/feature-ci.yml`
```yaml
- name: Node.js 설정
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # ✅ Node.js 20 설정 추가
    cache: 'npm'
```

### 3. `frontend/.nvmrc`
```
20  # ✅ Node.js 버전 명시
```

## 🎯 **권장 순서**

### 로컬 개발자
```bash
# 1. Node.js 20 설치
nvm install 20 && nvm use 20

# 2. 프론트엔드 재설치
cd frontend
rm -rf node_modules package-lock.json
npm install

# 3. 백엔드는 그대로 (Python 환경)
cd ../backend
source venv/bin/activate
```

### CI 환경 관리자
```yaml
# GitHub Actions 파일 수정
node-version: '20'  # 버전 업데이트

# 또는 Dockerfile 수정
FROM node:20-alpine  # node:18에서 변경
```

## ⚠️ **주의사항**

- **Firebase 최신 버전**이 Node 20+ 요구
- **기존 프로젝트 호환성** 확인 필요
- **팀원들과 Node 버전 동기화** 필요
- **CI 환경 설정 파일** 업데이트 필요

## 🔍 **문제 진단**

### Node 버전 확인
```bash
node --version
npm --version
```

### 패키지 동기화 확인
```bash
npm ls  # 의존성 트리 확인
npm audit  # 보안 문제 확인
```