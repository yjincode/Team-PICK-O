from django.urls import path
from . import views
from .views import BusinessCreateAPIView, BusinessListAPIView

urlpatterns = [
    path('auth/register/', views.register_user, name='register_user'),
    path('auth/status/', views.check_user_status, name='check_user_status'),
    path('customers/', BusinessListAPIView.as_view()),  # GET: 목록 조회 (인증 불필요)
    path('customers/create/', BusinessCreateAPIView.as_view()),  # POST: 생성 (인증 필요)
    path('customers/<int:pk>/', BusinessCreateAPIView.as_view()),  # PUT: 수정 (추가)

] 