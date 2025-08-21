from django.urls import path
from . import views
from .views import (
    BusinessCreateView, BusinessListAPIView, BusinessDetailAPIView
)

urlpatterns = [
    # 일반 인증 API
    path('auth/register/', views.register_user, name='register_user'),
    path('auth/status/', views.check_user_status, name='check_user_status'),
    path('auth/get-user-id/', views.get_user_id_from_token, name='get_user_id_from_token'),
    path('auth/firebase-to-jwt/', views.firebase_to_jwt_exchange, name='firebase_to_jwt_exchange'),  # Firebase 토큰 → JWT 페어 교환
    path('auth/refresh/', views.refresh_access_token, name='refresh_access_token'),  # 리프레시 토큰으로 액세스 토큰 갱신
    
    # 슈퍼계정 전용 API (Firebase 완전 우회)
    path('auth/super-login/', views.super_account_login, name='super_account_login'),  # 슈퍼계정 직접 로그인
    path('auth/super-register/', views.super_account_register, name='super_account_register'),  # 슈퍼계정 직접 회원가입
    
    # 거래처 관리 API
    path('customers/', BusinessListAPIView.as_view()),  # GET: 목록 조회 (인증 필요)
    path('customers/create/', BusinessCreateView.as_view()),  # POST: 생성 (인증 필요)
    path('customers/<int:pk>/', BusinessDetailAPIView.as_view()), 

] 