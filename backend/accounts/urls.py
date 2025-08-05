from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # 기본 인증 API는 추후 구현
    path('profile/', views.get_user_profile, name='profile'),
]