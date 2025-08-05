from django.db import models
from django.conf import settings


class UserProfile(models.Model):
    """사용자 프로필 확장"""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True, verbose_name='전화번호')
    organization = models.CharField(max_length=200, blank=True, verbose_name='소속 기관')
    bio = models.TextField(blank=True, verbose_name='소개')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name='프로필 이미지')
    
    # 설정
    email_notifications = models.BooleanField(default=True, verbose_name='이메일 알림')
    analysis_count = models.PositiveIntegerField(default=0, verbose_name='분석 횟수')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profile'
        verbose_name = '사용자 프로필'
        verbose_name_plural = '사용자 프로필들'
        
    def __str__(self):
        return f"{self.user.username}의 프로필"