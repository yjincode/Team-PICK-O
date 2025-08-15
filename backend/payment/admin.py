"""
결제 관리 Django Admin 설정
"""
from django.contrib import admin
from .models import Payment, CashReceipt, TaxInvoice


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'business', 'amount', 'method', 'payment_status', 'paid_at', 'created_at']
    list_filter = ['payment_status', 'method', 'refunded', 'created_at']
    search_fields = ['order__id', 'business__business_name', 'merchant_uid', 'imp_uid']
    readonly_fields = ['created_at', 'paid_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('order', 'business', 'amount', 'method', 'payment_status')
        }),
        ('시간 정보', {
            'fields': ('paid_at', 'created_at')
        }),
        ('PG사 정보', {
            'fields': ('imp_uid', 'merchant_uid', 'receipt_url', 'card_approval_number'),
            'classes': ('collapse',)
        }),
        ('계좌/현금 정보', {
            'fields': ('bank_name', 'payer_name'),
            'classes': ('collapse',)
        }),
        ('환불 정보', {
            'fields': ('refunded', 'refund_reason'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CashReceipt)
class CashReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'is_requested', 'is_issued', 'receipt_number']
    list_filter = ['is_requested', 'is_issued']
    search_fields = ['payment__id', 'receipt_number', 'receipt_contact', 'business_number']


@admin.register(TaxInvoice)
class TaxInvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'is_requested', 'is_issued', 'invoice_number']
    list_filter = ['is_requested', 'is_issued']
    search_fields = ['payment__id', 'invoice_number']
