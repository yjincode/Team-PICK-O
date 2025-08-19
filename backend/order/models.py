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

    # 취소 사유 선택 옵션
    CANCEL_REASON_CHOICES = [
        ('customer_request', '고객 요청'),
        ('stock_shortage', '재고 부족'),
        ('quality_issue', '품질 문제'),
        ('delivery_delay', '배송 지연'),
        ('price_dispute', '가격 분쟁'),
        ('other', '기타'),
    ]

    # 환불 사유 선택 옵션
    REFUND_REASON_CHOICES = [
        ('customer_request', '고객 요청'),
        ('product_defect', '상품 하자'),
        ('wrong_delivery', '잘못된 배송'),
        ('delivery_delay', '배송 지연'),
        ('price_error', '가격 오류'),
        ('duplicate_payment', '중복 결제'),
        ('other', '기타'),
    ]

    id = models.AutoField(primary_key=True, verbose_name="주문 ID")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        verbose_name="사용자"
    )
    business_id = models.IntegerField(verbose_name="거래처 ID")

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
    
    # 취소/환불 관련 필드들
    cancel_reason = models.CharField(
        max_length=50,
        choices=CANCEL_REASON_CHOICES,
        blank=True,
        null=True,
        verbose_name="취소 사유"
    )
    cancel_reason_detail = models.TextField(
        blank=True,
        null=True,
        verbose_name="취소 사유 상세"
    )
    refund_reason = models.CharField(
        max_length=50,
        choices=REFUND_REASON_CHOICES,
        blank=True,
        null=True,
        verbose_name="환불 사유"
    )
    refund_reason_detail = models.TextField(
        blank=True,
        null=True,
        verbose_name="환불 사유 상세"
    )

    is_urgent = models.BooleanField(default=False, verbose_name="긴급 주문 여부")
    has_stock_issues = models.BooleanField(default=False, verbose_name="재고 부족 여부")
    last_updated_at = models.DateTimeField(auto_now=True, verbose_name="최종 수정 일시")

    @property
    def business(self):
        """거래처 객체 반환"""
        if not hasattr(self, '_business_cache'):
            from business.models import Business
            try:
                self._business_cache = Business.objects.get(id=self.business_id)
            except Business.DoesNotExist:
                self._business_cache = None
        return self._business_cache
    
    @property
    def payment(self):
        """결제 정보 반환 (가장 최근 결제)"""
        if not hasattr(self, '_payment_cache'):
            from payment.models import Payment
            try:
                self._payment_cache = Payment.objects.filter(order=self).order_by('-created_at').first()
            except:
                self._payment_cache = None
        return self._payment_cache

    class Meta:
        db_table = 'orders'
        verbose_name = '주문'
        verbose_name_plural = '주문들'
        ordering = ['-order_datetime']

    def __str__(self):
        return f"주문 #{self.id} - 거래처 ID: {self.business_id}"


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


class DocumentRequest(models.Model):
    """문서 발급 요청 테이블"""
    
    DOCUMENT_TYPE_CHOICES = [
        ('tax_invoice', '세금계산서'),
        ('cash_receipt', '현금영수증'),
    ]
    
    RECEIPT_TYPE_CHOICES = [
        ('individual', '개인'),
        ('business', '사업자'),
    ]
    
    id = models.AutoField(primary_key=True, verbose_name="문서 요청 ID")
    order = models.ForeignKey(
        Order, 
        on_delete=models.CASCADE, 
        related_name='document_requests',
        verbose_name="주문 ID"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        verbose_name="사용자"
    )
    
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPE_CHOICES,
        verbose_name="문서 타입"
    )
    
    # 현금영수증용 개인/사업자 구분
    receipt_type = models.CharField(
        max_length=20,
        choices=RECEIPT_TYPE_CHOICES,
        blank=True,
        null=True,
        verbose_name="영수증 타입 (현금영수증용)"
    )
    
    # 세금계산서: 사업자등록번호, 현금영수증: 휴대폰번호 또는 사업자등록번호
    identifier = models.CharField(
        max_length=20,
        verbose_name="식별번호 (사업자등록번호 또는 휴대폰번호)"
    )
    
    special_request = models.TextField(
        blank=True,
        null=True,
        verbose_name="특별 요청사항"
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', '대기중'),
            ('processing', '처리중'),
            ('completed', '완료'),
            ('failed', '실패'),
        ],
        default='pending',
        verbose_name="처리 상태"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="요청 일시")
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name="완료 일시")
    
    class Meta:
        db_table = 'document_requests'
        verbose_name = '문서 발급 요청'
        verbose_name_plural = '문서 발급 요청들'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_document_type_display()} - 주문 #{self.order.id}"