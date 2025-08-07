"""
Firebase Authentication for Django REST Framework
Firebase ID 토큰을 검증하여 사용자 인증을 처리합니다.
"""
import firebase_admin
from firebase_admin import auth, credentials
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
import os

User = get_user_model()

# Firebase Admin 초기화 (한 번만 실행)
if not firebase_admin._apps:
    try:
        # Firebase Admin SDK 인증서 경로
        cred_path = getattr(settings, 'FIREBASE_ADMIN_CREDENTIALS', None)
        
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK 초기화 완료 (Service Account Key 사용)")
        else:
            # Service Account Key가 없는 경우
            print("⚠️ Firebase Admin SDK Service Account Key가 없습니다.")
            print("   Firebase Console에서 Service Account Key를 다운로드하여")
            print("   firebase-admin-key.json으로 저장하세요.")
        
    except Exception as e:
        print(f"❌ Firebase Admin SDK 초기화 실패: {e}")
        print("   Firebase Console에서 Service Account Key를 다운로드하세요.")


class FirebaseAuthentication(BaseAuthentication):
    """
    Firebase ID 토큰을 검증하는 DRF 인증 클래스
    """
    
    def authenticate(self, request):
        """
        Firebase ID 토큰을 검증하고 사용자 객체를 반환합니다.
        
        Returns:
            tuple: (user, token) 또는 None
        """
        
        # 인증 제외 경로들
        excluded_paths = [
            '/auth/status/',
            '/auth/register/',
        ]
        
        # 거래처 목록 조회 (GET 요청만)
        if request.path == '/api/v1/business/customers/' and request.method == 'GET':
            return None
        
        for path in excluded_paths:
            if path in request.path:
                return None
            
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
            
        if not auth_header.startswith('Bearer '):
            return None
            
        try:
            # Bearer 토큰 추출
            id_token = auth_header.split(' ')[1]
            
            # Firebase에서 토큰 검증
            decoded_token = auth.verify_id_token(id_token)
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                raise AuthenticationFailed('Invalid Firebase token: no uid')
            
            # 데이터베이스에서 사용자 조회
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                
                # 사용자 상태 확인
                if user.status not in ['approved', 'pending']:
                    raise AuthenticationFailed('User account is not active')
                    
                return (user, id_token)
                
            except User.DoesNotExist:
                raise AuthenticationFailed('User not registered in system')
                
        except auth.InvalidIdTokenError:
            raise AuthenticationFailed('Invalid Firebase token')
        except auth.ExpiredIdTokenError:
            raise AuthenticationFailed('Firebase token has expired')
        except Exception as e:
            raise AuthenticationFailed(f'Firebase authentication failed: {str(e)}')
    
    def authenticate_header(self, request):
        """
        HTTP 401 응답에 포함될 인증 헤더를 반환합니다.
        """
        return 'Bearer'


class OptionalFirebaseAuthentication(FirebaseAuthentication):
    """
    선택적 Firebase 인증 클래스
    토큰이 없어도 None을 반환하고, 있으면 검증합니다.
    """
    
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        return result