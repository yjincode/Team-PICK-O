#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
수산물 샘플 데이터 생성 스크립트 (새로운 재고 관리 로직 반영)
- 3주전 재고 등록 → 3주간 주문들이 주문수량에 누적
- 실제 수산시장 단가 반영 (1000원 단위)
실행: python manage.py shell < sample_data.py
또는 윈도우: python manage.py shell -c "exec(open('sample_data.py', encoding='utf-8').read())"
"""

import os
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random
from django.utils import timezone
from django.db.models import F

from business.models import Business, User
from fish_registry.models import FishType
from inventory.models import Inventory, StockTransaction
from order.models import Order, OrderItem
from payment.models import Payment, CashReceipt, TaxInvoice

def create_sample_data():
    print("🚀 수산물 샘플 데이터 생성 시작...")
    
    # 사용자 확인/생성
    try:
        user = User.objects.get(id=1)
        print(f"✅ 기존 사용자: {user.username} (업체: {user.business_name}) - ID: {user.id}")
    except User.DoesNotExist:
        print("❌ 사용자 ID 1번이 존재하지 않습니다. 새로 생성합니다.")
        user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='admin123',
            business_name='테스트 수산물 업체',
            owner_name='관리자',
            phone_number='010-1234-5678',
            status='approved'
        )
        print(f"✅ 새 사용자 생성: {user.username} (업체: {user.business_name}) - ID: {user.id}")
    
    # 1. 거래처 생성 (12개로 축소, 상호명으로 변경)
    print("🏢 거래처 생성 중...")
    businesses_data = [
        {'name': '대양수산', 'phone': '02-1234-5678', 'addr': '서울특별시 동작구 노량진로 148'},
        {'name': '해성상회', 'phone': '051-987-6543', 'addr': '부산광역시 중구 자갈치해안로 52'},
        {'name': '제주바다마트', 'phone': '064-111-2222', 'addr': '제주특별자치도 제주시 건입동 269'},
        {'name': '동해수산', 'phone': '032-555-6666', 'addr': '인천광역시 연수구 센트럴로 123'},
        {'name': '남도해산물', 'phone': '061-222-3333', 'addr': '전라남도 목포시 용해동 12-5'},
        {'name': '경남횟집', 'phone': '055-444-5555', 'addr': '경상남도 통영시 중앙동 123-45'},
        {'name': '강원바다', 'phone': '033-999-1111', 'addr': '강원도 강릉시 교동 78-9'},
        {'name': '여수선어', 'phone': '061-888-7777', 'addr': '전라남도 여수시 돌산읍 돌산로 234'},
        {'name': '포항수협', 'phone': '054-222-9999', 'addr': '경상북도 포항시 북구 중앙로 567'},
        {'name': '울산활어', 'phone': '052-999-0000', 'addr': '울산광역시 동구 방어진순환도로 890'},
        {'name': '속초해물', 'phone': '033-666-7777', 'addr': '강원도 속초시 교동 34-12'},
        {'name': '충청수산', 'phone': '042-333-4444', 'addr': '대전광역시 중구 대종로 456'},
    ]
    
    business_objects = []
    for biz_data in businesses_data:
        business, created = Business.objects.get_or_create(
            business_name=biz_data['name'],
            defaults={
                'phone_number': biz_data['phone'].replace('-', '')[:12],  # 하이픈 제거하고 12자리 제한
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
                'aliases': fish_data['aliases'],
                'default_price': random.randint(10, 50) * 1000  # 기본 가격 10,000-50,000원
            }
        )
        fish_type_objects.append(fish_type)
        if created:
            print(f"✅ 어종 생성: {fish_type.name}")
        else:
            print(f"🔄 기존 어종: {fish_type.name}")
    
    # 3. 먼저 재고 데이터 등록 (2개월전 입고)
    print("📦 재고 데이터 등록 중 (2개월전 입고)...")
    
    # 날짜 기준점들
    two_months_ago = timezone.now() - timedelta(days=60)  # 2개월 전
    one_month_ago = timezone.now() - timedelta(days=30)   # 1개월 전
    two_weeks_ago = timezone.now() - timedelta(weeks=2)   # 2주 전
    
    # 2개월 전 재고 입고일 랜덤 생성 함수 (2개월 전 ± 5일)
    def random_stock_arrival_date():
        base_date = two_months_ago
        random_days = random.randint(-5, 5)  # ±5일 범위
        return base_date + timedelta(days=random_days)
    
    # 각 어종별로 재고 등록
    for fish_type in fish_type_objects:
        # 기존 재고가 있는지 확인 (중복 방지)
        existing_inventory = Inventory.objects.filter(
            fish_type=fish_type,
            user=user
        ).first()
        
        if existing_inventory:
            print(f"🔄 기존 재고 있음: {fish_type.name}")
            continue
            
        # 단위별로 적절한 초기 재고량 설정 (실제 수산시장 기준)
        # 음수 재고 방지를 위해 충분히 많은 초기 재고 설정
        if fish_type.unit == 'kg':
            stock_quantity = random.randint(300, 800)  # 300-800kg (증가)
        elif fish_type.unit == '마리':
            stock_quantity = random.randint(50, 200)   # 50-200마리 (증가)
        elif fish_type.unit == '박스':
            stock_quantity = random.randint(30, 100)   # 30-100박스 (증가)
        elif fish_type.unit == '개':
            stock_quantity = random.randint(500, 2000) # 500-2000개 (증가)
        elif fish_type.unit == '포':
            stock_quantity = random.randint(100, 400)  # 100-400포 (증가)
        else:
            stock_quantity = random.randint(100, 400)  # 기본값도 증가
        
        # auto_now 필드 강제 우회 (DB 직접 업데이트 방식)
        stock_date = random_stock_arrival_date()
        
        # 1단계: 재고 생성 (현재 시간으로)
        inventory = Inventory.objects.create(
            user=user,
            fish_type=fish_type,
            stock_quantity=stock_quantity,
            ordered_quantity=0,  # 초기 주문수량은 0
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
        
        print(f"✅ 재고 등록: {fish_type.name} - {stock_quantity}{fish_type.unit} (입고일: {inventory.updated_at.strftime('%Y-%m-%d')})")
    
    # 4. 전체 3년치 주문 데이터 생성 (최근 2개월만 재고에 영향)
    print("📋 3년치 주문 데이터 생성 중...")
    
    # 주문 상태 및 결제 상태 설정 (음수 재고 방지를 위해 완료 비율 조정)
    def get_order_payment_status(order_date):
        days_ago = (timezone.now() - order_date).days
        
        if days_ago <= 7:  # 최근 1주
            return 'placed', None  # 미결제
        elif days_ago <= 30:  # 1개월 전
            # 60% 준비완료, 30% 미결제, 10% 완료 (완료 비율 낮춤)
            rand = random.random()
            if rand < 0.6:
                return 'ready', 'paid'
            elif rand < 0.9:
                return 'placed', None
            else:
                return 'delivered', 'paid'
        elif days_ago <= 60:  # 2개월 전
            # 50% 완료, 30% 준비완료, 20% 취소 (완료 비율 낮춤)
            rand = random.random()
            if rand < 0.5:
                return 'delivered', 'paid'
            elif rand < 0.8:
                return 'ready', 'paid'
            else:
                return 'cancelled', None
        else:  # 2개월 이전 (재고에 영향 없음)
            # 90% 완료, 5% 취소, 5% 환불
            rand = random.random()
            if rand < 0.9:
                return 'delivered', 'paid'
            elif rand < 0.95:
                return 'cancelled', None
            else:
                return 'delivered', 'refunded'
    
    # 3년치 주문 생성 (3000-5000개)
    orders_created = 0
    target_orders = random.randint(3000, 5000)
    
    # 등록된 재고가 있는 어종들만 사용
    available_fish_types = fish_type_objects
    print(f"📋 사용 가능한 어종: {len(available_fish_types)}개")
    
    for _ in range(target_orders):
        # 등록일 랜덤 생성 (3년간)
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
            # 실제 수산시장 단가 및 수량 설정 (1000원 단위)
            fish_name = fish_type.name
            
            if fish_type.unit == 'kg':
                quantity = random.randint(3, 20)  # 수량 감소 (5-30 → 3-20)
                # 어종별 실제 시세 반영
                if fish_name in ['고등어', '갈치', '삼치']:
                    unit_price = random.randint(8, 15) * 1000  # 8,000-15,000원/kg
                elif fish_name in ['명태', '조기']:
                    unit_price = random.randint(12, 20) * 1000  # 12,000-20,000원/kg
                elif fish_name in ['연어', '참치']:
                    unit_price = random.randint(25, 45) * 1000  # 25,000-45,000원/kg
                elif fish_name in ['새우', '홍합', '바지락']:
                    unit_price = random.randint(15, 30) * 1000  # 15,000-30,000원/kg
                elif fish_name == '멸치':
                    unit_price = random.randint(20, 35) * 1000  # 20,000-35,000원/kg
                else:
                    unit_price = random.randint(10, 18) * 1000  # 기본 10,000-18,000원/kg
                    
            elif fish_type.unit == '마리':
                quantity = random.randint(1, 8)  # 수량 감소 (2-15 → 1-8)
                # 어종별 실제 시세
                if fish_name in ['광어', '농어']:
                    unit_price = random.randint(15, 30) * 1000  # 15,000-30,000원/마리
                elif fish_name in ['도미', '방어']:
                    unit_price = random.randint(20, 50) * 1000  # 20,000-50,000원/마리
                elif fish_name == '문어':
                    unit_price = random.randint(8, 15) * 1000   # 8,000-15,000원/마리
                elif fish_name == '게':
                    unit_price = random.randint(5, 12) * 1000   # 5,000-12,000원/마리
                else:
                    unit_price = random.randint(10, 25) * 1000  # 기본 10,000-25,000원/마리
                    
            elif fish_type.unit == '박스':
                quantity = random.randint(1, 5)  # 수량 감소 (1-8 → 1-5)
                # 오징어 박스 시세
                unit_price = random.randint(80, 150) * 1000     # 80,000-150,000원/박스
                
            elif fish_type.unit == '개':
                quantity = random.randint(5, 30)  # 수량 감소 (10-50 → 5-30)
                # 전복 시세
                unit_price = random.randint(3, 8) * 1000        # 3,000-8,000원/개
                
            elif fish_type.unit == '포':
                quantity = random.randint(2, 10)  # 수량 감소 (3-15 → 2-10)
                # 굴 포장 시세
                unit_price = random.randint(12, 25) * 1000      # 12,000-25,000원/포
                
            else:
                quantity = random.randint(3, 20)  # 수량 감소 (5-30 → 3-20)
                unit_price = random.randint(8, 20) * 1000       # 기본 8,000-20,000원
            
            unit_price = Decimal(str(unit_price))
            
            # 주문 아이템 생성
            order_item = OrderItem.objects.create(
                order=order,
                fish_type=fish_type,
                quantity=quantity,
                unit_price=int(unit_price),
                unit_price_snapshot=int(unit_price),
                unit=fish_type.unit,
                item_name_snapshot=fish_type.name
            )
            
            total_price += quantity * unit_price
            
            # 최근 2개월 주문만 재고에 영향 (주문수량 증가)
            days_ago = (timezone.now() - order_date).days
            if days_ago <= 60:  # 최근 2개월만
                try:
                    inventory = Inventory.objects.get(fish_type=fish_type, user=user)
                    from django.db.models import F
                    inventory.ordered_quantity = F('ordered_quantity') + quantity
                    inventory.save()
                    inventory.refresh_from_db()
                    print(f"   📈 주문수량 증가: {fish_type.name} +{quantity} → {inventory.ordered_quantity}")
                except Inventory.DoesNotExist:
                    print(f"   ⚠️ 재고 없음: {fish_type.name} - 주문수량 반영 불가")
            else:
                print(f"   📋 과거 주문 (재고 무관): {fish_type.name} {quantity}{fish_type.unit}")
        
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
                    business=business,
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
        
        if orders_created % 50 == 0:
            print(f"📋 주문 생성 진행률: {orders_created}/{target_orders}")
    
    print(f"✅ 주문 생성 완료: 총 {orders_created}개")
    
    # 5. 완료된 주문들에 대해서는 재고수량 차감 처리 (최근 2개월만)
    print("📦 완료된 주문의 재고수량 차감 중...")
    
    delivered_orders = Order.objects.filter(
        user=user,
        order_status='delivered',
        order_datetime__gte=two_months_ago
    )
    
    delivered_count = 0
    for order in delivered_orders:
        for order_item in order.items.all():
            fish_type = order_item.fish_type
            quantity = order_item.quantity
            
            # 해당 어종의 재고에서 실제 차감 (출고 완료된 것들)
            try:
                inventory = Inventory.objects.get(fish_type=fish_type, user=user)
                from django.db.models import F
                
                # 재고수량 차감 전 음수 방지 검증
                inventory.refresh_from_db()  # 최신 데이터 가져오기
                
                if inventory.stock_quantity >= quantity:
                    # 충분한 재고가 있는 경우에만 차감
                    old_stock = inventory.stock_quantity
                    inventory.stock_quantity = F('stock_quantity') - quantity
                    inventory.save()
                    inventory.refresh_from_db()
                    
                    print(f"   📦 출고 완료: {fish_type.name} 재고 {old_stock} → {inventory.stock_quantity} (-{quantity})")
                else:
                    # 재고 부족으로 차감할 수 있는 만큼만 차감
                    old_stock = inventory.stock_quantity
                    available_quantity = inventory.stock_quantity
                    
                    if available_quantity > 0:
                        inventory.stock_quantity = 0
                        inventory.save()
                        print(f"   ⚠️  부분 출고: {fish_type.name} 재고 {old_stock} → 0 (-{available_quantity}/{quantity}, {quantity - available_quantity} 부족)")
                    else:
                        print(f"   ❌ 출고 불가: {fish_type.name} 재고 없음 (필요: {quantity})")
                
            except Inventory.DoesNotExist:
                print(f"   ⚠️ 재고 없음: {fish_type.name} - 재고 차감 불가")
        
        delivered_count += 1
        if delivered_count % 20 == 0:
            print(f"   📊 출고 처리 진행: {delivered_count}/{delivered_orders.count()}")
    
    print(f"✅ 출고 완료 처리: {delivered_count}개 주문")
    
    # 통계 정보
    total_orders = Order.objects.filter(user=user).count()
    recent_1week = Order.objects.filter(user=user, order_datetime__gte=timezone.now() - timedelta(days=7)).count()
    recent_1month = Order.objects.filter(user=user, order_datetime__gte=one_month_ago).count()
    recent_2months = Order.objects.filter(user=user, order_datetime__gte=two_months_ago).count()
    placed_orders = Order.objects.filter(user=user, order_status='placed').count()
    ready_orders = Order.objects.filter(user=user, order_status='ready').count()
    delivered_orders = Order.objects.filter(user=user, order_status='delivered').count()
    cancelled_orders = Order.objects.filter(user=user, order_status='cancelled').count()
    
    print(f"📊 주문 통계:")
    print(f"   - 전체 주문: {total_orders}개 (3년치)")
    print(f"   - 최근 1주 주문: {recent_1week}개")
    print(f"   - 최근 1개월 주문: {recent_1month}개")
    print(f"   - 최근 2개월 주문: {recent_2months}개 (재고 영향)")
    print(f"   - 미결제 주문: {placed_orders}개")
    print(f"   - 준비완료: {ready_orders}개")
    print(f"   - 출고완료: {delivered_orders}개")
    print(f"   - 취소된 주문: {cancelled_orders}개")
    
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
    
    # 재고 통계 추가
    print(f"\n📦 재고 통계:")
    inventories = Inventory.objects.filter(user=user)
    total_inventories = inventories.count()
    shortage_inventories = inventories.filter(ordered_quantity__gt=F('stock_quantity')).count()
    normal_inventories = total_inventories - shortage_inventories
    
    print(f"   - 총 재고 품목: {total_inventories}개")
    print(f"   - 정상 재고: {normal_inventories}개")
    print(f"   - 부족 재고: {shortage_inventories}개")
    
    # 심각한 부족 재고 상세 표시
    critical_shortages = inventories.filter(
        ordered_quantity__gt=F('stock_quantity') + 50
    ).values_list('fish_type__name', 'stock_quantity', 'ordered_quantity')
    
    if critical_shortages:
        print(f"   ⚠️ 심각한 부족 상황:")
        for fish_name, stock, ordered in critical_shortages[:5]:  # 상위 5개만 표시
            shortage = ordered - stock
            print(f"      - {fish_name}: 재고 {stock}, 주문 {ordered} (부족: {shortage})")
    
    # 데이터 요약 출력
    print("\n📊 생성된 데이터 요약:")
    print(f"🏢 거래처: {Business.objects.filter(user=user).count()}개")
    print(f"🐟 어종: {FishType.objects.filter(user=user).count()}개")
    print(f"📦 재고: {Inventory.objects.filter(user=user).count()}개")
    print(f"📋 주문: {Order.objects.filter(user=user).count()}개")
    print(f"💳 결제: {Payment.objects.count()}개")
    
    # 6. 이상 탐지용 비정상 패턴 데이터 생성
    print("\n🚨 이상 탐지용 비정상 패턴 생성 중...")
    
    # 최근 7일간 이상 패턴 생성
    recent_days = [(timezone.now() - timedelta(days=i)).replace(hour=random.randint(9, 17)) for i in range(7)]
    
    anomaly_patterns = [
        # 1. 급격한 대량 주문 (평소의 10배)
        {'type': '대량주문', 'fish': '광어', 'multiplier': 10, 'count': 3},
        # 2. 심야 시간대 주문 (새벽 2-4시)
        {'type': '심야주문', 'fish': '우럭', 'hour_range': (2, 4), 'count': 2},
        # 3. 동일 어종 연속 주문 (1일 내 5회 이상)
        {'type': '연속주문', 'fish': '돔', 'frequency': 6, 'count': 1},
        # 4. 비정상적 고가 단가 (시세의 3배)
        {'type': '고가단가', 'fish': '농어', 'price_multiplier': 3, 'count': 2},
        # 5. 소량 다품종 주문 (20개 이상 어종을 1-2개씩)
        {'type': '다품종소량', 'fish_count': 15, 'quantity_range': (1, 2), 'count': 1}
    ]
    
    anomaly_count = 0
    
    for pattern in anomaly_patterns:
        try:
            if pattern['type'] == '대량주문':
                # 평소보다 10배 많은 주문
                fish_type = FishType.objects.filter(name__contains=pattern['fish']).first()
                if fish_type:
                    for _ in range(pattern['count']):
                        business = random.choice(business_objects)
                        normal_quantity = random.randint(10, 30)
                        anomaly_quantity = normal_quantity * pattern['multiplier']
                        
                        order = Order.objects.create(
                            user=user,
                            business=business,
                            order_datetime=random.choice(recent_days),
                            order_status='delivered',
                            payment_status='paid',
                            transcribed_text=f'[이상패턴-대량주문] {fish_type.name} {anomaly_quantity}{fish_type.unit} 주문',
                            source_type='manual',
                            total_amount=Decimal(anomaly_quantity * 15000)
                        )
                        
                        OrderItem.objects.create(
                            order=order,
                            fish_type=fish_type,
                            quantity=anomaly_quantity,
                            unit_price=Decimal(15000),
                            unit=fish_type.unit
                        )
                        anomaly_count += 1
                        
            elif pattern['type'] == '심야주문':
                # 새벽 시간대 주문
                fish_type = FishType.objects.filter(name__contains=pattern['fish']).first()
                if fish_type:
                    for _ in range(pattern['count']):
                        business = random.choice(business_objects)
                        night_hour = random.randint(pattern['hour_range'][0], pattern['hour_range'][1])
                        night_datetime = (timezone.now() - timedelta(days=random.randint(1, 3))).replace(
                            hour=night_hour, minute=random.randint(0, 59)
                        )
                        
                        order = Order.objects.create(
                            user=user,
                            business=business,
                            order_datetime=night_datetime,
                            order_status='delivered',
                            payment_status='paid',
                            transcribed_text=f'[이상패턴-심야주문] {fish_type.name} 주문 (새벽 {night_hour}시)',
                            source_type='voice',
                            total_amount=Decimal(25000)
                        )
                        
                        OrderItem.objects.create(
                            order=order,
                            fish_type=fish_type,
                            quantity=20,
                            unit_price=Decimal(12500),
                            unit=fish_type.unit
                        )
                        anomaly_count += 1
                        
            elif pattern['type'] == '연속주문':
                # 동일 어종 연속 주문
                fish_type = FishType.objects.filter(name__contains=pattern['fish']).first()
                if fish_type:
                    business = random.choice(business_objects)
                    base_datetime = timezone.now() - timedelta(days=1)
                    
                    for i in range(pattern['frequency']):
                        order_datetime = base_datetime + timedelta(hours=i*2)  # 2시간 간격
                        
                        order = Order.objects.create(
                            user=user,
                            business=business,
                            order_datetime=order_datetime,
                            order_status='delivered',
                            payment_status='paid',
                            transcribed_text=f'[이상패턴-연속주문-{i+1}] {fish_type.name} 반복 주문',
                            source_type='text',
                            total_amount=Decimal(18000)
                        )
                        
                        OrderItem.objects.create(
                            order=order,
                            fish_type=fish_type,
                            quantity=15,
                            unit_price=Decimal(12000),
                            unit=fish_type.unit
                        )
                        anomaly_count += 1
                        
            elif pattern['type'] == '고가단가':
                # 비정상적으로 높은 단가
                fish_type = FishType.objects.filter(name__contains=pattern['fish']).first()
                if fish_type:
                    for _ in range(pattern['count']):
                        business = random.choice(business_objects)
                        normal_price = 12000
                        anomaly_price = normal_price * pattern['price_multiplier']
                        
                        order = Order.objects.create(
                            user=user,
                            business=business,
                            order_datetime=random.choice(recent_days),
                            order_status='delivered',
                            payment_status='paid',
                            transcribed_text=f'[이상패턴-고가단가] {fish_type.name} 고가 주문',
                            source_type='manual',
                            total_amount=Decimal(anomaly_price * 10)
                        )
                        
                        OrderItem.objects.create(
                            order=order,
                            fish_type=fish_type,
                            quantity=10,
                            unit_price=Decimal(anomaly_price),
                            unit=fish_type.unit
                        )
                        anomaly_count += 1
                        
            elif pattern['type'] == '다품종소량':
                # 많은 어종을 소량씩 주문
                available_fish = list(FishType.objects.filter(user=user))[:pattern['fish_count']]
                business = random.choice(business_objects)
                
                order = Order.objects.create(
                    user=user,
                    business=business,
                    order_datetime=random.choice(recent_days),
                    order_status='delivered',
                    payment_status='paid',
                    transcribed_text=f'[이상패턴-다품종소량] {len(available_fish)}개 어종 소량 주문',
                    source_type='image',
                    total_amount=Decimal(50000)
                )
                
                for fish_type in available_fish:
                    quantity = random.randint(pattern['quantity_range'][0], pattern['quantity_range'][1])
                    OrderItem.objects.create(
                        order=order,
                        fish_type=fish_type,
                        quantity=quantity,
                        unit_price=Decimal(random.randint(8000, 15000)),
                        unit=fish_type.unit
                    )
                anomaly_count += 1
                
        except Exception as e:
            print(f"   ⚠️ 이상 패턴 생성 실패: {pattern['type']} - {e}")
            continue
    
    print(f"✅ 이상 탐지용 패턴 생성 완료: {anomaly_count}개")
    
    # 추가: 재고 이상 패턴도 생성
    print("\n📦 재고 이상 패턴 생성 중...")
    
    # 1. 급격한 재고 감소 패턴 (정상 출고 후 갑자기 대량 감소)
    try:
        target_fish = FishType.objects.filter(user=user).first()
        if target_fish:
            inventory = Inventory.objects.filter(fish_type=target_fish, user=user).first()
            if inventory and inventory.stock_quantity > 100:
                # 정상적인 거래 기록 후 갑작스러운 대량 감소
                StockTransaction.objects.create(
                    user=user,
                    fish_type=target_fish,
                    inventory=inventory,
                    transaction_type='adjustment',
                    quantity_change=-inventory.stock_quantity * 0.8,  # 재고의 80% 갑자기 출고 (음수)
                    unit=target_fish.unit,
                    notes='[이상패턴] 급격한 대량 출고'
                )
                
                inventory.stock_quantity = int(inventory.stock_quantity * 0.2)
                inventory.save()
                print(f"   🚨 급격한 재고 감소 패턴 생성: {target_fish.name}")
    except Exception as e:
        print(f"   ⚠️ 재고 이상 패턴 생성 실패: {e}")
    
    print("🎉 이상 탐지 샘플 데이터 포함 생성 완료!")
    print("📌 특징:")
    print("   - 2개월 전 재고 입고")
    print("   - 3년치 주문 데이터 생성")
    print("   - 최근 2개월 주문만 재고에 영향 (주문수량 증가)")
    print(f"   - 이상 탐지용 패턴 {anomaly_count}개 포함")
    print("   - 완료된 주문만 실제 재고 차감")
    print("   - 실제 수산시장 단가 반영 (1000원 단위)")
    print("   - 과거 주문들은 통계용으로만 사용")

# 스크립트 실행
create_sample_data()