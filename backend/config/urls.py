"""
URL configuration for Team-PICK-O Backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

def api_root(request):
    """API 루트 엔드포인트"""
    return JsonResponse({
        "message": "Team-PICK-O Backend API",
        "status": "running",
        "version": "1.0.0",
        "framework": "Django + DRF",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/v1/",
            "docs": "/api/docs/",
            "redoc": "/api/redoc/",
            "business": "/api/v1/business/",
            "accounts": "/api/v1/accounts/",
            "dashboard": "/api/v1/dashboard/",
            "orders": "/api/v1/orders/",
            "payments": "/api/v1/payments/", 
            "inventory": "/api/v1/inventory/",
            "fish_registry": "/api/v1/fish-registry/",
            "sales": "/api/v1/sales/",
        }
    })

def health_check(request):
    """헬스 체크 엔드포인트"""
    return JsonResponse({"status": "healthy"})

def test_jwt(request):
    """JWT 검증 테스트 엔드포인트"""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        return JsonResponse({
            "message": "JWT 토큰 수신됨",
            "token_preview": token[:20] + "..." if len(token) > 20 else token,
            "has_user_id": hasattr(request, 'user_id'),
            "user_id": getattr(request, 'user_id', None),
            "user_status": getattr(request, 'user_status', None)
        })
    else:
        return JsonResponse({
            "message": "JWT 토큰 없음",
            "auth_header": auth_header
        })



urlpatterns = [
    # Root endpoints
    path('', api_root, name='api-root'),
    path('health/', health_check, name='health-check'),
    path('test-jwt/', test_jwt, name='test-jwt'),
    
    # Admin panel
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/v1/business/', include('business.urls')),
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/dashboard/', include('dashboard.urls')),
    # path('api/v1/fish/', include('fish_analysis.urls')),  # PyTorch 의존성으로 임시 비활성화
    path('api/v1/orders/', include('order.urls')),  # 복수형으로 수정
    path('api/v1/payments/', include('payment.urls')),  # 결제 API
    path('api/v1/inventory/', include('inventory.urls')),
    path('api/v1/fish-registry/', include('fish_registry.urls')),
    path('api/v1/transcription/', include('transcription.urls')),
    path('api/v1/sales/', include('sales.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Media files serving in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Django Debug Toolbar (optional)
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# Custom error handlers
handler404 = 'config.views.handler404'
handler500 = 'config.views.handler500'