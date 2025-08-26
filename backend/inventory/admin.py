from django.contrib import admin
from .models import Inventory, InventoryLog, InventoryAnomaly, InventoryPattern, StockTransaction


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['fish_type', 'user', 'stock_quantity', 'ordered_quantity', 'unit', 'status', 'updated_at']
    list_filter = ['status', 'unit', 'updated_at']
    search_fields = ['fish_type__name', 'user__username']
    readonly_fields = ['updated_at']


@admin.register(InventoryLog)
class InventoryLogAdmin(admin.ModelAdmin):
    list_display = ['fish_type', 'type', 'change', 'before_quantity', 'after_quantity', 'unit', 'source_type', 'created_at']
    list_filter = ['type', 'source_type', 'created_at']
    search_fields = ['fish_type__name', 'memo']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('inventory', 'fish_type', 'type', 'change', 'before_quantity', 'after_quantity', 'unit')
        }),
        ('처리 정보', {
            'fields': ('source_type', 'memo', 'updated_by')
        })
    )


@admin.register(InventoryAnomaly)
class InventoryAnomalyAdmin(admin.ModelAdmin):
    list_display = ['inventory', 'anomaly_type', 'severity', 'confidence_score', 'detected_at', 'resolved_at']
    list_filter = ['anomaly_type', 'severity', 'detected_at', 'resolved_at']
    search_fields = ['inventory__fish_type__name', 'description', 'recommended_action']
    readonly_fields = ['detected_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('log', 'inventory', 'anomaly_type', 'severity', 'confidence_score')
        }),
        ('상세 정보', {
            'fields': ('description', 'recommended_action', 'prediction_horizon')
        }),
        ('AI 모델 정보', {
            'fields': ('ai_model_version', 'features_used'),
            'classes': ('collapse',)
        }),
        ('시간 정보', {
            'fields': ('detected_at', 'resolved_at')
        })
    )


@admin.register(InventoryPattern)
class InventoryPatternAdmin(admin.ModelAdmin):
    list_display = ['fish_type', 'pattern_type', 'is_active', 'last_updated']
    list_filter = ['pattern_type', 'is_active', 'last_updated']
    search_fields = ['fish_type__name']
    readonly_fields = ['last_updated']


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ['fish_type', 'transaction_type', 'quantity_change', 'unit', 'user', 'created_at']
    list_filter = ['transaction_type', 'unit', 'created_at']
    search_fields = ['fish_type__name', 'user__username', 'notes']
    readonly_fields = ['created_at'] 