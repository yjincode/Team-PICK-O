"""
JWT 토큰 기반 사용자 인증 미들웨어
모든 API 요청에서 JWT 토큰을 검증하고 사용자 정보를 설정합니다.
"""
import logging
import jwt
from django.http import JsonResponse
from django.urls import resolve
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from business.models import User

logger = logging.getLogger(__name__)

class JWTAuthMiddleware:
    # 인증이 필요 없는 URL 패턴들 (회원가입, 로그인 등)
    EXCLUDED_PATHS = [
        '/admin/',
        '/api/v1/business/auth/',  # 전체 auth 경로 제외
        '/api/v1/transcription/',  # STT 서비스는 인증 없이 사용 가능
        
        # 결제 관련 URL (토스페이먼츠 웹훅 및 결제창용)
        '/api/v1/payments/toss/request/',  # 결제 요청 (pending Payment 생성)
        '/api/v1/payments/toss/confirm/',  # 결제 확정 (웹훅용)

        # 기상청 날씨 및 경보 API (인증 불필요)
        '/api/v1/dashboard/weather/',  # 기상청 API 전체 경로 제외

        # 예측 API (인증 불필요)
        '/api/v1/prediction/',  # 예측 API 전체 경로 제외

        '/static/',
        '/media/',
        '/api/docs/',
        '/api/schema/',
        '/health/',  # 헬스체크
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 요청 전 처리
        if self._should_process_request(request):
            try:
                user_data = self._authenticate_request(request)
                if not user_data:
                    return JsonResponse(
                        {'error': '유효하지 않은 인증 토큰입니다.'}, 
                        status=401
                    )
                
                # request에 사용자 정보 추가
                request.user_id = user_data['user_id']
                request.user_status = user_data['status']
                request.business_name = user_data['business_name']
                
                logger.debug(f"🔧 request에 사용자 정보 설정: user_id={request.user_id}, user_status={request.user_status}")
                
                # DRF IsAuthenticated 호환성을 위한 더미 user 객체 설정
                from django.contrib.auth.models import AnonymousUser
                class AuthenticatedUser:
                    is_authenticated = True
                    is_anonymous = False
                    is_active = True  # ✅ REST Framework에서 필요한 속성 추가
                    id = user_data['user_id']
                
                request.user = AuthenticatedUser()
                
                logger.debug(f"User {user_data['user_id']} ({user_data['status']}) 인증됨 for {request.path}")
                
            except Exception as e:
                logger.error(f"인증 오류: {str(e)}")
                return JsonResponse(
                    {'error': '인증 처리 중 오류가 발생했습니다.'}, 
                    status=500
                )
        
        response = self.get_response(request)
        return response

    def _should_process_request(self, request):
        """요청이 인증을 필요로 하는지 확인"""
        # OPTIONS 요청은 제외 (CORS preflight)
        if request.method == 'OPTIONS':
            logger.debug(f"🔓 OPTIONS 요청 제외: {request.path}")
            return False
            
        # 제외할 경로들 확인
        for excluded_path in self.EXCLUDED_PATHS:
            if request.path.startswith(excluded_path):
                logger.debug(f"🔓 인증 제외 경로: {request.path} (매칭: {excluded_path})")
                return False
        
        # 정확한 root 경로 매칭 (/ 단독)
        if request.path == '/':
            logger.debug(f"🔓 Root 경로 제외: {request.path}")
            return False
        
        # API 경로만 처리
        should_process = request.path.startswith('/api/v1/')
        if should_process:
            logger.debug(f"🔒 인증 필요 경로: {request.path}")
        else:
            logger.debug(f"🔓 API 경로 아님: {request.path}")
        return should_process

    def _authenticate_request(self, request):
        """JWT 토큰을 검증하고 사용자 정보를 반환"""
        # Authorization 헤더에서 Bearer 토큰 추출
        auth_header = request.headers.get('Authorization')
        logger.debug(f"🔍 JWT 검증 시작: {request.path}")
        logger.debug(f"📋 Authorization 헤더: {auth_header}")
        
        if not auth_header:
            logger.debug("❌ Authorization 헤더 없음")
            return None
            
        if not auth_header.startswith('Bearer '):
            logger.debug(f"❌ Bearer 형식 아님: {auth_header[:20]}...")
            return None
        
        token = auth_header.split(' ')[1]
        logger.debug(f"🔑 JWT 토큰 추출: {token[:20]}...")
        
        try:
            # JWT 토큰 검증 (전용 JWT 시크릿 키 사용)
            logger.debug("🔐 JWT 토큰 검증 시작")
            from core.jwt_utils import verify_access_token
            payload = verify_access_token(token)
            
            if not payload:
                logger.debug("❌ JWT 토큰 검증 실패")
                return None
                
            user_id = payload.get('user_id')
            logger.debug(f"✅ JWT 토큰 검증 성공: user_id={user_id}")
            
            if not user_id:
                logger.debug("❌ JWT 페이로드에 user_id 없음")
                return None
            
            # 데이터베이스에서 사용자 정보 조회 및 승인 상태 확인
            logger.debug(f"👤 사용자 정보 DB 조회: user_id={user_id}")
            try:
                user = User.objects.get(id=user_id)
                logger.debug(f"✅ 사용자 정보 조회 성공: {user.business_name} (status: {user.status})")
                
                # 승인 상태 확인 (pending, rejected, suspended는 접근 제한)
                if user.status not in ['approved']:
                    logger.warning(f"❌ User {user_id} status: {user.status} - 접근 거부")
                    return None
                
                logger.debug(f"✅ 사용자 승인 상태 확인 완료: {user.status}")
                return {
                    'user_id': user.id,
                    'status': user.status,
                    'business_name': user.business_name
                }
                
            except ObjectDoesNotExist:
                logger.warning(f"User {user_id} not found in database")
                return None
                
        except jwt.ExpiredSignatureError:
            logger.warning("JWT 토큰 만료됨")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return None


class UserValidationMixin:
    """
    View에서 사용할 수 있는 믹스인
    미들웨어에서 이미 검증된 사용자 정보를 사용합니다.
    """
    
    def dispatch(self, request, *args, **kwargs):
        logger.debug(f"🔍 UserValidationMixin.dispatch 시작: {request.path}")
        logger.debug(f"🔍 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        logger.debug(f"🔍 request.user_status: {getattr(request, 'user_status', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            logger.warning("❌ UserValidationMixin: user_id 없음")
            return JsonResponse(
                {'error': '사용자 인증이 필요합니다.'}, 
                status=401
            )
        
        # 승인 상태 확인 (미들웨어에서 이미 확인했지만 추가 검증)
        if not hasattr(request, 'user_status') or request.user_status != 'approved':
            logger.warning(f"❌ UserValidationMixin: user_status 검증 실패 - {getattr(request, 'user_status', 'NOT SET')}")
            return JsonResponse(
                {'error': '승인된 사용자만 접근할 수 있습니다.'}, 
                status=403
            )
        
        logger.debug("✅ UserValidationMixin: 사용자 검증 성공")
        return super().dispatch(request, *args, **kwargs)


def get_user_queryset_filter(request):
    """
    request에서 사용자 필터를 반환하는 유틸리티 함수
    
    Usage:
        queryset = Model.objects.filter(**get_user_queryset_filter(request))
    """
    return {'user_id': request.user_id}