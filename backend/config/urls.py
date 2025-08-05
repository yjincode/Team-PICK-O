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
            "fish_analysis": "/api/v1/fish/",
        }
    })

def health_check(request):
    """헬스 체크 엔드포인트"""
    return JsonResponse({"status": "healthy"})

urlpatterns = [
    # Root endpoints
    path('', api_root, name='api-root'),
    path('health/', health_check, name='health-check'),
    
    # Admin panel
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/v1/', include('business.urls')),
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/dashboard/', include('dashboard.urls')),
    path('api/v1/fish/', include('fish_analysis.urls')),

    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Static and media files serving in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
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