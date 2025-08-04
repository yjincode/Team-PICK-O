from django.contrib import admin
from .models import Order, OrderItem, Business, FishType

@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'phone_number', 'address']
    search_fields = ['business_name', 'phone_number']

@admin.register(FishType)
class FishTypeAdmin(admin.ModelAdmin):
    list_display = ['fish_name', 'unit']
    list_filter = ['unit']
    search_fields = ['fish_name']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'business', 'total_price', 'source_type', 'status', 'order_datetime']
    list_filter = ['status', 'source_type']
    search_fields = ['business__business_name', 'memo']
    readonly_fields = ['order_datetime']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'fish_type', 'quantity', 'unit_price', 'unit']
    list_filter = ['fish_type__unit']
    search_fields = ['order__id', 'fish_type__fish_name']
