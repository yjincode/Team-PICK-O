from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """커스텀 사용자 모델"""
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)
    business_name = models.CharField(max_length=200, blank=True)
    owner_name = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    business_registration_number = models.CharField(max_length=50, blank=True)
    subscription_plan = models.CharField(max_length=20, default='basic')
    
    STATUS_CHOICES = [
        ('pending', '승인 대기'),
        ('approved', '승인됨'),
        ('rejected', '거절됨'),
        ('suspended', '정지됨'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.business_name} ({self.owner_name})"