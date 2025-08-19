#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
데이터베이스 초기화 스크립트 (User 테이블 제외)
실행: python manage.py shell -c "exec(open('clear_data.py').read())"
윈도우: python manage.py shell -c "exec(open('clear_data.py', encoding='utf-8').read())"
"""

import os
import django
from django.db import transaction

# Django 모델 임포트
from business.models import Business
from fish_registry.models import FishType
from inventory.models import Inventory, StockTransaction
from order.models import Order, OrderItem
from payment.models import Payment

def clear_all_data_except_users():
    print("🗑️  데이터베이스 초기화 시작 (User 테이블 제외)...")
    
    # 삭제 전 현재 데이터 수량 확인
    print("\n📊 삭제 전 데이터 현황:")
    print(f"🏢 거래처: {Business.objects.count()}개")
    print(f"🐟 어종: {FishType.objects.count()}개")
    print(f"📦 재고: {Inventory.objects.count()}개")
    print(f"🔄 재고거래: {StockTransaction.objects.count()}개")
    print(f"📋 주문: {Order.objects.count()}개")
    print(f"📝 주문아이템: {OrderItem.objects.count()}개")
    print(f"💳 결제: {Payment.objects.count()}개")
    
    # 사용자 확인
    try:
        with transaction.atomic():
            # 의존성 순서에 따라 삭제 (외래키 관계 고려)
            print("\n🗑️  데이터 삭제 중...")
            
            # 1. 결제 데이터 삭제
            payment_count = Payment.objects.count()
            Payment.objects.all().delete()
            print(f"✅ 결제 데이터 삭제: {payment_count}개")
            
            # 2. 주문 아이템 삭제
            order_item_count = OrderItem.objects.count()
            OrderItem.objects.all().delete()
            print(f"✅ 주문 아이템 삭제: {order_item_count}개")
            
            # 3. 재고 거래 내역 삭제
            stock_transaction_count = StockTransaction.objects.count()
            StockTransaction.objects.all().delete()
            print(f"✅ 재고 거래 삭제: {stock_transaction_count}개")
            
            # 4. 주문 삭제
            order_count = Order.objects.count()
            Order.objects.all().delete()
            print(f"✅ 주문 삭제: {order_count}개")
            
            # 5. 재고 삭제
            inventory_count = Inventory.objects.count()
            Inventory.objects.all().delete()
            print(f"✅ 재고 삭제: {inventory_count}개")
            
            # 6. 어종 삭제
            fish_type_count = FishType.objects.count()
            FishType.objects.all().delete()
            print(f"✅ 어종 삭제: {fish_type_count}개")
            
            # 7. 거래처 삭제
            business_count = Business.objects.count()
            Business.objects.all().delete()
            print(f"✅ 거래처 삭제: {business_count}개")
            
        print("\n✅ 데이터 삭제 완료!")
        
        # 삭제 후 확인
        print("\n📊 삭제 후 데이터 현황:")
        print(f"🏢 거래처: {Business.objects.count()}개")
        print(f"🐟 어종: {FishType.objects.count()}개")
        print(f"📦 재고: {Inventory.objects.count()}개")
        print(f"🔄 재고거래: {StockTransaction.objects.count()}개")
        print(f"📋 주문: {Order.objects.count()}개")
        print(f"📝 주문아이템: {OrderItem.objects.count()}개")
        print(f"💳 결제: {Payment.objects.count()}개")
        
        print("\n🎉 데이터베이스 초기화 완료! (User 데이터는 보존됨)")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print("💡 트랜잭션이 롤백되었습니다.")

# 안전장치: 확인 메시지
def confirm_and_clear():
    print("⚠️  경고: 이 스크립트는 User 테이블을 제외한 모든 데이터를 삭제합니다!")
    print("📋 삭제될 데이터:")
    print("   - 거래처 (Business)")
    print("   - 어종 (FishType)")
    print("   - 재고 (Inventory)")
    print("   - 재고거래 (StockTransaction)")
    print("   - 주문 (Order)")
    print("   - 주문아이템 (OrderItem)")
    print("   - 결제 (Payment)")
    print()
    print("🔒 보존될 데이터:")
    print("   - 사용자 (User) - 로그인 계정 정보")
    print()
    
    # 자동 실행 (스크립트이므로)
    clear_all_data_except_users()

# 스크립트 실행
confirm_and_clear()