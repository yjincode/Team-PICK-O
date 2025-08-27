# backend/api/models.py

from django.db import models

# ===================================================================
# 1. 마스터 데이터 모델 (기준 정보)
# ===================================================================
# AI 모델링에 필요한 데이터들의 기준이 되는 핵심 정보입니다.
# 각종 외부 데이터는 아래 모델들을 외래 키로 참조하여 일관성을 유지합니다.
# -------------------------------------------------------------------

class CommonCode(models.Model):
    """
    공통 코드 모델 [cite: 106]
    단위, 법인, 산지, 포장, 등급 등 반복되는 코드성 데이터를 관리합니다.
    """
    code_type = models.CharField(max_length=20, verbose_name="코드 타입") # 예: 'UNIT' [cite: 109], 'CORP' [cite: 113], 'PLOR' [cite: 114], 'PKG' [cite: 115], 'GRD' [cite: 116]
    code_value = models.CharField(max_length=50, verbose_name="코드값")
    code_name_kr = models.CharField(max_length=100, verbose_name="코드명 (한글)")

    class Meta:
        verbose_name = "공통 코드"
        verbose_name_plural = "공통 코드 목록"
        unique_together = ('code_type', 'code_value') # 코드 타입과 값은 유일해야 함

    def __str__(self):
        return f'[{self.code_type}] {self.code_name_kr} ({self.code_value})'

class WholesaleMarket(models.Model):
    """
    도매시장 마스터 모델 [cite: 112]
    전국 공영도매시장 정보를 관리합니다.
    """
    market_api_code = models.CharField(max_length=50, unique=True, verbose_name="도매시장 API 코드")
    market_name_kr = models.CharField(max_length=100, verbose_name="도매시장명")
    location = models.CharField(max_length=255, blank=True, verbose_name="위치")

    class Meta:
        verbose_name = "도매시장"
        verbose_name_plural = "도매시장 목록"

    def __str__(self):
        return self.market_name_kr

class FishSpecies(models.Model):
    """
    어종 마스터 모델 [cite: 117]
    농축수산물 표준코드의 품목 정보를 바탕으로 어종 데이터를 관리합니다.
    """
    item_large_category_code = models.CharField(max_length=50, verbose_name="대분류 코드")
    item_large_category_name_kr = models.CharField(max_length=100, verbose_name="대분류명")
    item_medium_category_code = models.CharField(max_length=50, verbose_name="중분류 코드")
    item_medium_category_name_kr = models.CharField(max_length=100, verbose_name="중분류명")
    item_small_category_code = models.CharField(max_length=50, unique=True, verbose_name="소분류 코드")
    item_small_category_name_kr = models.CharField(max_length=100, verbose_name="소분류명(어종명)")

    class Meta:
        verbose_name = "어종"
        verbose_name_plural = "어종 목록"

    def __str__(self):
        return self.item_small_category_name_kr

class FishWeightTier(models.Model):
    """
    어류 무게 등급 마스터 모델
    시스템이 사용할 표준 규격 등급을 정의합니다.
    각 등급은 평균 무게(avg_weight_kg)를 가지며, 이 값이 모델 학습에 사용될 핵심 피처가 됩니다.
    """
    tier_code = models.CharField(max_length=20, primary_key=True, verbose_name="등급 코드")
    tier_name = models.CharField(max_length=50, verbose_name="등급명")
    description = models.TextField(verbose_name="설명")
    avg_weight_kg = models.FloatField(verbose_name="평균 무게(kg)")
    
    class Meta:
        verbose_name = "어류 무게 등급"
        verbose_name_plural = "어류 무게 등급 목록"
        ordering = ['avg_weight_kg']

    def __str__(self):
        return f"{self.tier_code} - {self.tier_name} ({self.avg_weight_kg}kg)"

class SizeStandardMapping(models.Model):
    """
    규격 매핑 모델
    원본 규격명을 표준 등급(tier_code)으로 연결하는 매핑 테이블입니다.
    """
    raw_label = models.CharField(max_length=100, primary_key=True, verbose_name="원본 규격명")
    tier_code = models.ForeignKey(FishWeightTier, on_delete=models.CASCADE, verbose_name="표준 등급")
    processing_logic = models.TextField(verbose_name="처리 로직")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")
    
    class Meta:
        verbose_name = "규격 매핑"
        verbose_name_plural = "규격 매핑 목록"
        ordering = ['raw_label']

    def __str__(self):
        return f"{self.raw_label} → {self.tier_code.tier_code}"

