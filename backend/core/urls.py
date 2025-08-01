from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # 사용자 관련
    path('auth/register/', views.register_user, name='register'),
    path('auth/status/', views.check_user_status, name='check_status'),
    path('auth/pending/', views.pending_users, name='pending_users'),
    
    # 거래처 관리
    path('businesses/', views.BusinessListCreateView.as_view(), name='business_list'),
    
    # 어종 관리
    path('fish-types/', views.FishTypeListCreateView.as_view(), name='fish_type_list'),
    
    # 재고 관리
    path('inventories/', views.InventoryListCreateView.as_view(), name='inventory_list'),
    
    # 주문 관리
    path('orders/', views.OrderListCreateView.as_view(), name='order_list'),
    
    # 결제 관리
    path('payments/', views.PaymentListCreateView.as_view(), name='payment_list'),
]