from django.db import models
from django.conf import settings


class Inventory(models.Model):
    """재고 모델"""
    STATUS_CHOICES = [
        ('registered', '등록됨'),
        ('normal', '정상'),
        ('low', '부족'),
        ('abnormal', '이상'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="사용자")
    fish_type = models.ForeignKey('fish_registry.FishType', on_delete=models.CASCADE, verbose_name="어종")
    
    stock_quantity = models.IntegerField(default=0, verbose_name="재고 수량")
    ordered_quantity = models.IntegerField(default=0, verbose_name="주문 수량") 
    unit = models.CharField(max_length=20, verbose_name="단위")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered', verbose_name="상태")
    
    # 안전재고 관련 필드들
    safety_stock_quantity = models.IntegerField(null=True, blank=True, verbose_name="안전재고 수량")
    reorder_point = models.IntegerField(null=True, blank=True, verbose_name="재주문점")
    
    # 가격 관련 필드들
    unit_price = models.IntegerField(null=True, blank=True, verbose_name="단가")
    total_amount = models.IntegerField(null=True, blank=True, verbose_name="총액")
    
    aquarium_photo_path = models.TextField(blank=True, null=True, verbose_name="사진 경로")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정 시각")

    class Meta:
        db_table = 'inventories'
        verbose_name = '재고'
        verbose_name_plural = '재고들'

    def __str__(self):
        return f"{self.fish_type.name} - 재고:{self.stock_quantity} 주문:{self.ordered_quantity} {self.unit}"


class InventoryLog(models.Model):
    """입출고 이력 모델"""
    TYPE_CHOICES = [
        ('in', '입고'),
        ('out', '출고'),
        ('adjust', '조정'),
    ]
    
    SOURCE_CHOICES = [
        ('manual', '수동'),
        ('AI', 'AI'),
        ('YOLO', 'YOLO'),
        ('order', '주문'),
        ('payment', '결제'),
        ('order_shipout', '주문 출고'),
    ]
    
    id = models.AutoField(primary_key=True)
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, verbose_name="재고")
    fish_type = models.ForeignKey('fish_registry.FishType', on_delete=models.CASCADE, verbose_name="어종")
    
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name="입출고 구분")
    change = models.IntegerField(verbose_name="수량 변화량")
    before_quantity = models.IntegerField(verbose_name="이전 수량")
    after_quantity = models.IntegerField(verbose_name="이후 수량")
    unit = models.CharField(max_length=20, verbose_name="단위")
    
    # 가격 관련 필드들
    unit_price = models.IntegerField(null=True, blank=True, verbose_name="단가")
    total_amount = models.IntegerField(null=True, blank=True, verbose_name="총액")
    
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, verbose_name="처리 방식")
    memo = models.TextField(blank=True, null=True, verbose_name="설명")
    
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="사용자")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")

    # 이상 탐지 관련 컬럼들
    anomaly_score = models.FloatField(default=1.0, null=True, blank=True, verbose_name="이상 탐지 점수")
    is_anomaly = models.BooleanField(default=False, null=True, blank=True, verbose_name="이상 탐지 여부")
    anomaly_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="이상 유형")

    class Meta:
        db_table = 'inventory_logs'
        verbose_name = '입출고 이력'
        verbose_name_plural = '입출고 이력들'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_display()} - {self.fish_type.name} {self.change} {self.unit}"


class InventoryAnomaly(models.Model):
    """이상 탐지 결과 상세 모델"""
    SEVERITY_CHOICES = [
        ('LOW', '낮음'),
        ('MEDIUM', '보통'),
        ('HIGH', '높음'),
        ('CRITICAL', '긴급'),
    ]

    id = models.AutoField(primary_key=True)
    log = models.ForeignKey(InventoryLog, on_delete=models.CASCADE, verbose_name="관련 로그")
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, verbose_name="재고")
    
    anomaly_type = models.CharField(max_length=50, verbose_name="이상 유형")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, verbose_name="심각도")
    confidence_score = models.FloatField(verbose_name="AI 신뢰도")
    
    detected_at = models.DateTimeField(auto_now_add=True, verbose_name="탐지 시각")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="해결 시각")
    description = models.TextField(verbose_name="이상 상황 설명")
    
    ai_model_version = models.CharField(max_length=50, blank=True, null=True, verbose_name="AI 모델 버전")
    features_used = models.JSONField(null=True, blank=True, verbose_name="사용된 특성들")
    prediction_horizon = models.IntegerField(null=True, blank=True, verbose_name="예측 기간 (일)")
    recommended_action = models.TextField(blank=True, null=True, verbose_name="권장 조치")

    class Meta:
        db_table = 'inventory_anomalies'
        verbose_name = '재고 이상 탐지'
        verbose_name_plural = '재고 이상 탐지들'
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.anomaly_type} - {self.inventory.fish_type.name} ({self.get_severity_display()})"


class InventoryPattern(models.Model):
    """패턴 분석 결과 모델"""
    PATTERN_CHOICES = [
        ('seasonal', '계절성'),
        ('weekly', '주간'),
        ('daily', '일간'),
        ('trend', '트렌드'),
        ('anomaly', '이상 패턴'),
    ]

    id = models.AutoField(primary_key=True)
    fish_type = models.ForeignKey('fish_registry.FishType', on_delete=models.CASCADE, verbose_name="어종")
    
    pattern_type = models.CharField(max_length=50, choices=PATTERN_CHOICES, verbose_name="패턴 유형")
    pattern_data = models.JSONField(verbose_name="패턴 데이터")
    confidence_interval = models.JSONField(null=True, blank=True, verbose_name="신뢰구간")
    
    last_updated = models.DateTimeField(auto_now=True, verbose_name="마지막 업데이트")
    is_active = models.BooleanField(default=True, verbose_name="활성 상태")

    class Meta:
        db_table = 'inventory_patterns'
        verbose_name = '재고 패턴'
        verbose_name_plural = '재고 패턴들'
        ordering = ['-last_updated']

    def __str__(self):
        return f"{self.fish_type.name} - {self.get_pattern_type_display()}"


class StockTransaction(models.Model):
    """재고 변동 추적 모델 - 주문과 연동"""
    
    TRANSACTION_CHOICES = [
        ('order', '주문으로 인한 차감'),
        ('cancel', '주문 취소로 인한 복원'),
        ('adjustment', '재고 조정'),
        ('stock_in', '입고'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="사용자"
    )
    fish_type = models.ForeignKey(
        'fish_registry.FishType',
        on_delete=models.CASCADE,
        verbose_name="어종"
    )
    inventory = models.ForeignKey(
        'Inventory',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="관련 재고"
    )
    order = models.ForeignKey(
        'order.Order',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="관련 주문"
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_CHOICES,
        verbose_name="거래 유형"
    )
    quantity_change = models.FloatField(verbose_name="수량 변동 (음수: 차감, 양수: 증가)")
    unit = models.CharField(max_length=20, verbose_name="단위")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    notes = models.TextField(blank=True, null=True, verbose_name="비고")

    class Meta:
        db_table = 'stock_transactions'
        verbose_name = '재고 거래'
        verbose_name_plural = '재고 거래들'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.fish_type.name} {self.quantity_change:+g}{self.unit} ({self.get_transaction_type_display()})" 