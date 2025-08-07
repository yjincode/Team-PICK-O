from django.contrib import admin
from .models import Payment, CashReceipt, TaxInvoice


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'business', 'amount', 'method', 'payment_status', 'created_at']
    list_filter = ['method', 'payment_status', 'refunded', 'created_at']
    search_fields = ['business__business_name', 'imp_uid', 'merchant_uid']
    readonly_fields = ['created_at']


@admin.register(CashReceipt)
class CashReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'is_requested', 'is_issued', 'receipt_number']
    list_filter = ['is_requested', 'is_issued']
    search_fields = ['receipt_number', 'receipt_contact', 'business_number']


@admin.register(TaxInvoice)
class TaxInvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'is_requested', 'is_issued', 'invoice_number']
    list_filter = ['is_requested', 'is_issued']
    search_fields = ['invoice_number'] 