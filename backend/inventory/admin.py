from django.contrib import admin
from .models import Inventory, InventoryLog


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['fish_type', 'stock_quantity', 'unit', 'status', 'updated_at']
    list_filter = ['status', 'unit']
    search_fields = ['fish_type__name']
    readonly_fields = ['updated_at']


@admin.register(InventoryLog)
class InventoryLogAdmin(admin.ModelAdmin):
    list_display = ['inventory', 'fish_type', 'type', 'change', 'unit', 'source_type', 'created_at']
    list_filter = ['type', 'source_type', 'created_at']
    search_fields = ['fish_type__name', 'memo']
    readonly_fields = ['created_at'] 