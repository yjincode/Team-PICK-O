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
        validators=[RegexValidator(r'^\d{3}-\d{3,4}-\d{4}$')],
        verbose_name="전화번호"
    )
    address = models.TextField(verbose_name="주소")
    business_registration_number = models.CharField(
        max_length=12,
        validators=[RegexValidator(r'^\d{3}-\d{2}-\d{5}$')],
        null=True, blank=True,
        verbose_name="사업자등록번호"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="등록일시")

    class Meta:
        db_table = 'businesses'
        verbose_name = "거래처"
        verbose_name_plural = "거래처들"

    def __str__(self):
        return self.business_name

class SMSRecommendation(models.Model):
    """SMS 추천 모델"""
    PRICE_TREND_CHOICES = [
        ('up', '상승'),
        ('down', '하락'),
        ('stable', '안정')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sms_recommendations')
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='sms_recommendations')
    recommended_text = models.TextField(verbose_name="추천 텍스트")
    fish_type = models.CharField(max_length=50, verbose_name="어종")
    price_trend = models.CharField(max_length=10, choices=PRICE_TREND_CHOICES, verbose_name="가격 동향")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    is_sent = models.BooleanField(default=False, verbose_name="발송여부")
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="발송일시")

    class Meta:
        db_table = 'sms_recommendations'
        verbose_name = "SMS 추천"
        verbose_name_plural = "SMS 추천들"

    def __str__(self):
        return f"{self.business.business_name} - {self.fish_type}"

class PriceData(models.Model):
    """시세 데이터 모델"""
    id = models.AutoField(primary_key=True)
    fish_type = models.CharField(max_length=50, verbose_name="어종")
    market_name = models.CharField(max_length=50, verbose_name="시장명")
    date = models.DateField(verbose_name="날짜")
    min_price = models.IntegerField(verbose_name="최저가")
    max_price = models.IntegerField(verbose_name="최고가")
    avg_price = models.IntegerField(verbose_name="평균가")

    class Meta:
        db_table = 'price_data'
        verbose_name = "시세 데이터"
        verbose_name_plural = "시세 데이터들"
        unique_together = ['fish_type', 'market_name', 'date']

    def __str__(self):
        return f"{self.fish_type} - {self.market_name} ({self.date})"

