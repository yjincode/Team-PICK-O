from django.db import models
from django.conf import settings


class Order(models.Model):
    """주문 테이블"""
    
    SOURCE_CHOICES = [
        ('manual', '수동'),
        ('voice', '음성'),
        ('text', '문자'),
    ]
    
    STATUS_CHOICES = [
        ('placed', '등록됨'),
        ('ready', '출고 준비'),
        ('delivered', '납품 완료'),
        ('cancelled', '취소됨'),
    ]

    id = models.AutoField(primary_key=True, verbose_name="주문 ID")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        verbose_name="사용자"
    )
    business = models.ForeignKey(
        'business.Business', 
        on_delete=models.CASCADE, 
        verbose_name="거래처 ID"
    )

    total_price = models.IntegerField(default=0, verbose_name="총 주문 금액")
    order_datetime = models.DateTimeField(auto_now_add=True, verbose_name="주문 등록 일시")
    memo = models.TextField(blank=True, null=True, verbose_name="주문 메모")

    source_type = models.CharField(
        max_length=20, 
        choices=SOURCE_CHOICES, 
        verbose_name="주문 방식"
    )
    raw_input_path = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="원문 경로 (음성 mp3 또는 문자 원문)"
    )
    transcribed_text = models.TextField(blank=True, null=True, verbose_name="파싱된 텍스트")

    delivery_datetime = models.DateTimeField(blank=True, null=True, verbose_name="납기일")
    ship_out_datetime = models.DateTimeField(blank=True, null=True, verbose_name="출고일")

    order_status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='placed', 
        verbose_name="주문 상태"
    )
    cancel_reason = models.TextField(blank=True, null=True, verbose_name="취소 사유")

    is_urgent = models.BooleanField(default=False, verbose_name="긴급 주문 여부")
    has_stock_issues = models.BooleanField(default=False, verbose_name="재고 부족 여부")
    last_updated_at = models.DateTimeField(auto_now=True, verbose_name="최종 수정 일시")

    class Meta:
        db_table = 'orders'
        verbose_name = '주문'
        verbose_name_plural = '주문들'
        ordering = ['-order_datetime']

    def __str__(self):
        return f"주문 #{self.id} - {self.business.business_name}"


class OrderItem(models.Model):
    """주문 아이템 테이블"""
    
    id = models.AutoField(primary_key=True, verbose_name="주문 품목 ID")
    order = models.ForeignKey(
        Order, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name="주문 ID"
    )

    fish_type = models.ForeignKey(
        'fish_registry.FishType', 
        on_delete=models.CASCADE, 
        verbose_name="어종 ID"
    )

    # inventory = models.ForeignKey(
    #     'inventory.Inventory',
    #     on_delete=models.SET_NULL,
    #     blank=True,
    #     null=True,
    #     verbose_name="연결된 재고 ID"
    # )

    item_name_snapshot = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="주문 당시 품목명 스냅샷"
    )
    quantity = models.FloatField(verbose_name="주문 수량 (소수 허용)")
    unit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True, 
        verbose_name="현재 단가"
    )
    unit_price_snapshot = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True, 
        verbose_name="주문 당시 단가 스냅샷"
    )
    unit = models.CharField(max_length=20, blank=True, null=True, verbose_name="단위 (kg, box 등)")
    remarks = models.TextField(blank=True, null=True, verbose_name="요청사항")

    class Meta:
        db_table = 'order_items'
        verbose_name = '주문 품목'
        verbose_name_plural = '주문 품목들'

    def __str__(self):
        return f"{self.fish_type.name} - {self.quantity} {self.unit}"