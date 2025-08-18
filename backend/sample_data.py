#!/usr/bin/env python
"""
수산물 샘플 데이터 생성 스크립트 (개선된 버전)
실행: python manage.py shell < sample_data.py
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
    
    # 3. 재고 데이터 생성 (중복 방지)
    print("📦 재고 데이터 생성 중...")
    
    # 현재 날짜부터 3년 전까지의 랜덤 날짜 생성 함수
    def random_date_in_last_3_years():
        end_date = timezone.now()
        start_date = end_date - timedelta(days=3*365)  # 3년
        time_between = end_date - start_date
        days_between = time_between.days
        random_days = random.randrange(days_between)
        return start_date + timedelta(days=random_days)
    
    for fish_type in fish_type_objects:
        # 각 어종당 1-3개의 재고 아이템 생성 (중복 방지)
        num_inventory_items = random.randint(1, 3)
        
        for i in range(num_inventory_items):
            # 중복 체크
            existing_inventory = Inventory.objects.filter(
                fish_type=fish_type,
                user=user
            ).first()
            
            if existing_inventory:
                print(f"🔄 기존 재고: {fish_type.name}")
                continue
                
            stock_quantity = random.randint(50, 500)
            
            inventory = Inventory.objects.create(
                user=user,
                fish_type=fish_type,
                stock_quantity=stock_quantity,
                unit=fish_type.unit,
                status='normal',
                updated_at=random_date_in_last_3_years()
            )
            print(f"✅ 재고 생성: {fish_type.name} - {stock_quantity}{fish_type.unit}")
    
    # 4. 주문 데이터 생성 (최근 5주는 미결제, 나머지는 결제완료/취소)
    print("📋 주문 데이터 생성 중...")
    
    # 5주 전 날짜 계산
    five_weeks_ago = timezone.now() - timedelta(weeks=5)
    
    # 주문 상태 및 결제 상태 설정 (현실적 비율)
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
    
    # 3년간 주문 생성 (대폭 증가)
    orders_created = 0
    target_orders = random.randint(2000, 2500)  # 목표 주문 수 (2000-2500개)
    
    # 재고가 있는 어종만 필터링
    available_fish_types = []
    for fish_type in fish_type_objects:
        inventory = Inventory.objects.filter(fish_type=fish_type, user=user).first()
        if inventory:
            available_fish_types.append(fish_type)
    
    print(f"📋 재고가 있는 어종: {len(available_fish_types)}개")
    
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
        # auto_now_add 필드를 임시로 비활성화
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
        
        # 주문 아이템 생성 (재고가 있는 어종만 사용)
        num_items = random.randint(2, 5)
        total_price = 0
        
        selected_fish_types = random.sample(available_fish_types, min(num_items, len(available_fish_types)))
        
        for fish_type in selected_fish_types:
            # 단위별로 적절한 수량과 가격 설정
            if fish_type.unit == 'kg':
                quantity = random.randint(5, 50)  # 5-50kg
                unit_price = Decimal(str(random.randint(5000, 25000)))  # kg당 5천-2만5천원
            elif fish_type.unit == '마리':
                quantity = random.randint(2, 20)  # 2-20마리
                unit_price = Decimal(str(random.randint(15000, 80000)))  # 마리당 1만5천-8만원
            elif fish_type.unit == '박스':
                quantity = random.randint(1, 10)  # 1-10박스
                unit_price = Decimal(str(random.randint(30000, 150000)))  # 박스당 3만-15만원
            elif fish_type.unit == '개':
                quantity = random.randint(10, 100)  # 10-100개
                unit_price = Decimal(str(random.randint(1000, 5000)))  # 개당 1천-5천원
            elif fish_type.unit == '포':
                quantity = random.randint(5, 30)  # 5-30포
                unit_price = Decimal(str(random.randint(8000, 25000)))  # 포당 8천-2만5천원
            else:
                quantity = random.randint(5, 50)
                unit_price = Decimal(str(random.randint(5000, 25000)))
            
            order_item = OrderItem.objects.create(
                order=order,
                fish_type=fish_type,
                quantity=quantity,
                unit_price=unit_price,
                unit=fish_type.unit,
                item_name_snapshot=fish_type.name
            )
            
            total_price += quantity * unit_price
            
            # StockTransaction 생성 (재고 추적)
            StockTransaction.objects.create(
                user=user,
                fish_type=fish_type,
                order=order,
                transaction_type='order',
                quantity_change=-quantity,  # 음수로 저장 (차감)
                unit=fish_type.unit,
                notes=f"주문 #{order.id}로 인한 재고 차감"
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
    print(f"📊 최근 5주 미결제 주문: {Order.objects.filter(order_datetime__gte=five_weeks_ago).count()}개")
    print(f"📊 이전 결제완료/취소 주문: {Order.objects.filter(order_datetime__lt=five_weeks_ago).count()}개")
    
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