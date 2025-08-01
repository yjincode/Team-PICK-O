"""
Firebase 인증 미들웨어
"""
import os
import logging
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
import firebase_admin
from firebase_admin import auth, credentials
import json

logger = logging.getLogger(__name__)
User = get_user_model()


class FirebaseAuthMiddleware(MiddlewareMixin):
    """
    Firebase ID 토큰을 검증하고 Django 사용자 인증을 처리하는 미들웨어
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Firebase Admin SDK 초기화
        if not firebase_admin._apps:
            try:
                # 서비스 계정 키 파일 경로 또는 환경변수에서 credential 설정
                firebase_key_path = getattr(settings, 'FIREBASE_KEY_PATH', None)
                firebase_config = getattr(settings, 'FIREBASE_CONFIG', {})
                service_account_path = firebase_config.get('SERVICE_ACCOUNT_PATH')
                
                if firebase_key_path and os.path.exists(firebase_key_path):
                    cred = credentials.Certificate(firebase_key_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase Admin SDK 초기화 완료")
                elif service_account_path and os.path.exists(service_account_path):
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase Admin SDK 초기화 완료")
                else:
                    logger.warning("Firebase 서비스 계정 키 파일을 찾을 수 없습니다. Firebase 인증이 비활성화됩니다.")
            except Exception as e:
                logger.error(f"Firebase 초기화 실패: {e}")
                logger.warning("Firebase 인증이 비활성화됩니다.")
    
    def process_request(self, request):
        # 인증이 필요하지 않은 경로들
        public_paths = [
            '/api/v1/core/auth/register/',
            '/api/v1/core/auth/status/',
            '/api/v1/core/auth/pending/',
            '/admin/',
            '/api/docs/',
            '/api/redoc/',
            '/api/schema/',
            '/health/',
            '/'
        ]
        
        # OPTIONS 요청은 항상 허용 (CORS preflight)
        if request.method == 'OPTIONS':
            return None
        
        # 공개 경로는 인증 건너뛰기
        if any(request.path.startswith(path) for path in public_paths):
            return None
        
        # Authorization 헤더에서 토큰 추출
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({
                'error': 'Authorization 헤더가 필요합니다.',
                'code': 'auth_required'
            }, status=401)
        
        id_token = auth_header.split('Bearer ')[1]
        
        try:
            # Firebase ID 토큰 검증
            decoded_token = auth.verify_id_token(id_token)
            firebase_uid = decoded_token['uid']
            phone_number = decoded_token.get('phone_number')
            
            # Django 사용자 조회 또는 생성
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                
                # 승인된 사용자만 API 접근 허용
                if user.status != 'approved':
                    return JsonResponse({
                        'error': '계정이 승인되지 않았습니다.',
                        'status': user.status,
                        'code': 'account_not_approved'
                    }, status=403)
                
                # 요청 객체에 사용자 정보 추가
                request.user = user
                request.firebase_user = decoded_token
                
            except User.DoesNotExist:
                return JsonResponse({
                    'error': '등록되지 않은 사용자입니다.',
                    'code': 'user_not_registered'
                }, status=403)
            
        except auth.InvalidIdTokenError:
            return JsonResponse({
                'error': '유효하지 않은 토큰입니다.',
                'code': 'invalid_token'
            }, status=401)
        except auth.ExpiredIdTokenError:
            return JsonResponse({
                'error': '토큰이 만료되었습니다.',
                'code': 'token_expired'
            }, status=401)
        except Exception as e:
            logger.error(f"Firebase 토큰 검증 오류: {e}")
            return JsonResponse({
                'error': '인증 처리 중 오류가 발생했습니다.',
                'code': 'auth_error'
            }, status=500)
        
        return None