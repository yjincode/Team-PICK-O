"""
Django settings for Team-PICK-O Backend project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import ast

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables (BASE_DIR 설정 후에 호출)
load_dotenv(BASE_DIR / '.env')

# Media files (user uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# AI Server settings (어류 질병 분석용)
AI_SERVER_URL = os.getenv('AI_SERVER_URL', 'http://localhost:8001')

# Tesseract OCR Configuration
TESSERACT_CMD = os.getenv('TESSERACT_CMD', '/usr/bin/tesseract')
TESSERACT_TESSDATA_DIR = os.getenv('TESSERACT_TESSDATA_DIR', '/usr/share/tesseract-ocr/4.00/tessdata')

# File upload settings
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

# Django SECRET_KEY (필수)
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me-in-production')

# JWT Settings for fast authentication (replacing Firebase token verification)
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
JWT_REFRESH_SECRET_KEY = os.getenv('JWT_REFRESH_SECRET_KEY')
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_EXPIRATION_MINUTES = 15  # 액세스 토큰: 15분
JWT_REFRESH_EXPIRATION_DAYS = 7    # 리프레시 토큰: 7일

# Toss Payments 설정
TOSS_SECRET_KEY = os.getenv('TOSS_SECRET_KEY')  # .env 파일에서 설정
TOSS_PAYMENT_KEY = os.getenv('TOSS_PAYMENT_KEY')  # .env 파일에서 설정
TOSS_ENVIRONMENT = os.getenv('TOSS_ENVIRONMENT', 'test')  # test 또는 live

# Firebase Admin SDK 설정
FIREBASE_ADMIN_CREDENTIALS = os.path.join(BASE_DIR, 'firebase-admin-key.json')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# CSRF 보호 완전 비활성화 (JWT 사용 시)
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SAMESITE = None
CSRF_COOKIE_AGE = None
CSRF_COOKIE_NAME = None
CSRF_HEADER_NAME = None
CSRF_TRUSTED_ORIGINS = []

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    # 'django.contrib.staticfiles',  # API 서버이므로 비활성화
    'prediction',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
]

LOCAL_APPS = [
    'core',  # 공통 모듈 (인증 등)
    'business',  # 고객 관리 앱
    'fish_analysis',  # 어류 질병 분석 (YOLO11 + VGG16)
    'accounts',
    'dashboard',
    'order',
    'payment',  # 결제 관리 앱
    'fish_registry',
    'transcription',
    'inventory',  # 재고 관리 앱
    'sales',  # 매출 관리 앱
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.JWTAuthMiddleware',  # JWT 인증 미들웨어 활성화
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database - PostgreSQL 설정

# 데이터베이스 연결 우선순위 설정
# 1차: 팀 공동 로컬서버 (192.168.0.137)
# 2차: 개인 로컬 도커 데이터베이스 (localhost:5432)

import psycopg2

def get_database_config():
    """데이터베이스 연결 우선순위에 따라 설정 반환"""
    
    # 환경변수로 배포 환경 확인
    is_production = os.getenv('ENVIRONMENT') == 'production' or os.getenv('DEBUG') == 'False'
    
    if is_production:
        # 배포 환경: EC2 데이터베이스 사용
        production_config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'teamPicko'),
            'USER': os.getenv('POSTGRES_USER', 'teamPicko'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', '12341234'),
            'HOST': os.getenv('DB_HOST', 'database'),  # 배포 시 EC2 내부 호스트명
            'PORT': os.getenv('DB_PORT', '5432'),
            'OPTIONS': {
                'connect_timeout': 10,
                'client_encoding': 'UTF8',
            },
        }
        print(f"🌐 배포 환경: EC2 데이터베이스 연결")
        print(f"📊 데이터베이스: {production_config['USER']}@{production_config['HOST']}:{production_config['PORT']}/{production_config['NAME']}")
        return production_config
    
    # 개발 환경: 우선순위에 따른 연결
    # 1차: 팀 공동 로컬서버 시도
    team_server_config = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'teamPicko'),
        'USER': os.getenv('DB_USER', 'teamPicko'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'database'),
        'PORT': '5432',
        'OPTIONS': {
            'connect_timeout': 5,
            'client_encoding': 'UTF8',
        },
    }
    
    # 2차: 개인 로컬 도커 데이터베이스
    docker_db_config = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'teamPicko',
        'USER': 'teamPicko',
        'PASSWORD': '12341234',
        'HOST': 'localhost',
        'PORT': '5432',
        'OPTIONS': {
            'connect_timeout': 5,
            'client_encoding': 'UTF8',
        },
    }
    
    # 1차 연결 시도
    try:
        print("🔍 1차: 팀 공동 로컬서버 연결 시도...")
        conn = psycopg2.connect(
            host=team_server_config['HOST'],
            port=team_server_config['PORT'],
            user=team_server_config['USER'],
            password=team_server_config['PASSWORD'],
            database=team_server_config['NAME'],
            connect_timeout=3,
            options='-c client_encoding=utf8'
        )
        conn.close()
        print("✅ 1차: 팀 공동 로컬서버 연결 성공!")
        return team_server_config
    except Exception as e:
        print(f"❌ 1차: 팀 공동 로컬서버 연결 실패: {e}")
    
    # 2차 연결 시도
    try:
        print("🔍 2차: 개인 로컬 도커 데이터베이스 연결 시도...")
        conn = psycopg2.connect(
            host=docker_db_config['HOST'],
            port=docker_db_config['PORT'],
            user=docker_db_config['USER'],
            password=docker_db_config['PASSWORD'],
            database=docker_db_config['NAME'],
            connect_timeout=3,
            options='-c client_encoding=utf8'
        )
        conn.close()
        print("✅ 2차: 개인 로컬 도커 데이터베이스 연결 성공!")
        return docker_db_config
    except Exception as e:
        print(f"❌ 2차: 개인 로컬 도커 데이터베이스 연결 실패: {e}")
    
    # 둘 다 실패한 경우 기본 설정 반환
    print("⚠️ 모든 데이터베이스 연결 실패. 기본 설정 사용")
    return team_server_config

# 데이터베이스 연결 설정 가져오기
DEFAULT_DB_CONFIG = get_database_config()

# 간단한 데이터베이스 설정
DATABASES = {
    'default': DEFAULT_DB_CONFIG
}

print(f"📊 데이터베이스 설정: {DEFAULT_DB_CONFIG['USER']}@{DEFAULT_DB_CONFIG['HOST']}:{DEFAULT_DB_CONFIG['PORT']}/{DEFAULT_DB_CONFIG['NAME']}")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True

# Static files 비활성화 (API 서버로만 사용)
# STATIC_URL = '/static/'
# STATIC_ROOT = BASE_DIR / 'staticfiles'
# STATICFILES_DIRS = []

# Media files (User uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'business.User'

# Firebase Admin SDK 설정
FIREBASE_ADMIN_CREDENTIALS = os.path.join(BASE_DIR, 'firebase-admin-key.json')

# Firebase Admin SDK 초기화 확인
FIREBASE_ADMIN_INITIALIZED = False
try:
    if os.path.exists(FIREBASE_ADMIN_CREDENTIALS):
        FIREBASE_ADMIN_INITIALIZED = True
        print("✅ Firebase Admin SDK 인증서 파일 발견")
    else:
        print("⚠️ Firebase Admin SDK 인증서 파일이 없습니다.")
        print(f"   경로: {FIREBASE_ADMIN_CREDENTIALS}")
        print("   Firebase Console에서 Service Account Key를 다운로드하세요.")
except Exception as e:
    print(f"❌ Firebase Admin SDK 설정 오류: {e}")

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_API_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
    'VERSION_PARAM': 'version',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# DRF Spectacular (API Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': os.getenv('PROJECT_NAME', 'Team-PICK-O Backend API'),
    'DESCRIPTION': '생선 상태 분석을 위한 AI 기반 백엔드 API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8080", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# 개발 환경에서는 모든 Origin 허용
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = []

# CORS 헤더 설정
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# CSRF settings - 완전 비활성화
CSRF_TRUSTED_ORIGINS = []

# Logging configuration - Console only
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'fish_analysis': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'core': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_PERMISSIONS = 0o644

# AI Model settings
AI_MODELS = {
    'YOLO_MODEL_PATH': os.getenv('YOLO_MODEL_PATH', 'yolov8n.pt'),
    'HF_SPECIES_MODEL': os.getenv('HF_SPECIES_MODEL', 'fish-species-classifier'),
    'HF_DISEASE_MODEL': os.getenv('HF_DISEASE_MODEL', 'fish-disease-classifier'),
    'CONFIDENCE_THRESHOLD': float(os.getenv('CONFIDENCE_THRESHOLD', '0.5')),
    'MODEL_CACHE_DIR': BASE_DIR / 'models',
}

# API Keys
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY')
KOSIS_API_KEY = os.getenv('KOSIS_API_KEY')
KHOA_API_KEY = os.getenv('KHOA_API_KEY')  # 한국해양조사원 API 키
AGRICULTURE_API_KEY = os.getenv('AGRICULTURE_API_KEY')  # 농림축산식품부 API 키
NIFS_API_KEY = os.getenv('NIFS_API_KEY')  # 국립수산과학원 API 키
DATA_GO_KR_API_KEY = os.getenv('DATA_GO_KR_API_KEY')  # 공공데이터포털 API 키


# Create necessary directories
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
os.makedirs(AI_MODELS['MODEL_CACHE_DIR'], exist_ok=True)

# OpenMP 스레드 제한 (macOS LightGBM 호환성)
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['OPENBLAS_NUM_THREADS'] = '1'

DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL', '')

