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


class FishType(models.Model):
    """어종 모델"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fish_types')
    fish_name = models.CharField(max_length=50, verbose_name="어종명")
    aliases = models.TextField(null=True, blank=True, verbose_name="별칭들")
    embedding = models.JSONField(null=True, blank=True, verbose_name="벡터 임베딩")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="등록일시")

    class Meta:
        db_table = 'fish_types'
        verbose_name = "어종"
        verbose_name_plural = "어종들"

    def __str__(self):
        return self.fish_name


class Inventory(models.Model):
    """재고 모델"""
    STATUS_CHOICES = [
        ('available', '판매가능'),
        ('reserved', '예약됨'),
        ('sold', '판매완료'),
        ('expired', '유통기한만료')
    ]
    
    UNIT_CHOICES = [
        ('kg', 'kg'),
        ('box', '상자'),
        ('piece', '마리')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventories')
    fish_type = models.ForeignKey(FishType, on_delete=models.CASCADE, related_name='inventories')
    stock_quantity = models.FloatField(verbose_name="재고수량")
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg', verbose_name="단위")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', verbose_name="상태")
    aquarium_photo_path = models.TextField(null=True, blank=True, verbose_name="수조 사진 경로")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")

    class Meta:
        db_table = 'inventories'
        verbose_name = "재고"
        verbose_name_plural = "재고들"

    def __str__(self):
        return f"{self.fish_type.fish_name} - {self.stock_quantity}{self.unit}"


class Order(models.Model):
    """주문 모델"""
    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('confirmed', '확인됨'),
        ('preparing', '준비중'),
        ('shipped', '출고됨'),
        ('delivered', '배송완료'),
        ('cancelled', '취소됨')
    ]

    SOURCE_TYPE_CHOICES = [
        ('voice', '음성'),
        ('text', '텍스트'),
        ('manual', '수동입력')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='orders')
    total_price = models.IntegerField(verbose_name="총액")
    order_datetime = models.DateTimeField(verbose_name="주문일시")
    memo = models.TextField(null=True, blank=True, verbose_name="메모")
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPE_CHOICES, verbose_name="입력방식")
    raw_input_path = models.TextField(null=True, blank=True, verbose_name="원본 입력 파일 경로")
    transcribed_text = models.TextField(null=True, blank=True, verbose_name="변환된 텍스트")
    delivery_date = models.DateField(verbose_name="배송일")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="상태")

    class Meta:
        db_table = 'orders'
        verbose_name = "주문"
        verbose_name_plural = "주문들"

    def __str__(self):
        return f"{self.business.business_name} - {self.total_price}원"


class OrderItem(models.Model):
    """주문 아이템 모델"""
    UNIT_CHOICES = [
        ('kg', 'kg'),
        ('box', '상자'),
        ('piece', '마리')
    ]

    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    fish_type = models.ForeignKey(FishType, on_delete=models.CASCADE, related_name='order_items')
    quantity = models.FloatField(verbose_name="수량")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="단가")
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg', verbose_name="단위")

    class Meta:
        db_table = 'order_items'
        verbose_name = "주문 아이템"
        verbose_name_plural = "주문 아이템들"

    def __str__(self):
        return f"{self.fish_type.fish_name} {self.quantity}{self.unit}"


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


class Payment(models.Model):
    """결제 모델"""
    METHOD_CHOICES = [
        ('cash', '현금'),
        ('card', '카드'),
        ('transfer', '계좌이체'),
        ('check', '수표')
    ]

    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('completed', '완료'),
        ('cancelled', '취소'),
        ('failed', '실패')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='payments')
    amount = models.IntegerField(verbose_name="금액")
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, verbose_name="결제방법")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', verbose_name="상태")
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="결제일시")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")

    class Meta:
        db_table = 'payments'
        verbose_name = "결제"
        verbose_name_plural = "결제들"

    def __str__(self):
        return f"{self.business.business_name} - {self.amount}원"


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

