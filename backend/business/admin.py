from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Business


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