class FishAuctionData(models.Model):
    """
    수산물 경매 데이터 모델
    전국 도매시장 정산 경락가격 요약 정보 API에서 수집한 데이터를 저장합니다.
    """
    # 기본 정보
    collection_timestamp = models.DateTimeField(auto_now_add=True, verbose_name="수집일시")
    auction_date = models.DateField(verbose_name="경락일")
    target_species = models.CharField(max_length=50, verbose_name="수집어종")
    
    # 도매시장 정보
    market_name = models.CharField(max_length=100, verbose_name="도매시장명")
    market_code = models.CharField(max_length=20, verbose_name="도매시장코드")
    corporation_name = models.CharField(max_length=100, verbose_name="도매법인명")
    corporation_code = models.CharField(max_length=20, verbose_name="도매법인코드")
    
    # 품목 정보
    product_name = models.CharField(max_length=100, verbose_name="품목명")
    product_code = models.CharField(max_length=20, verbose_name="품목코드")
    species_name = models.CharField(max_length=100, verbose_name="품종명")
    species_code = models.CharField(max_length=20, verbose_name="품종코드")
    
    # 거래 정보
    trade_unit_quantity = models.IntegerField(null=True, blank=True, verbose_name="거래단위수량")
    standard = models.CharField(max_length=50, verbose_name="규격")
    standard_code = models.CharField(max_length=20, verbose_name="규격코드")
    grade = models.CharField(max_length=50, verbose_name="등급")
    grade_code = models.CharField(max_length=20, verbose_name="등급코드")
    
    # 산지 정보
    origin_code = models.CharField(max_length=20, verbose_name="산지코드")
    origin_name = models.CharField(max_length=100, verbose_name="산지명")
    
    # 가격 정보
    min_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="최저가")
    avg_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="평균가")
    max_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="최고가")
    trade_quantity = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="거래량")
    trade_count = models.IntegerField(null=True, blank=True, verbose_name="건수")
    
    # 규격 표준화 필드 (새로 추가)
    tier_code = models.ForeignKey(FishWeightTier, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="표준 등급")
    avg_weight_kg = models.FloatField(null=True, blank=True, verbose_name="평균 무게(kg)")
    
    # 데이터 품질 관리
    is_valid = models.BooleanField(default=True, verbose_name="유효성")
    data_source = models.CharField(max_length=50, default='AGRICULTURE_API', verbose_name="데이터출처")
    
    class Meta:
        verbose_name = "수산물 경매 데이터"
        verbose_name_plural = "수산물 경매 데이터 목록"
        ordering = ['-auction_date', '-collection_timestamp']
        indexes = [
            models.Index(fields=['auction_date']),
            models.Index(fields=['target_species']),
            models.Index(fields=['market_name']),
            models.Index(fields=['product_name']),
            models.Index(fields=['tier_code']),  # 새로 추가
        ]

    def __str__(self):
        return f"{self.auction_date} / {self.market_name} / {self.product_name} / {self.avg_price}원"

# ===================================================================
# 2. 외부 데이터 모델 (AI 예측 Feature)
# ===================================================================
# AI 경매가 예측 모델 학습 및 추론에 사용될 외부 데이터를 저장합니다.
# -------------------------------------------------------------------

class ActualAuctionPrice(models.Model):
    """
    실제 경매 가격 데이터 모델 [cite: 1]
    aT, EPIS 등에서 제공하는 일별/실시간 경매 데이터를 저장합니다.
    """
    auction_sequence_id = models.CharField(max_length=100, unique=True, verbose_name="경매 일련번호")  # [cite: 5]
    trade_date = models.DateField(verbose_name="거래 정산일")  # [cite: 6]
    trade_timestamp = models.DateTimeField(null=True, blank=True, verbose_name="거래 시각")  # [cite: 7]
    market = models.ForeignKey(WholesaleMarket, on_delete=models.PROTECT, verbose_name="도매시장")  # [cite: 8]
    fish_species = models.ForeignKey(FishSpecies, on_delete=models.PROTECT, verbose_name="어종")  # [cite: 12]
    origin_place_code = models.ForeignKey(CommonCode, on_delete=models.PROTECT, related_name='auction_origin_places', limit_choices_to={'code_type': 'PLOR'}, verbose_name="산지 코드")  # [cite: 14]
    package_code = models.ForeignKey(CommonCode, on_delete=models.PROTECT, related_name='auction_packages', limit_choices_to={'code_type': 'PKG'}, verbose_name="포장 코드")  # [cite: 16]
    unit_code = models.ForeignKey(CommonCode, on_delete=models.PROTECT, related_name='auction_units', limit_choices_to={'code_type': 'UNIT'}, verbose_name="단위 코드")  # [cite: 18]
    grade_code = models.ForeignKey(CommonCode, on_delete=models.PROTECT, related_name='auction_grades', limit_choices_to={'code_type': 'GRD'}, null=True, blank=True, verbose_name="등급 코드")  # [cite: 36]
    trade_volume = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="거래량")  # [cite: 20]
    auction_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="경매 가격")  # [cite: 21]
    unit_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="단위 중량(kg)")  # [cite: 22]

    class Meta:
        verbose_name = "실제 경매 가격"
        verbose_name_plural = "실제 경매 가격 목록"
        ordering = ['-trade_date']

    def __str__(self):
        return f"{self.trade_date} / {self.market.market_name_kr} / {self.fish_species.item_small_category_name_kr} / {self.auction_price}원"

