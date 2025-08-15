from django.contrib import admin
from .models import Order, OrderItem
from fish_registry.models import FishType

@admin.register(FishType)
class FishTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit']
    list_filter = ['unit']
    search_fields = ['name']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'business_id', 'total_price', 'source_type', 'order_status', 'order_datetime']
    list_filter = ['order_status', 'source_type']
    search_fields = ['business_id', 'memo']
    readonly_fields = ['order_datetime']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'fish_type', 'quantity', 'unit_price', 'unit']
    list_filter = ['fish_type__unit']
    search_fields = ['order__id', 'fish_type__name']
