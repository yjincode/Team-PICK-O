from django.core.management.base import BaseCommand
from fish_registry.models import FishType
from decimal import Decimal


class Command(BaseCommand):
    help = '어종별 기본 단가를 설정합니다.'

    def handle(self, *args, **options):
        # 수산도매업 기준 어종별 기본 단가 (kg당, 박스당, 마리당 등) - 현실적인 가격
        default_prices = {
            # 고등어류 (현실적인 도매가)
            '고등어': {'price': 3000, 'unit': 'kg'},
            '고등어(박스)': {'price': 50000, 'unit': '박스'},
            '고등어(마리)': {'price': 1500, 'unit': '마리'},
            
            # 참돔류
            '참돔': {'price': 8000, 'unit': 'kg'},
            '참돔(마리)': {'price': 12000, 'unit': '마리'},
            '참돔(박스)': {'price': 80000, 'unit': '박스'},
            
            # 광어류
            '광어': {'price': 5000, 'unit': 'kg'},
            '광어(마리)': {'price': 8000, 'unit': '마리'},
            '광어(박스)': {'price': 40000, 'unit': '박스'},
            
            # 오징어류
            '오징어': {'price': 7000, 'unit': 'kg'},
            '오징어(마리)': {'price': 5000, 'unit': '마리'},
            '오징어(박스)': {'price': 60000, 'unit': '박스'},
            
            # 활어류
            '활어': {'price': 6000, 'unit': 'kg'},
            '활어(마리)': {'price': 8000, 'unit': '마리'},
            
            # 조개류
            '바지락': {'price': 2000, 'unit': 'kg'},
            '홍합': {'price': 1500, 'unit': 'kg'},
            '굴': {'price': 3000, 'unit': 'kg'},
            '전복': {'price': 50000, 'unit': 'kg'},
            
            # 새우류
            '새우': {'price': 15000, 'unit': 'kg'},
            '새우(마리)': {'price': 300, 'unit': '마리'},
            '새우(박스)': {'price': 120000, 'unit': '박스'},
            
            # 게류
            '게': {'price': 8000, 'unit': 'kg'},
            '게(마리)': {'price': 5000, 'unit': '마리'},
            
            # 기타
            '문어': {'price': 10000, 'unit': 'kg'},
            '문어(마리)': {'price': 8000, 'unit': '마리'},
            '낙지': {'price': 12000, 'unit': 'kg'},
            '낙지(마리)': {'price': 2000, 'unit': '마리'},
        }

        updated_count = 0
        created_count = 0

        for fish_name, price_info in default_prices.items():
            try:
                # 어종명으로 검색 (별칭도 포함)
                fish_type = FishType.objects.filter(
                    name__icontains=fish_name.split('(')[0]  # 괄호 앞부분만 사용
                ).first()
                
                if fish_type:
                    # 단위가 일치하는 경우에만 가격 설정
                    if fish_type.unit in price_info['unit'] or price_info['unit'] in fish_type.unit:
                        fish_type.default_price = price_info['price']  # 소수점 제거
                        fish_type.save()
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✅ {fish_type.name} ({fish_type.unit}): {price_info["price"]:,}원 설정 완료'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'⚠️ {fish_type.name} 단위 불일치: {fish_type.unit} vs {price_info["unit"]}'
                            )
                        )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️ {fish_name} 어종을 찾을 수 없음'
                        )
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ {fish_name} 처리 중 오류: {str(e)}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎯 기본 단가 설정 완료: {updated_count}개 업데이트, {created_count}개 생성'
            )
        )
        
        # 설정된 가격이 있는 어종 목록 출력
        fish_with_prices = FishType.objects.filter(default_price__isnull=False)
        if fish_with_prices.exists():
            self.stdout.write('\n📊 설정된 기본 단가 목록:')
            for fish in fish_with_prices:
                self.stdout.write(
                    f'  • {fish.name} ({fish.unit}): {fish.default_price:,}원'
                )
