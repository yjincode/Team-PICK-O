from django.core.management.base import BaseCommand
from prediction.models import FishSpecies, WholesaleMarket, CommonCode, FishWeightTier


class Command(BaseCommand):
    help = '데이터 수집에 필요한 초기 데이터를 생성합니다'

    def handle(self, *args, **options):
        self.stdout.write('🔄 초기 데이터 생성 시작...')
        
        # 1. CommonCode 생성
        codes_to_create = [
            {'type': 'PLOR', 'value': 'KOREA', 'name': '국내산'},
            {'type': 'PKG', 'value': 'BOX', 'name': '상자'},
            {'type': 'GRD', 'value': 'SPECIAL', 'name': '특급'},
            {'type': 'UNIT', 'value': 'KG', 'name': '킬로그램'},
        ]
        
        for code in codes_to_create:
            obj, created = CommonCode.objects.get_or_create(
                code_type=code['type'],
                code_value=code['value'],
                defaults={'code_name_kr': code['name']}
            )
            if created:
                self.stdout.write(f'✅ CommonCode 생성: {code["type"]}-{code["value"]}')
            else:
                self.stdout.write(f'ℹ️ CommonCode 이미 존재: {code["type"]}-{code["value"]}')
        
        # 2. FishWeightTier 생성
        weight_tiers = [
            {'code': 'FWT_XS', 'name': '초소형 (0.05kg)', 'min': 0.05, 'max': 0.2},
            {'code': 'FWT_S', 'name': '소형 (0.2kg)', 'min': 0.2, 'max': 0.5},
            {'code': 'FWT_M', 'name': '중형 (0.5kg)', 'min': 0.5, 'max': 0.8},
            {'code': 'FWT_L', 'name': '대형 (1.0kg)', 'min': 0.8, 'max': 1.2},
            {'code': 'FWT_XL', 'name': '초대형 (1.5kg)', 'min': 1.2, 'max': 2.0},
        ]
        
        for tier in weight_tiers:
            obj, created = FishWeightTier.objects.get_or_create(
                size_code=tier['code'],
                defaults={
                    'size_name_kr': tier['name'],
                    'min_weight_kg': tier['min'],
                    'max_weight_kg': tier['max']
                }
            )
            if created:
                self.stdout.write(f'✅ FishWeightTier 생성: {tier["code"]}')
            else:
                self.stdout.write(f'ℹ️ FishWeightTier 이미 존재: {tier["code"]}')
        
        # 3. FishSpecies 생성
        fish_species = [
            {'korean': '(활)넙치', 'large': '수산물', 'medium': '활어류', 'small_code': 'FLOUNDER'},
            {'korean': '(활)참돔', 'large': '수산물', 'medium': '활어류', 'small_code': 'RED_SEA_BREAM'},
            {'korean': '(활)농어', 'large': '수산물', 'medium': '활어류', 'small_code': 'SEA_BASS'},
            {'korean': '(활)참숭어', 'large': '수산물', 'medium': '활어류', 'small_code': 'MULLET'},
            {'korean': '(활)우럭', 'large': '수산물', 'medium': '활어류', 'small_code': 'ROCKFISH'},
        ]
        
        for fish in fish_species:
            obj, created = FishSpecies.objects.get_or_create(
                item_small_category_name_kr=fish['korean'],
                defaults={
                    'item_large_category_name_kr': fish['large'],
                    'item_medium_category_name_kr': fish['medium'],
                    'item_small_category_code': fish['small_code']
                }
            )
            if created:
                self.stdout.write(f'✅ FishSpecies 생성: {fish["korean"]}')
            else:
                self.stdout.write(f'ℹ️ FishSpecies 이미 존재: {fish["korean"]}')
        
        # 4. WholesaleMarket 생성 (노량진)
        obj, created = WholesaleMarket.objects.get_or_create(
            market_api_code='NORYANGJIN',
            defaults={
                'market_name_kr': '노량진수산시장',
                'location': 'SEOUL'
            }
        )
        if created:
            self.stdout.write('✅ WholesaleMarket 생성: 노량진수산시장')
        else:
            self.stdout.write('ℹ️ WholesaleMarket 이미 존재: 노량진수산시장')
        
        self.stdout.write(self.style.SUCCESS('🎉 모든 초기 데이터 생성 완료!'))
        self.stdout.write('이제 노량진 데이터 수집을 다시 실행할 수 있습니다.')
