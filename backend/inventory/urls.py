from django.urls import path
from .views import (
    InventoryListCreateView, InventoryDetailView, 
    InventoryLogListView, FishTypeListView
)

app_name = 'inventory'

urlpatterns = [
    path('', InventoryListCreateView.as_view(), name='inventory-list-create'),
    path('<int:pk>/', InventoryDetailView.as_view(), name='inventory-detail'),
    path('<int:inventory_id>/logs/', InventoryLogListView.as_view(), name='inventory-logs'),
    path('logs/', InventoryLogListView.as_view(), name='all-inventory-logs'),
    path('fish-types/', FishTypeListView.as_view(), name='fish-types'),
]