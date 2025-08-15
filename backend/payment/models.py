"""
결제 관련 모델
주어진 DB 스키마에 맞춘 Payment, CashReceipt, TaxInvoice 모델
"""
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    """결제 테이블"""
    
    PAYMENT_METHODS = [
        ('card', '카드'),
        ('cash', '현금'),
        ('bank_transfer', '계좌이체'),
    ]
    
    PAYMENT_STATUS = [
        ('pending', '결제 대기'),
        ('paid', '결제 완료'),
        ('refunded', '환불됨'),
    ]
    
    # 기본 필드
    order = models.ForeignKey('order.Order', on_delete=models.CASCADE, db_column='order_id')
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE, db_column='business_id')
    
    amount = models.IntegerField(help_text="결제 금액")
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS, help_text="결제 수단")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending', help_text="결제 상태")
    
    # 시간 필드
    paid_at = models.DateTimeField(null=True, blank=True, help_text="결제 완료 시각")
    created_at = models.DateTimeField(default=timezone.now, help_text="결제 등록 시각")
    
    # PG사 관련 필드 (토스 페이먼츠)
    imp_uid = models.TextField(null=True, blank=True, help_text="PG사 결제 고유 ID")
    merchant_uid = models.TextField(null=True, blank=True, help_text="시스템 결제 ID")
    receipt_url = models.TextField(null=True, blank=True, help_text="발급된 영수증 URL")
    card_approval_number = models.TextField(null=True, blank=True, help_text="카드 승인 번호")
    
    # 계좌이체/현금 관련 필드
    bank_name = models.TextField(null=True, blank=True, help_text="은행명")
    payer_name = models.TextField(null=True, blank=True, help_text="입금자명")
    
    # 환불 관련 필드
    refunded = models.BooleanField(default=False, help_text="환불 여부")
    refund_reason = models.TextField(null=True, blank=True, help_text="환불 사유")
    
    class Meta:
        db_table = 'payments'
        verbose_name = '결제'
        verbose_name_plural = '결제 목록'
        ordering = ['-created_at']
        
        # 제약 조건: 동일 주문에 paid 상태가 최대 1건만 존재
        constraints = [
            models.UniqueConstraint(
                fields=['order'],
                condition=models.Q(payment_status='paid'),
                name='unique_paid_per_order'
            )
        ]
    
    def __str__(self):
        return f"결제 {self.id} - {self.get_method_display()} {self.amount:,}원 ({self.get_payment_status_display()})"
    
    def save(self, *args, **kwargs):
        # paid 상태로 변경될 때 paid_at 자동 설정
        if self.payment_status == 'paid' and not self.paid_at:
            self.paid_at = timezone.now()
        super().save(*args, **kwargs)


class CashReceipt(models.Model):
    """현금영수증 테이블"""
    
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, db_column='payment_id')
    
    is_requested = models.BooleanField(default=False, help_text="현금영수증 요청 여부")
    is_issued = models.BooleanField(default=False, help_text="발급 여부")
    receipt_number = models.TextField(null=True, blank=True, help_text="현금영수증 번호")
    receipt_contact = models.TextField(null=True, blank=True, help_text="전화번호 (개인용)")
    business_number = models.TextField(null=True, blank=True, help_text="사업자 등록번호 (법인용)")
    
    class Meta:
        db_table = 'cash_receipts'
        verbose_name = '현금영수증'
        verbose_name_plural = '현금영수증 목록'
    
    def __str__(self):
        return f"현금영수증 {self.id} - 결제 {self.payment.id} ({'발급됨' if self.is_issued else '미발급'})"


class TaxInvoice(models.Model):
    """세금계산서 테이블"""
    
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, db_column='payment_id')
    
    is_requested = models.BooleanField(default=False, help_text="세금계산서 요청 여부")
    is_issued = models.BooleanField(default=False, help_text="발급 여부")
    invoice_number = models.TextField(null=True, blank=True, help_text="세금계산서 번호")
    
    class Meta:
        db_table = 'tax_invoices'
        verbose_name = '세금계산서'
        verbose_name_plural = '세금계산서 목록'
    
    def __str__(self):
        return f"세금계산서 {self.id} - 결제 {self.payment.id} ({'발급됨' if self.is_issued else '미발급'})"
