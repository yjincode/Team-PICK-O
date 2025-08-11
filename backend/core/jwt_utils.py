"""
JWT 토큰 유틸리티
Firebase 지연시간 문제를 해결하기 위한 자체 JWT 토큰 시스템
"""
import jwt
import logging
from datetime import datetime, timedelta
from django.conf import settings

logger = logging.getLogger(__name__)

# JWT 설정
JWT_SECRET_KEY = getattr(settings, 'JWT_SECRET_KEY', 'your-super-secret-key-change-in-production')
JWT_REFRESH_SECRET_KEY = getattr(settings, 'JWT_REFRESH_SECRET_KEY', 'refresh-super-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_EXPIRATION_MINUTES = 15  # 액세스 토큰: 15분 (짧게)
JWT_REFRESH_EXPIRATION_DAYS = 7    # 리프레시 토큰: 7일 (길게)

def generate_access_token(user):
    """
    액세스 토큰 생성 (15분 만료)
    API 호출용 짧은 수명 토큰
    """
    try:
        payload = {
            'user_id': user.id,
            'business_name': user.business_name,
            'firebase_uid': user.firebase_uid,
            'token_type': 'access',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(minutes=JWT_ACCESS_EXPIRATION_MINUTES)
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        logger.info(f"✅ 액세스 토큰 생성 성공: user_id={user.id}, 만료={JWT_ACCESS_EXPIRATION_MINUTES}분")
        return token
        
    except Exception as e:
        logger.error(f"❌ 액세스 토큰 생성 실패: {e}")
        return None

def generate_refresh_token(user):
    """
    리프레시 토큰 생성 (7일 만료)
    액세스 토큰 갱신용 긴 수명 토큰
    """
    try:
        payload = {
            'user_id': user.id,
            'token_type': 'refresh',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS)
        }
        
        token = jwt.encode(payload, JWT_REFRESH_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        logger.info(f"✅ 리프레시 토큰 생성 성공: user_id={user.id}, 만료={JWT_REFRESH_EXPIRATION_DAYS}일")
        return token
        
    except Exception as e:
        logger.error(f"❌ 리프레시 토큰 생성 실패: {e}")
        return None

def generate_token_pair(user):
    """
    액세스 토큰과 리프레시 토큰 한 번에 생성
    """
    access_token = generate_access_token(user)
    refresh_token = generate_refresh_token(user)
    
    if access_token and refresh_token:
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'access_expires_in': JWT_ACCESS_EXPIRATION_MINUTES * 60,  # 초 단위
            'refresh_expires_in': JWT_REFRESH_EXPIRATION_DAYS * 24 * 3600  # 초 단위
        }
    
    return None

def verify_access_token(token):
    """
    액세스 토큰 검증 및 페이로드 반환
    내부 검증으로 매우 빠름 (1-5ms)
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # 토큰 타입 확인
        if payload.get('token_type') != 'access':
            logger.warning("❌ 액세스 토큰이 아님")
            return None
        
        logger.debug(f"✅ 액세스 토큰 검증 성공: user_id={payload.get('user_id')}")
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.debug("⏰ 액세스 토큰 만료")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"❌ 액세스 토큰 유효하지 않음: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ 액세스 토큰 검증 중 오류: {e}")
        return None

def verify_refresh_token(token):
    """
    리프레시 토큰 검증 및 페이로드 반환
    """
    try:
        payload = jwt.decode(token, JWT_REFRESH_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # 토큰 타입 확인
        if payload.get('token_type') != 'refresh':
            logger.warning("❌ 리프레시 토큰이 아님")
            return None
        
        logger.debug(f"✅ 리프레시 토큰 검증 성공: user_id={payload.get('user_id')}")
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("⏰ 리프레시 토큰 만료")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"❌ 리프레시 토큰 유효하지 않음: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ 리프레시 토큰 검증 중 오류: {e}")
        return None

def get_user_id_from_access_token(token):
    """
    액세스 토큰에서 user_id만 빠르게 추출
    """
    payload = verify_access_token(token)
    return payload.get('user_id') if payload else None

def get_user_id_from_refresh_token(token):
    """
    리프레시 토큰에서 user_id만 빠르게 추출
    """
    payload = verify_refresh_token(token)
    return payload.get('user_id') if payload else None

def is_access_token_expired(token):
    """
    액세스 토큰 만료 여부 확인 (검증 없이 빠른 체크)
    """
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        exp_timestamp = payload.get('exp')
        if exp_timestamp and payload.get('token_type') == 'access':
            return datetime.utcnow().timestamp() > exp_timestamp
        return True
    except:
        return True