class MonthlyAveragePrice(models.Model):
    """
    월간 평균 가격 데이터 모델
    서울시농수산식품공사 월간등락품목(월평균가격) CSV 데이터를 저장합니다.
    """
    data_month = models.DateField(verbose_name="데이터 월")  # YYYY-MM-01 형식
    fish_species = models.ForeignKey(FishSpecies, on_delete=models.PROTECT, verbose_name="어종")
    market = models.ForeignKey(WholesaleMarket, on_delete=models.PROTECT, verbose_name="도매시장")
    average_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="월평균가격(원/kg)")
    price_change = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="가격변동률(%)")
    volume_traded = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="거래량(kg)")
    data_source = models.CharField(max_length=50, default='SEOUL_FISH_MARKET', verbose_name="데이터 출처")
    
    # 추가 필드들
    fish_type = models.CharField(max_length=20, choices=[
        ('NATURAL', '자연산'),
        ('CULTURED', '양식'),
        ('UNKNOWN', '미분류')
    ], default='UNKNOWN', verbose_name="어종 구분")
    grade = models.CharField(max_length=10, null=True, blank=True, verbose_name="등급")
    unit = models.CharField(max_length=20, null=True, blank=True, verbose_name="단위")
    
    class Meta:
        verbose_name = "월간 평균 가격"
        verbose_name_plural = "월간 평균 가격 목록"
        ordering = ['-data_month']
        unique_together = ('data_month', 'fish_species', 'market', 'fish_type', 'grade')  # 같은 월, 같은 어종, 같은 시장, 같은 구분, 같은 등급은 중복 불가

    def __str__(self):
        return f"{self.data_month.strftime('%Y-%m')} / {self.fish_species.item_small_category_name_kr}({self.get_fish_type_display()}) / {self.average_price}원/kg"

class ExternalEnvironmentalData(models.Model):
    """
    외부 환경 데이터 모델
    기상청(육상/예보), 해양수산부(수온/염분 등) 데이터를 통합 저장합니다. [cite: 37, 46, 57, 70, 78]
    """
    data_source = models.CharField(max_length=50, verbose_name="데이터 출처")  # 예: KMA, NIFS, KHOA
    data_timestamp = models.DateTimeField(verbose_name="관측/예보 시각")
    location_identifier = models.CharField(max_length=100, verbose_name="위치 식별자")  # 예: 관측소 코드, 격자 좌표
    data_type = models.CharField(max_length=100, verbose_name="데이터 타입")  # 예: 'avg_temperature' [cite: 42], 'water_temperature' [cite: 62], 'salinity' [cite: 64]
    value = models.DecimalField(max_digits=10, decimal_places=3, verbose_name="측정값")
    unit = models.CharField(max_length=20, verbose_name="단위")  # 예: 'C', 'mm', 'm/s'

    class Meta:
        verbose_name = "외부 환경 데이터"
        verbose_name_plural = "외부 환경 데이터 목록"
        ordering = ['-data_timestamp']

    def __str__(self):
        return f"{self.data_timestamp} / {self.location_identifier} / {self.data_type}: {self.value}{self.unit}"


class ActualCatchVolume(models.Model):
    """
    실제 어획량 데이터 모델
    KOSIS 통계청에서 제공하는 월별 어획량 데이터를 저장합니다.
    """
    data_period = models.DateField(verbose_name="데이터 기간")  # YYYY-MM-01 형식
    fish_species = models.ForeignKey(FishSpecies, on_delete=models.PROTECT, verbose_name="어종")
    fishery_type_code = models.CharField(max_length=20, verbose_name="어업 종류 코드")
    admin_division_code = models.CharField(max_length=20, verbose_name="행정구역 코드")
    catch_volume = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="어획량(톤)")
    catch_amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="어획금액(천원)")
    last_modified_date = models.DateField(auto_now=True, verbose_name="최종 수정일")

    class Meta:
        verbose_name = "실제 어획량"
        verbose_name_plural = "실제 어획량 목록"
        ordering = ['-data_period']
        unique_together = ('data_period', 'fish_species', 'fishery_type_code', 'admin_division_code')

    def __str__(self):
        return f"{self.data_period} / {self.fish_species.item_small_category_name_kr} / {self.catch_volume}톤"