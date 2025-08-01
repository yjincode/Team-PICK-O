from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Business, FishType, Inventory, Order, OrderItem, 
    SMSRecommendation, Payment, PriceData
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'business_name', 'owner_name', 'phone_number', 'subscription_plan', 'created_at')
    list_filter = ('subscription_plan', 'created_at')
    search_fields = ('username', 'business_name', 'owner_name', 'phone_number')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('비즈니스 정보', {
            'fields': ('business_name', 'owner_name', 'phone_number', 'address', 
                      'business_registration_number', 'firebase_uid', 'subscription_plan')
        }),
    )


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'phone_number', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('business_name', 'phone_number', 'user__business_name')


@admin.register(FishType)
class FishTypeAdmin(admin.ModelAdmin):
    list_display = ('fish_name', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('fish_name', 'aliases', 'user__business_name')


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('fish_type', 'user', 'stock_quantity', 'unit', 'status', 'updated_at')
    list_filter = ('status', 'unit', 'updated_at')
    search_fields = ('fish_type__fish_name', 'user__business_name')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('business', 'user', 'total_price', 'delivery_date', 'status', 'order_datetime')
    list_filter = ('status', 'source_type', 'order_datetime', 'delivery_date')
    search_fields = ('business__business_name', 'user__business_name')
    inlines = []


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1


OrderAdmin.inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'fish_type', 'quantity', 'unit_price', 'unit')
    list_filter = ('unit',)
    search_fields = ('fish_type__fish_name', 'order__business__business_name')


@admin.register(SMSRecommendation)
class SMSRecommendationAdmin(admin.ModelAdmin):
    list_display = ('business', 'user', 'fish_type', 'price_trend', 'is_sent', 'created_at')
    list_filter = ('is_sent', 'price_trend', 'created_at')
    search_fields = ('business__business_name', 'fish_type', 'user__business_name')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('business', 'user', 'amount', 'method', 'status', 'paid_at')
    list_filter = ('method', 'status', 'created_at', 'paid_at')
    search_fields = ('business__business_name', 'user__business_name')


@admin.register(PriceData)
class PriceDataAdmin(admin.ModelAdmin):
    list_display = ('fish_type', 'market_name', 'date', 'min_price', 'max_price', 'avg_price')
    list_filter = ('market_name', 'date')
    search_fields = ('fish_type', 'market_name')
    date_hierarchy = 'date'