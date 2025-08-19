#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
수산물 샘플 데이터 생성 스크립트 (개선된 버전)
실행: python manage.py shell < sample_data.py
또는 윈도우: python manage.py shell -c "exec(open('sample_data.py', encoding='utf-8').read())"
"""

import os
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random
from django.utils import timezone

from business.models import Business, User
from fish_registry.models import FishType
from inventory.models import Inventory, StockTransaction
from order.models import Order, OrderItem
from payment.models import Payment, CashReceipt, TaxInvoice

def create_sample_data():
    print("🚀 수산물 샘플 데이터 생성 시작...")
    
    # 사용자 확인
    try:
        user = User.objects.get(id=1)
        print(f"✅ 사용자: {user.business_name} ({user.owner_name}) - ID: {user.id}")
    except User.DoesNotExist:
        print("❌ 사용자 ID 1번이 존재하지 않습니다.")
        return
    
    # 1. 거래처 생성 (12개로 축소, 상호명으로 변경)
    print("🏢 거래처 생성 중...")
    businesses_data = [
        {'name': '대양수산', 'phone': '02-1234-5678', 'addr': '서울 노량진동 123'},
        {'name': '해성상회', 'phone': '051-987-6543', 'addr': '부산 자갈치동 456'},
        {'name': '제주바다마트', 'phone': '064-111-2222', 'addr': '제주시 건입동 789'},
        {'name': '동해수산', 'phone': '032-555-6666', 'addr': '인천 연수구 101'},
        {'name': '남도해산물', 'phone': '061-222-3333', 'addr': '목포시 용해동 202'},
        {'name': '경남횟집', 'phone': '055-444-5555', 'addr': '통영시 중앙동 303'},
        {'name': '강원바다', 'phone': '033-999-1111', 'addr': '강릉시 교동 404'},
        {'name': '여수선어', 'phone': '061-888-7777', 'addr': '여수시 돌산읍 505'},
        {'name': '포항수협', 'phone': '054-222-9999', 'addr': '포항시 북구 606'},
        {'name': '울산활어', 'phone': '052-999-0000', 'addr': '울산 동구 707'},
        {'name': '속초해물', 'phone': '033-666-7777', 'addr': '속초시 교동 808'},
        {'name': '충청수산', 'phone': '042-333-4444', 'addr': '대전 중구 909'},
    ]
    
    business_objects = []
    for biz_data in businesses_data:
        business, created = Business.objects.get_or_create(
            business_name=biz_data['name'],
            defaults={
                'phone_number': biz_data['phone'],
                'address': biz_data['addr'],
                'user': user
            }
        )
        business_objects.append(business)
        if created:
            print(f"✅ 거래처 생성: {business.business_name}")
        else:
            print(f"🔄 기존 거래처: {business.business_name}")
    
    # 2. 어종 정보 생성 (중복 방지) - 실제 수산시장 단위 적용
    print("🐟 어종 정보 생성 중...")
    fish_types_data = [
        {'name': '고등어', 'unit': 'kg', 'aliases': '참고등어,삼치고등어'},
        {'name': '갈치', 'unit': 'kg', 'aliases': '은갈치,백갈치'},
        {'name': '명태', 'unit': 'kg', 'aliases': '동태,생태'},
        {'name': '조기', 'unit': 'kg', 'aliases': '참조기,민어'},
        {'name': '광어', 'unit': '마리', 'aliases': '넙치,히라메'},
        {'name': '농어', 'unit': '마리', 'aliases': '배스,시베리아바스'},
        {'name': '도미', 'unit': '마리', 'aliases': '참돔,감성돔'},
        {'name': '연어', 'unit': 'kg', 'aliases': '사케,새먼'},
        {'name': '참치', 'unit': 'kg', 'aliases': '다랑어,턴어'},
        {'name': '오징어', 'unit': '박스', 'aliases': '한치,갑오징어'},
        {'name': '문어', 'unit': '마리', 'aliases': '낙지,쭈꾸미'},
        {'name': '새우', 'unit': 'kg', 'aliases': '대하,보리새우'},
        {'name': '게', 'unit': '마리', 'aliases': '대게,털게'},
        {'name': '전복', 'unit': '개', 'aliases': '소라,딱지'},
        {'name': '굴', 'unit': '포', 'aliases': '석화,생굴'},
        {'name': '홍합', 'unit': 'kg', 'aliases': '담치,석합'},
        {'name': '바지락', 'unit': 'kg', 'aliases': '조개,백합'},
        {'name': '멸치', 'unit': 'kg', 'aliases': '액젓멸치,마른멸치'},
        {'name': '삼치', 'unit': 'kg', 'aliases': '사와라,서대'},
        {'name': '방어', 'unit': '마리', 'aliases': '부리,왕방어'},
    ]
    
    fish_type_objects = []
    for fish_data in fish_types_data:
        fish_type, created = FishType.objects.get_or_create(
            name=fish_data['name'],
            user=user,
            defaults={
                'unit': fish_data['unit'],
                'aliases': fish_data['aliases']
            }
        )
        fish_type_objects.append(fish_type)
        if created:
            print(f"✅ 어종 생성: {fish_type.name}")
        else:
            print(f"🔄 기존 어종: {fish_type.name}")
    
    # 3. 주문 데이터 먼저 생성 (재고 등록 이전 - 음수 재고 상황 구현)
    print("📋 주문 데이터 생성 중 (재고 없는 상태에서)...")
    
    # 날짜 기준점들
    five_weeks_ago = timezone.now() - timedelta(weeks=5)
    two_weeks_ago = timezone.now() - timedelta(weeks=2)
    
    # 주문 상태 및 결제 상태 설정
    def get_order_payment_status(order_date):
        if order_date >= five_weeks_ago:
            # 최근 5주 - 미결제 상태
            return 'placed', None  # 주문상태, 결제상태
        else:
            # 5주 이전 - 90% 완료, 5% 취소, 5% 환불
            rand = random.random()
            if rand < 0.05:  # 5% 취소
                return 'cancelled', None
            elif rand < 0.10:  # 5% 환불 (결제 후 환불)
                return 'delivered', 'refunded'
            else:  # 90% 배송완료
                return 'delivered', 'paid'
    
    # 3000-4000개 주문 생성
    orders_created = 0
    target_orders = random.randint(3000, 4000)
    
    # 모든 어종 사용 (재고 없어도 주문 가능)
    available_fish_types = fish_type_objects
    print(f"📋 사용 가능한 어종: {len(available_fish_types)}개 (재고 무관)")
    
    for _ in range(target_orders):
        # 등록일 랜덤 생성 (3년치)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=3*365)  # 3년 전
        time_between = end_date - start_date
        days_between = time_between.days
        random_days = random.randrange(days_between)
        order_date = start_date + timedelta(days=random_days)  # 등록일
        
        # 납기일 = 등록일 + 2~14일
        delivery_date = order_date + timedelta(days=random.randint(2, 14))
        
        # 주문 및 결제 상태 결정
        order_status, payment_status = get_order_payment_status(order_date)
        
        # 랜덤 거래처 선택
        business = random.choice(business_objects)
        
        # 주문 생성 (auto_now_add 강제 우회 - 모델 필드 임시 수정)
        order_datetime_field = Order._meta.get_field('order_datetime')
        original_auto_now_add = order_datetime_field.auto_now_add
        order_datetime_field.auto_now_add = False
        
        try:
            order = Order.objects.create(
                user=user,
                business_id=business.id,
                total_price=0,  # 나중에 계산
                order_datetime=order_date,  # 등록일
                delivery_datetime=delivery_date,  # 납기일 (등록일 + 2~14일)
                order_status=order_status,
                source_type='manual',
                memo=f'{business.business_name} 정기 주문',
                is_urgent=random.choice([True, False]) if random.random() < 0.1 else False
            )
        finally:
            # auto_now_add 원상복구
            order_datetime_field.auto_now_add = original_auto_now_add
        
        # 주문 아이템 생성 (2주 이후 주문은 재고에 영향 없음)
        num_items = random.randint(2, 5)  # 아이템 수 복구
        total_price = 0
        
        selected_fish_types = random.sample(available_fish_types, min(num_items, len(available_fish_types)))
        
        for fish_type in selected_fish_types:
            # 단위별로 적절한 수량과 가격 설정
            if fish_type.unit == 'kg':
                quantity = random.randint(5, 50)
                unit_price = Decimal(str(random.randint(5000, 25000)))
            elif fish_type.unit == '마리':
                quantity = random.randint(2, 20)
                unit_price = Decimal(str(random.randint(15000, 80000)))
            elif fish_type.unit == '박스':
                quantity = random.randint(1, 10)
                unit_price = Decimal(str(random.randint(30000, 150000)))
            elif fish_type.unit == '개':
                quantity = random.randint(10, 100)
                unit_price = Decimal(str(random.randint(1000, 5000)))
            elif fish_type.unit == '포':
                quantity = random.randint(5, 30)
                unit_price = Decimal(str(random.randint(8000, 25000)))
            else:
                quantity = random.randint(5, 50)
                unit_price = Decimal(str(random.randint(5000, 25000)))
            
            # 주문 아이템 생성 (재고 체크 없이)
            order_item = OrderItem.objects.create(
                order=order,
                fish_type=fish_type,
                quantity=quantity,
                unit_price=unit_price,
                unit=fish_type.unit,
                item_name_snapshot=fish_type.name
            )
            
            total_price += quantity * unit_price
            
            # StockTransaction 로그 기록 (재고 차감 없이 기록만)
            StockTransaction.objects.create(
                user=user,
                fish_type=fish_type,
                order=order,
                transaction_type='order',
                quantity_change=-quantity,
                unit=fish_type.unit,
                notes=f"주문 #{order.id} (재고 등록 이전 주문)"
            )
        
        # 총 가격 업데이트
        order.total_price = int(total_price)
        order.save()
        
        # 결제 데이터 생성 (5주 이전 주문만)
        if payment_status in ['paid', 'refunded']:
            # 결제 수단 랜덤 선택
            payment_methods = ['card', 'cash', 'bank_transfer']
            payment_method = random.choice(payment_methods)
            
            # 결제일 = 주문일 + 0~3일 (빠른 결제)
            payment_date = order_date + timedelta(days=random.randint(0, 3))
            
            # Payment 모델의 created_at도 auto_now이므로 우회 필요
            created_at_field = Payment._meta.get_field('created_at')
            original_default = created_at_field.default
            created_at_field.default = payment_date
            
            try:
                payment = Payment.objects.create(
                    order=order,
                    business_id=business.id,
                    amount=int(total_price),
                    method=payment_method,
                    payment_status=payment_status,
                    paid_at=payment_date if payment_status in ['paid', 'refunded'] else None,
                    imp_uid=f"imp_{random.randint(100000, 999999)}_{order.id}",
                    merchant_uid=f"order_{order.id}_{random.randint(1000, 9999)}",
                )
                
                # 환불인 경우 환불 사유 추가
                if payment_status == 'refunded':
                    refund_reasons = [
                        '고객 요청으로 인한 환불',
                        '상품 불량으로 인한 환불', 
                        '배송 지연으로 인한 환불',
                        '주문 취소 요청',
                        '재고 부족으로 인한 환불'
                    ]
                    payment.refunded = True
                    payment.refund_reason = random.choice(refund_reasons)
                    payment.save()
                
                # 카드 결제인 경우 승인번호 생성
                if payment_method == 'card' and payment_status in ['paid', 'refunded']:
                    payment.card_approval_number = f"{random.randint(10000000, 99999999)}"
                    payment.save()
                
                # 계좌이체인 경우 은행 정보 추가
                if payment_method == 'bank_transfer':
                    banks = ['국민은행', '신한은행', '우리은행', '하나은행', '농협', 'IBK기업은행']
                    payment.bank_name = random.choice(banks)
                    payment.payer_name = business.business_name
                    payment.save()
                    
            finally:
                # created_at 필드 원상복구
                created_at_field.default = original_default
        
        orders_created += 1
        
        if orders_created % 100 == 0:
            print(f"📋 주문 생성 진행률: {orders_created}/{target_orders}")
    
    print(f"✅ 주문 생성 완료: 총 {orders_created}개")
    
    # 4. 재고 데이터 등록 (주문 생성 후 - 2주 전 입고 기준)
    print("📦 재고 데이터 등록 중 (주문 생성 후)...")
    
    # 2주 전 날짜 계산 (재고 입고일)
    two_weeks_ago = timezone.now() - timedelta(weeks=2)
    
    # 재고 입고일 랜덤 생성 함수 (2주 전 ± 3일)
    def random_stock_arrival_date():
        base_date = two_weeks_ago
        random_days = random.randint(-3, 3)  # ±3일 범위
        return base_date + timedelta(days=random_days)
    
    from django.db.models import Sum
    
    # 각 어종별로 누적 주문량 계산 후 재고 등록
    for fish_type in fish_type_objects:
        # 기존 재고가 있는지 확인 (중복 방지)
        existing_inventory = Inventory.objects.filter(
            fish_type=fish_type,
            user=user
        ).first()
        
        if existing_inventory:
            print(f"🔄 기존 재고 있음: {fish_type.name}")
            continue
            
        # 해당 어종의 총 주문량 계산
        total_ordered = StockTransaction.objects.filter(
            fish_type=fish_type,
            user=user,
            transaction_type='order'
        ).aggregate(total=Sum('quantity_change'))['total'] or 0
        
        # 절댓값으로 변환 (quantity_change는 음수)
        total_ordered_abs = abs(total_ordered)
        
        # 단위별로 적절한 초기 재고량 설정 (주문량보다 많게)
        if fish_type.unit == 'kg':
            base_stock = random.randint(200, 1000)
        elif fish_type.unit == '마리':
            base_stock = random.randint(50, 300)
        elif fish_type.unit == '박스':
            base_stock = random.randint(20, 100)
        elif fish_type.unit == '개':
            base_stock = random.randint(500, 2000)
        elif fish_type.unit == '포':
            base_stock = random.randint(100, 500)
        else:
            base_stock = random.randint(100, 500)
        
        # 최종 재고 = 기본 재고량 (주문량이 차감될 예정)
        # 일부 어종은 의도적으로 부족하게 만들어서 음수 상황 테스트
        if random.random() < 0.3:  # 30% 확률로 재고 부족 상황
            final_stock = max(10, int(total_ordered_abs * 0.7))  # 주문량의 70%만 재고
        else:
            final_stock = base_stock
        
        # auto_now 필드 강제 우회 (DB 직접 업데이트 방식)
        stock_date = random_stock_arrival_date()
        
        # 1단계: 일단 재고 생성 (현재 시간으로)
        inventory = Inventory.objects.create(
            user=user,
            fish_type=fish_type,
            stock_quantity=final_stock,
            unit=fish_type.unit,
            status='normal'
        )
        
        # 2단계: raw SQL로 updated_at 필드 직접 수정 (auto_now 무시)
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE inventories SET updated_at = %s WHERE id = %s",
                [stock_date, inventory.id]
            )
        
        # inventory 객체 새로고침
        inventory.refresh_from_db()
        
        print(f"✅ 재고 등록: {fish_type.name} - {final_stock}{fish_type.unit} (입고일: {inventory.updated_at.strftime('%Y-%m-%d')}, 총주문량: {total_ordered_abs})")
    
    # 5. 이제 OrderSerializer를 통해 재고 차감 실행
    print("🔄 주문에 따른 재고 자동 차감 중...")
    
    # 최근 2주 이내 주문들만 실제 재고 차감
    recent_orders = Order.objects.filter(
        user=user,
        order_datetime__gte=two_weeks_ago
    )
    
    processed_orders = 0
    for order in recent_orders:
        for order_item in order.items.all():
            fish_type = order_item.fish_type
            quantity = order_item.quantity
            
            # 해당 어종의 재고들 조회 (FIFO 방식)
            inventories = Inventory.objects.filter(
                fish_type=fish_type,
                user=user,
                stock_quantity__gt=0
            ).order_by('-stock_quantity')
            
            # 재고에서 차감
            remaining_quantity = quantity
            for inventory in inventories:
                if remaining_quantity <= 0:
                    break
                
                deduct_amount = min(remaining_quantity, inventory.stock_quantity)
                inventory.stock_quantity -= deduct_amount
                inventory.save()
                remaining_quantity -= deduct_amount
            
        processed_orders += 1
        if processed_orders % 50 == 0:
            print(f"   📊 재고 차감 진행: {processed_orders}/{recent_orders.count()}")
    
    print(f"✅ 재고 차감 완료: {processed_orders}개 주문 처리")
    
    # 통계 정보
    total_orders = Order.objects.filter(user=user).count()
    recent_unpaid = Order.objects.filter(user=user, order_datetime__gte=five_weeks_ago).count()
    older_paid = Order.objects.filter(user=user, order_datetime__lt=five_weeks_ago).count()
    recent_2weeks = Order.objects.filter(user=user, order_datetime__gte=two_weeks_ago).count()
    
    print(f"📊 통계:")
    print(f"   - 최근 5주 미결제: {recent_unpaid}개")
    print(f"   - 이전 결제완료/취소: {older_paid}개") 
    print(f"   - 최근 2주 주문 (재고 영향): {recent_2weeks}개")
    print(f"   - 2주 이전 주문 (재고 무관): {total_orders - recent_2weeks}개")
    
    # 결제 데이터 요약
    paid_payments = Payment.objects.filter(payment_status='paid').count()
    refunded_payments = Payment.objects.filter(payment_status='refunded').count()
    total_payments = Payment.objects.count()
    
    print(f"💳 결제 완료: {paid_payments}개")
    print(f"💸 환불 완료: {refunded_payments}개")
    print(f"💰 총 결제 건수: {total_payments}개")
    
    # 결제 수단별 통계
    card_payments = Payment.objects.filter(method='card').count()
    cash_payments = Payment.objects.filter(method='cash').count()
    transfer_payments = Payment.objects.filter(method='bank_transfer').count()
    
    print(f"💳 카드 결제: {card_payments}개")
    print(f"💵 현금 결제: {cash_payments}개")
    print(f"🏦 계좌이체: {transfer_payments}개")
    
    # 데이터 요약 출력
    print("\n📊 생성된 데이터 요약:")
    print(f"🏢 거래처: {Business.objects.filter(user=user).count()}개")
    print(f"🐟 어종: {FishType.objects.filter(user=user).count()}개")
    print(f"📦 재고: {Inventory.objects.filter(user=user).count()}개")
    print(f"📋 주문: {Order.objects.filter(user=user).count()}개")
    print(f"🔄 재고 거래: {StockTransaction.objects.filter(user=user).count()}개")
    print(f"💳 결제: {Payment.objects.count()}개")
    
    print("🎉 샘플 데이터 생성 완료!")

# 스크립트 실행
create_sample_data()