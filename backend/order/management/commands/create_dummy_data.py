from django.core.management.base import BaseCommand
from order.models import Business, FishType, Order, OrderItem
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = '더미 데이터를 생성합니다 (거래처, 어종, 주문 등)'

    def handle(self, *args, **options):
        self.stdout.write('더미 데이터 생성을 시작합니다...')
        
        # 기존 데이터 삭제
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Business.objects.all().delete()
        FishType.objects.all().delete()
        
        # 거래처 더미 데이터 생성
        businesses_data = [
            {'id': 5678, 'business_name': '동해수산', 'phone_number': '010-1234-5678', 'address': '부산시 해운대구'},
            {'id': 5679, 'business_name': '바다마트', 'phone_number': '010-2345-6789', 'address': '부산시 동래구'},
            {'id': 5680, 'business_name': '해양식품', 'phone_number': '010-3456-7890', 'address': '부산시 남구'},
            {'id': 5681, 'business_name': '서해수산', 'phone_number': '010-4567-8901', 'address': '인천시 중구'},
            {'id': 5682, 'business_name': '남해어장', 'phone_number': '010-5678-9012', 'address': '전남 여수시'},
        ]
        
        for data in businesses_data:
            Business.objects.create(**data)
        
        self.stdout.write(f'✓ {len(businesses_data)}개의 거래처 데이터 생성 완료')
        
        # 어종 더미 데이터 생성
        fish_types_data = [
            {'id': 1, 'fish_name': '고등어', 'unit': 'kg', 'aliases': ['마커럴']},
            {'id': 2, 'fish_name': '갈치', 'unit': '마리', 'aliases': ['커틀피시']},
            {'id': 3, 'fish_name': '오징어', 'unit': '박스', 'aliases': ['스퀴드']},
            {'id': 4, 'fish_name': '명태', 'unit': '마리', 'aliases': ['폴락']},
            {'id': 201, 'fish_name': '도미', 'unit': 'kg', 'aliases': ['브림']},
            {'id': 202, 'fish_name': '방어', 'unit': '마리', 'aliases': ['옐로우테일']},
            {'id': 203, 'fish_name': '삼치', 'unit': '마리', 'aliases': ['스페니시마커럴']},
            {'id': 204, 'fish_name': '전어', 'unit': '마리', 'aliases': ['플라운더']},
            {'id': 205, 'fish_name': '꽁치', 'unit': '마리', 'aliases': ['사우리']},
            {'id': 206, 'fish_name': '청어', 'unit': '마리', 'aliases': ['헤링']},
        ]
        
        for data in fish_types_data:
            FishType.objects.create(**data)
        
        self.stdout.write(f'✓ {len(fish_types_data)}개의 어종 데이터 생성 완료')
        
        # 샘플 주문 데이터 생성 (선택사항)
        sample_orders = [
            {
                'business_id': 5679,
                'total_price': 144000,
                'source_type': 'manual',
                'delivery_date': datetime.now().date() + timedelta(days=3),
                'transcribed_text': '오징어 3박스 주문합니다',
                'memo': '오전 중 배송 부탁드립니다',
                'items': [
                    {'fish_type_id': 3, 'quantity': 3, 'unit_price': 48000, 'unit': '박스'}
                ]
            }
        ]
        
        for order_data in sample_orders:
            items_data = order_data.pop('items')
            order = Order.objects.create(
                business_id=order_data['business_id'],
                total_price=order_data['total_price'],
                order_datetime=datetime.now(),
                delivery_date=order_data['delivery_date'],
                source_type=order_data['source_type'],
                transcribed_text=order_data['transcribed_text'],
                memo=order_data['memo'],
                status='pending'
            )
            
            for item_data in items_data:
                OrderItem.objects.create(order=order, **item_data)
        
        self.stdout.write(f'✓ {len(sample_orders)}개의 샘플 주문 데이터 생성 완료')
        
        self.stdout.write(
            self.style.SUCCESS('🎉 더미 데이터 생성이 완료되었습니다!')
        )
        
        # 생성된 데이터 요약
        self.stdout.write(f'\n📊 생성된 데이터 요약:')
        self.stdout.write(f'  - 거래처: {Business.objects.count()}개')
        self.stdout.write(f'  - 어종: {FishType.objects.count()}개')
        self.stdout.write(f'  - 주문: {Order.objects.count()}개')
        self.stdout.write(f'  - 주문 품목: {OrderItem.objects.count()}개') 