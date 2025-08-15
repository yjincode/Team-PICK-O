"""
Django settings for Team-PICK-O Backend project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import ast

# Load environment variables
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Media files (user uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

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

# Firebase Admin SDK 설정
FIREBASE_ADMIN_CREDENTIALS = os.path.join(BASE_DIR, 'firebase-admin-key.json')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# CSRF 보호 비활성화 (JWT 사용 시)
# 미들웨어에서 이미 비활성화했으므로 추가 설정 불필요

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
    # 'fish_analysis',  # 광어 질병 분석 기능 (PyTorch 의존성으로 임시 비활성화)
    'accounts',
    'dashboard',
    'order',
    'payment',  # 결제 관리 앱
    'fish_registry',
    'transcription',
    'inventory',  # 재고 관리 앱
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.JWTAuthMiddleware',
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

# 데이터베이스 설정 (환경에 따라 자동 설정)
DEFAULT_DB_CONFIG = {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': os.getenv('POSTGRES_DB', 'teamPicko'),
    'USER': os.getenv('POSTGRES_USER', 'postgres'),
    'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'password'),
    'HOST': os.getenv('DB_HOST', 'database'),  # 기본값: 도커 컨테이너
    'PORT': os.getenv('DB_PORT', '5432'),
    'OPTIONS': {
        'connect_timeout': 10,
    },
}


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
    'x-csrftoken',
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

# CSRF settings
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 개발 환경에서는 모든 Origin 허용
if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])

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
DATA_GO_KR_API_KEY = os.getenv('DATA_GO_KR_API_KEY')
KOSIS_API_KEY = os.getenv('KOSIS_API_KEY')
KHOA_API_KEY = os.getenv('KHOA_API_KEY')  # 한국해양조사원 API 키
AGRICULTURE_API_KEY = os.getenv('AGRICULTURE_API_KEY')  # 농림축산식품부 API 키

# Create necessary directories
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
os.makedirs(AI_MODELS['MODEL_CACHE_DIR'], exist_ok=True)

DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL', '')

