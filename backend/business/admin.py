from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Business


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'business_name', 'owner_name', 'phone_number', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('username', 'business_name', 'owner_name', 'phone_number')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('비즈니스 정보', {
            'fields': ('business_name', 'owner_name', 'phone_number', 'address', 
                      'firebase_uid', 'status')
        }),
    )


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'phone_number', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('business_name', 'phone_number', 'user__business_name')
