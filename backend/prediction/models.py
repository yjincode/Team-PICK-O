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
    어종 크기/중량 등급 모델 [cite: 110]
    API의 크기 코드를 바탕으로 중량 구간을 정의합니다.
    """
    size_code = models.CharField(max_length=50, unique=True, verbose_name="크기 코드")
    size_name_kr = models.CharField(max_length=100, verbose_name="크기명")
    min_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="최소 중량(kg)")
    max_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="최대 중량(kg)")

    class Meta:
        verbose_name = "어종 중량 등급"
        verbose_name_plural = "어종 중량 등급 목록"

    def __str__(self):
        return self.size_name_kr

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

class ActualCatchVolume(models.Model):
    """
    실제 어획량 데이터 모델
    KOSIS 어업생산동향조사 API 데이터를 저장합니다. [cite: 86]
    """
    data_period = models.DateField(verbose_name="수록 시점 (월 단위)")  # [cite: 94]
    fishery_type_code = models.CharField(max_length=50, verbose_name="어업별 코드")  # [cite: 99]
    fish_species = models.ForeignKey(FishSpecies, on_delete=models.PROTECT, verbose_name="어종")  # [cite: 101]
    admin_division_code = models.CharField(max_length=50, verbose_name="행정구역 코드")  # [cite: 103]
    catch_volume = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="생산량(톤)")  # [cite: 95]
    catch_amount = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="생산금액(천원)")  # [cite: 95]
    last_modified_date = models.DateField(verbose_name="최종 수정일")  # [cite: 97]

    class Meta:
        verbose_name = "실제 어획량"
        verbose_name_plural = "실제 어획량 목록"
        ordering = ['-data_period']

    def __str__(self):
        return f"{self.data_period.strftime('%Y-%m')} / {self.fish_species.item_small_category_name_kr} / {self.catch_volume}톤"

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