"""
사용자 인증 미들웨어
모든 API 요청에서 요청 바디의 user_id를 검증하고 request.user_id를 설정합니다.
"""
import logging
import json
from django.http import JsonResponse
from django.urls import resolve
from django.conf import settings

logger = logging.getLogger(__name__)

class UserAuthMiddleware:
    """
    요청 바디의 user_id를 검증하고 request에 user_id를 추가하는 미들웨어
    스프링의 필터와 비슷한 역할을 합니다.
    """
    
    # 인증이 필요 없는 URL 패턴들
    EXCLUDED_PATHS = [
        '/admin/',
        '/api/v1/business/auth/register/',
        '/api/v1/business/auth/status/',
        '/api/v1/business/auth/get-user-id/',
        '/static/',
        '/media/',
        '/api/docs/',
        '/api/schema/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 요청 전 처리
        logger.info(f"🔍 미들웨어 처리: {request.method} {request.path}")
        
        if self._should_process_request(request):
            logger.info(f"📝 user_id 검증 필요한 요청: {request.path}")
            user_id = self._extract_user_from_body(request)
            
            logger.info(f"🆔 추출된 user_id: {user_id}")
            
            if not user_id:
                logger.warning(f"❌ user_id 없음: {request.path}")
                return JsonResponse(
                    {'error': 'user_id가 필요합니다.'}, 
                    status=400
                )
            
            # request에 user_id 추가 (View에서 사용 가능)
            request.user_id = user_id
            
            logger.info(f"✅ User ID {user_id} 설정됨 for {request.path}")
        else:
            logger.info(f"⏭️ 미들웨어 제외 경로: {request.path}")
        
        response = self.get_response(request)
        
        # 응답 후 처리 (필요시)
        return response

    def _should_process_request(self, request):
        """요청이 처리되어야 하는지 확인"""
        # OPTIONS 요청은 제외 (CORS preflight)
        if request.method == 'OPTIONS':
            return False
            
        # GET 요청도 제외 (조회는 user_id 불필요)
        if request.method == 'GET':
            return False
            
        # 제외할 경로들 확인
        for excluded_path in self.EXCLUDED_PATHS:
            if request.path.startswith(excluded_path):
                return False
        
        # API 경로만 처리
        return request.path.startswith('/api/v1/')

    def _extract_user_from_body(self, request):
        """요청 바디에서 user_id를 추출"""
        try:
            if hasattr(request, 'body') and request.body:
                # JSON 파싱
                body = json.loads(request.body.decode('utf-8'))
                user_id = body.get('user_id')
                
                if user_id:
                    try:
                        return int(user_id)
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid user_id format: {user_id}")
                        return None
                        
            return None
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning(f"JSON 파싱 오류: {e}")
            return None
        except Exception as e:
            logger.error(f"user_id 추출 오류: {e}")
            return None


class UserValidationMixin:
    """
    View에서 사용할 수 있는 믹스인
    request.user_id가 유효한 사용자인지 검증합니다.
    """
    
    def dispatch(self, request, *args, **kwargs):
        # 미들웨어에서 설정된 user_id 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse(
                {'error': '사용자 인증이 필요합니다.'}, 
                status=401
            )
        
        # 실제 사용자 존재 여부 확인 (선택사항)
        if getattr(settings, 'VALIDATE_USER_EXISTS', False):
            from business.models import User
            try:
                User.objects.get(id=request.user_id, status='approved')
            except User.DoesNotExist:
                return JsonResponse(
                    {'error': '유효하지 않은 사용자입니다.'}, 
                    status=401
                )
        
        return super().dispatch(request, *args, **kwargs)


def get_user_queryset_filter(request):
    """
    request에서 사용자 필터를 반환하는 유틸리티 함수
    
    Usage:
        queryset = Model.objects.filter(**get_user_queryset_filter(request))
    """
    return {'user_id': request.user_id}