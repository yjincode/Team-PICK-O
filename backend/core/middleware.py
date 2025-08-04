"""
Firebase 인증 미들웨어
프론트엔드에서 전송된 Firebase ID 토큰을 검증합니다.
"""
import firebase_admin
from firebase_admin import auth, credentials
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class FirebaseAuthenticationMiddleware:
    """Firebase ID 토큰 검증 미들웨어"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Firebase Admin SDK 초기화 (한 번만)
        if not firebase_admin._apps:
            try:
                # 개발 환경에서는 기본 자격증명 사용
                firebase_admin.initialize_app()
                print("✅ Firebase Admin SDK 초기화 완료")
            except Exception as e:
                print(f"❌ Firebase Admin SDK 초기화 실패: {e}")

    def __call__(self, request):
        # 인증이 필요한 엔드포인트 체크
        if self.requires_auth(request.path):
            auth_header = request.META.get('HTTP_AUTHORIZATION')
            
            if not auth_header or not auth_header.startswith('Bearer '):
                return JsonResponse({
                    'error': '인증 토큰이 필요합니다.'
                }, status=401)
            
            token = auth_header.split(' ')[1]
            
            try:
                # Firebase ID 토큰 검증
                decoded_token = auth.verify_id_token(token)
                firebase_uid = decoded_token['uid']
                
                # Django 사용자 찾기
                try:
                    user = User.objects.get(firebase_uid=firebase_uid)
                    
                    # 승인되지 않은 사용자 체크
                    if user.status != 'approved':
                        return JsonResponse({
                            'error': '계정이 승인되지 않았습니다.',
                            'status': user.status
                        }, status=403)
                    
                    # request에 사용자 정보 추가
                    request.user = user
                    request.firebase_uid = firebase_uid
                    
                except User.DoesNotExist:
                    return JsonResponse({
                        'error': '등록되지 않은 사용자입니다.'
                    }, status=401)
                    
            except Exception as e:
                print(f"❌ Firebase 토큰 검증 실패: {e}")
                return JsonResponse({
                    'error': '유효하지 않은 토큰입니다.'
                }, status=401)
        
        response = self.get_response(request)
        return response
    
    def requires_auth(self, path):
        """인증이 필요한 경로인지 확인"""
        # 인증이 필요없는 경로들
        public_paths = [
            '/api/v1/core/auth/register/',
            '/api/v1/core/auth/status/',
            '/api/v1/core/auth/pending/',
            '/admin/',
            '/api/docs/',
            '/api/redoc/',
            '/api/schema/',
            '/health/',
            '/',
        ]
        
        # 정확한 경로 매칭
        if path in public_paths:
            return False
            
        # 접두사 매칭 (admin, docs 등)
        for public_path in public_paths:
            if path.startswith(public_path):
                return False
        
        # /api/v1/ 로 시작하는 모든 경로는 인증 필요
        return path.startswith('/api/v1/')