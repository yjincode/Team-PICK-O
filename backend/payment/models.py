from django.db import models


class Payment(models.Model):
    """결제 모델"""
    METHOD_CHOICES = [
        ('cash', '현금'),
        ('bank_transfer', '계좌이체'),
        ('card', '카드'),
    ]

    STATUS_CHOICES = [
        ('pending', '대기'),
        ('paid', '결제완료'),
        ('refunded', '환불됨'),
    ]

    id = models.AutoField(primary_key=True)
    order = models.ForeignKey('order.Order', on_delete=models.CASCADE, verbose_name="주문")
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE, verbose_name="거래처")
    
    amount = models.IntegerField(verbose_name="결제 금액")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, verbose_name="결제 수단")
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="결제 상태")
    
    paid_at = models.DateTimeField(blank=True, null=True, verbose_name="결제 완료 시각")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="결제 등록 시각")
    
    # PG사 관련 정보
    imp_uid = models.TextField(blank=True, null=True, verbose_name="PG사 결제 고유 ID")
    merchant_uid = models.TextField(blank=True, null=True, verbose_name="시스템 결제 ID")
    receipt_url = models.TextField(blank=True, null=True, verbose_name="발급된 영수증 URL")
    card_approval_number = models.TextField(blank=True, null=True, verbose_name="카드 승인 번호")
    
    # 계좌이체 관련 정보
    bank_name = models.TextField(blank=True, null=True, verbose_name="은행명")
    payer_name = models.TextField(blank=True, null=True, verbose_name="입금자명")
    
    # 환불 관련 정보
    refunded = models.BooleanField(default=False, verbose_name="환불 여부")
    refund_reason = models.TextField(blank=True, null=True, verbose_name="환불 사유")

    class Meta:
        db_table = 'payments'
        verbose_name = '결제'
        verbose_name_plural = '결제들'

    def __str__(self):
        return f"결제 #{self.id} - {self.business.business_name} ({self.amount:,}원)"


class CashReceipt(models.Model):
    """현금영수증 모델"""
    id = models.AutoField(primary_key=True)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, verbose_name="결제")
    
    is_requested = models.BooleanField(default=False, verbose_name="현금영수증 요청 여부")
    is_issued = models.BooleanField(default=False, verbose_name="발급 여부")
    receipt_number = models.TextField(blank=True, null=True, verbose_name="현금영수증 번호")
    receipt_contact = models.TextField(blank=True, null=True, verbose_name="전화번호 (개인용)")
    business_number = models.TextField(blank=True, null=True, verbose_name="사업자 등록번호 (법인용)")

    class Meta:
        db_table = 'cash_receipts'
        verbose_name = '현금영수증'
        verbose_name_plural = '현금영수증들'

    def __str__(self):
        return f"현금영수증 #{self.id} - {self.payment}"


class TaxInvoice(models.Model):
    """세금계산서 모델"""
    id = models.AutoField(primary_key=True)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, verbose_name="결제")
    
    is_requested = models.BooleanField(default=False, verbose_name="세금계산서 요청 여부")
    is_issued = models.BooleanField(default=False, verbose_name="발급 여부")
    invoice_number = models.TextField(blank=True, null=True, verbose_name="세금계산서 번호")

    class Meta:
        db_table = 'tax_invoices'
        verbose_name = '세금계산서'
        verbose_name_plural = '세금계산서들'

    def __str__(self):
        return f"세금계산서 #{self.id} - {self.payment}" 