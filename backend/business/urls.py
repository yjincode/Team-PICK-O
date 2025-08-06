from django.urls import path
from . import views
from .views import BusinessCreateAPIView, BusinessListAPIView

urlpatterns = [
    path('auth/register/', views.register_user, name='register_user'),
    path('auth/status/', views.check_user_status, name='check_user_status'),
    path('customers/', BusinessCreateAPIView.as_view()),
    path('customerslist/', BusinessListAPIView.as_view()), 
] 