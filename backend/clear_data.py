#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
모든 샘플 데이터 삭제 스크립트
실행: python manage.py shell -c "exec(open('clear_data.py').read())"
"""

import os
import django
from django.db import transaction

# Django 모델 import
from business.models import Business, User
from fish_registry.models import FishType
from inventory.models import Inventory, InventoryLog, InventoryAnomaly, InventoryPattern, StockTransaction
from order.models import Order, OrderItem
from payment.models import Payment, CashReceipt, TaxInvoice

def clear_all_data():
    """모든 데이터 삭제"""
    print("🗑️ 모든 데이터 삭제 시작...")
    
    with transaction.atomic():
        try:
            # 1. 결제 관련 데이터 삭제
            print("💳 결제 관련 데이터 삭제 중...")
            TaxInvoice.objects.all().delete()
            CashReceipt.objects.all().delete()
            Payment.objects.all().delete()
            print("✅ 결제 데이터 삭제 완료")
            
            # 2. 주문 관련 데이터 삭제
            print("📋 주문 관련 데이터 삭제 중...")
            OrderItem.objects.all().delete()
            Order.objects.all().delete()
            print("✅ 주문 데이터 삭제 완료")
            
            # 3. 재고 관련 데이터 삭제
            print("📦 재고 관련 데이터 삭제 중...")
            StockTransaction.objects.all().delete()
            InventoryAnomaly.objects.all().delete()
            InventoryPattern.objects.all().delete()
            InventoryLog.objects.all().delete()
            Inventory.objects.all().delete()
            print("✅ 재고 데이터 삭제 완료")
            
            # 4. 어종 데이터 삭제
            print("🐟 어종 데이터 삭제 중...")
            FishType.objects.all().delete()
            print("✅ 어종 데이터 삭제 완료")
            
            # 5. 거래처 데이터 삭제
            print("🏢 거래처 데이터 삭제 중...")
            Business.objects.all().delete()
            print("✅ 거래처 데이터 삭제 완료")
            
            print("🎉 모든 데이터 삭제 완료!")
            
        except Exception as e:
            print(f"❌ 데이터 삭제 중 오류: {e}")
            raise e

def clear_data_counts():
    """삭제 전후 데이터 개수 확인"""
    print("\n📊 현재 데이터 개수:")
    print(f"🏢 거래처: {Business.objects.count()}개")
    print(f"🐟 어종: {FishType.objects.count()}개")
    print(f"📦 재고: {Inventory.objects.count()}개")
    print(f"📋 주문: {Order.objects.count()}개")
    print(f"🛒 주문 아이템: {OrderItem.objects.count()}개")
    print(f"💳 결제: {Payment.objects.count()}개")
    print(f"📄 세금계산서: {TaxInvoice.objects.count()}개")
    print(f"🧾 현금영수증: {CashReceipt.objects.count()}개")
    print(f"📝 재고 로그: {InventoryLog.objects.count()}개")
    print(f"🚨 재고 이상: {InventoryAnomaly.objects.count()}개")
    print(f"📊 재고 패턴: {InventoryPattern.objects.count()}개")
    print(f"🔄 재고 거래: {StockTransaction.objects.count()}개")

# 스크립트 실행
print("=" * 50)
print("🗑️  데이터 정리 스크립트")
print("=" * 50)

clear_data_counts()
clear_all_data()
clear_data_counts()

print("\n✅ 데이터 정리 완료! 이제 sample_data.py를 실행할 수 있습니다.")