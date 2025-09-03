# Team-PICK-O Backend

Django 기반 생선 상태 분석 AI 백엔드 API 서버입니다.

## 🐟 프로젝트 개요

생선(광어/넙치)의 사진을 AI로 분석하여 건강 상태와 질병을 진단하는 시스템입니다.

### 주요 기능
- 🎯 **YOLOv8 기반 생선 탐지**
- 🔬 **HuggingFace 모델 종류 분류**  
- 🏥 **AIHub 넙치 질병 데이터 기반 질병 진단**
- 📊 **Django Admin 패널 관리**
- 📱 **모바일 앱 지원 API**

## 서버 실행 플로우

### 1. Python 3.11 설치 및 확인
3.11버전이 이미 있으면 생략!
#### Mac 환경
```bash
# Homebrew로 Python 3.11 설치
brew install python@3.11

# 또는 pyenv 사용
brew install pyenv
pyenv install 3.11.8
pyenv local 3.11.8

# Python 버전 확인
python3.11 --version
```

#### Windows 환경
```cmd
# Python 3.11 공식 사이트에서 다운로드 및 설치
# https://www.python.org/downloads/release/python-3118/

# 설치 후 버전 확인
python --version
```

### 2. 가상환경 생성 및 활성화

#### Mac/Linux 환경
```bash
# Python 3.11로 가상환경 생성
python3.11 -m venv venv

# 가상환경 활성화
source venv/bin/activate

# pip 업데이트
pip install --upgrade pip

# Python 버전 재확인
python --version
```

#### Windows 환경
```cmd
# Python 3.11로 가상환경 생성
python -m venv venv

# 가상환경 활성화
venv\Scripts\activate

# pip 업데이트
python -m pip install --upgrade pip

# Python 버전 재확인
python --version
```

#### Windows PowerShell 환경
```powershell
# Python 3.11로 가상환경 생성
python -m venv venv

# 실행 정책 설정 (처음 한 번만)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 가상환경 활성화
venv\Scripts\Activate.ps1

# pip 업데이트
python -m pip install --upgrade pip

# Python 버전 재확인
python --version
```

### 3. 의존성 설치
```bash
# requirements.txt가 있는 경우
pip install -r requirements.txt

# requirements.txt가 없는 경우 기본 패키지 설치 예시
pip install django
pip install djangorestframework
pip install python-dotenv

# 설치된 패키지 목록 확인
pip list
```

### 4. 환경 변수 설정
```bash
# 환경변수 파일 복사 및 수정
cp .env.example .env
# .env 파일에서 필요한 설정값 수정
```

### 5. 데이터베이스 설정
```bash
# 데이터베이스 마이그레이션
python manage.py migrate

# 초기 데이터 생성 (선택사항)
python manage.py loaddata initial_data.json
```

### 6. 서버 실행

#### Mac/Linux 환경
```bash
# 가상환경 활성화
source venv/bin/activate

# 개발 서버 실행



# 또는 특정 포트로 실행
며에 8000

# 백그라운드 실행
nohup python manage.py runserver &

# 가상환경 비활성화
deactivate
```

#### Windows 환경
```cmd
# 가상환경 활성화
venv\Scripts\activate

# 개발 서버 실행
python manage.py runserver

# 또는 특정 포트로 실행
python manage.py runserver 8000

# 가상환경 비활성화
deactivate
```

#### Windows PowerShell 환경
```powershell
# 가상환경 활성화
venv\Scripts\Activate.ps1

# 개발 서버 실행
python manage.py runserver

# 가상환경 비활성화
deactivate
```

## 🚀 빠른 시작 가이드 (Git Clone 후)

### Mac/Linux
```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd mainproject/backend

# 2. Python 3.11 설치 (Homebrew)
brew install python@3.11

# 3. 가상환경 생성 및 활성화
python3.11 -m venv venv
source venv/bin/activate

# 4. pip 업데이트 및 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# 5. 환경변수 설정
cp .env.example .env

# 6. 데이터베이스 마이그레이션
python manage.py migrate

# 7. 서버 실행
python manage.py runserver
```

### Windows
```cmd
# 1. 프로젝트 클론
git clone <repository-url>
cd mainproject\backend

# 2. Python 3.11 설치
# https://www.python.org/downloads/release/python-3118/ 에서 다운로드

# 3. 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate

# 4. pip 업데이트 및 의존성 설치
python -m pip install --upgrade pip
pip install -r requirements.txt

# 5. 환경변수 설정
copy .env.example .env

# 6. 데이터베이스 마이그레이션
python manage.py migrate

# 7. 서버 실행
python manage.py runserver
```

## 주요 디렉토리 구조

```
backend/
├── venv/                # 가상환경
├── requirements.txt     # Python 의존성
├── .env.example        # 환경변수 템플릿
├── .env               # 환경변수 (git ignore)
├── manage.py          # Django 관리 스크립트
├── config/            # 설정 파일
├── apps/              # 애플리케이션 코드
└── static/            # 정적 파일
```

## 개발 도구

### 코드 품질 확인
```bash
# 린트 검사
flake8 .

# 타입 체크
mypy .

# 테스트 실행
python manage.py test
```

### 데이터베이스 관련
```bash
# 마이그레이션 파일 생성
python manage.py makemigrations

# 마이그레이션 적용
python manage.py migrate

# 슈퍼유저 생성
python manage.py createsuperuser
```

## 참고사항

- 개발 시 가상환경을 반드시 활성화한 후 작업
- .env 파일에는 민감한 정보가 포함되므로 git에 커밋하지 않음
- 새로운 패키지 설치 후 requirements.txt 업데이트 필요
- 데이터베이스 스키마 변경 시 마이그레이션 파일 생성 및 적용 필수 