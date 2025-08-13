from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
import uuid


class User(AbstractUser):
    """커스텀 사용자 모델"""
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)
    business_name = models.CharField(max_length=200, blank=True)
    owner_name = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    
    STATUS_CHOICES = [
        ('pending', '승인 대기'),
        ('approved', '승인됨'),
        ('rejected', '거절됨'),
        ('suspended', '정지됨'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = "사용자"
        verbose_name_plural = "사용자들"
    
    def __str__(self):
        return f"{self.business_name} ({self.owner_name})"

class Business(models.Model):
    """거래처 모델"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='businesses')
    business_name = models.CharField(max_length=100, verbose_name="거래처명")
    phone_number = models.CharField(
        max_length=15,
        validators=[RegexValidator(
            regex=r'^\d{9,12}$',
            message="전화번호는 9~12자리의 숫자여야 합니다."
            )],
        verbose_name="전화번호"
    )

    address = models.TextField(verbose_name="주소")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="등록일시")

    class Meta:
        db_table = 'businesses'
        verbose_name = "거래처"
        verbose_name_plural = "거래처들"

    def __str__(self):
        return self.business_name
