from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register_user, name='register_user'),
    path('auth/status/', views.check_user_status, name='check_user_status'),
    path('auth/pending/', views.get_pending_users, name='get_pending_users'),
]