# 🐟 샘플 데이터 생성 가이드

3년치 수산물 거래 데이터를 자동으로 생성하는 스크립트입니다.

## 📋 생성되는 데이터
- **거래처**: 12개 (전국 수산업체)
- **어종**: 20개 (kg, 마리, 박스, 개, 포 등 실제 단위)
- **재고**: 20개 (어종별 재고)
- **주문**: 2000-2500개 (3년치)
- **결제**: 1800-2200개 (결제완료 90%, 환불 5%, 취소 5%)

## 🚀 실행 방법

### 🍎 **macOS / Linux**
```bash
# 1. 백엔드 디렉토리로 이동
cd /path/to/mainproject/backend

# 2. 가상환경 활성화
source venv/bin/activate

# 3. 데이터베이스 실행 (Docker)
cd ../deployment
docker-compose -f docker-compose.dev.yml up -d
cd ../backend

# 4. 기존 데이터 삭제 (User 제외)
python manage.py shell -c "exec(open('clear_data.py').read())"

# 5. 새 샘플 데이터 생성
python manage.py shell -c "exec(open('sample_data.py').read())"
```

### 🪟 **Windows**
```cmd
# 1. 백엔드 디렉토리로 이동
cd C:\path\to\mainproject\backend

# 2. 가상환경 활성화
venv\Scripts\activate

# 3. 데이터베이스 실행 (Docker)
cd ..\deployment
docker-compose -f docker-compose.dev.yml up -d
cd ..\backend

# 4. 기존 데이터 삭제 (User 제외)
python manage.py shell -c "exec(open('clear_data.py').read())"

# 5. 새 샘플 데이터 생성
python manage.py shell -c "exec(open('sample_data.py').read())"
```

## 📊 결과 확인

### 생성되는 데이터 특징:
- **주문 날짜**: 3년치 랜덤 분산
- **납기일**: 주문일 + 2~14일
- **결제 상태**:
  - 최근 5주: 미결제 (placed)
  - 이전 기간: 결제완료 90%, 환불 5%, 취소 5%
- **결제 수단**: 카드/현금/계좌이체 균등 분배

### 접속 정보:
- **pgAdmin**: http://localhost:8080
  - 이메일: admin@picko.com
  - 비밀번호: admin123

## ⚠️ 주의사항
- User 테이블(로그인 계정)은 삭제되지 않습니다
- 실행 전 Docker 데이터베이스가 실행 중이어야 합니다
- 데이터 생성에 1-2분 정도 소요됩니다

## 🔧 문제 해결

### 데이터베이스 연결 오류
```bash
# Docker 컨테이너 상태 확인
docker ps

# 데이터베이스 재시작
docker-compose -f deployment/docker-compose.dev.yml restart database
```

### 가상환경 문제
```bash
# 가상환경 재생성 (macOS/Linux)
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 가상환경 재생성 (Windows)
rmdir /s venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```