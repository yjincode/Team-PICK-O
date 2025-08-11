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
    
    stock_quantity = models.FloatField(default=0, verbose_name="재고 수량")
    unit = models.CharField(max_length=20, verbose_name="단위")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered', verbose_name="상태")
    aquarium_photo_path = models.TextField(blank=True, null=True, verbose_name="사진 경로")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정 시각")

    class Meta:
        db_table = 'inventories'
        verbose_name = '재고'
        verbose_name_plural = '재고들'

    def __str__(self):
        return f"{self.fish_type.name} - {self.stock_quantity} {self.unit}"


class InventoryLog(models.Model):
    """입출고 이력 모델"""
    TYPE_CHOICES = [
        ('in', '입고'),
        ('out', '출고'),
    ]

    SOURCE_CHOICES = [
        ('manual', '수동'),
        ('AI', 'AI'),
        ('YOLO', 'YOLO'),
    ]

    id = models.AutoField(primary_key=True)
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, verbose_name="재고")
    fish_type = models.ForeignKey('fish_registry.FishType', on_delete=models.CASCADE, verbose_name="어종")
    
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name="입출고 구분")
    change = models.FloatField(verbose_name="수량 변화량")
    before_quantity = models.FloatField(verbose_name="이전 수량")
    after_quantity = models.FloatField(verbose_name="이후 수량")
    unit = models.CharField(max_length=20, verbose_name="단위")
    
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, verbose_name="처리 방식")
    memo = models.TextField(blank=True, null=True, verbose_name="설명")
    
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="사용자")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")

    class Meta:
        db_table = 'inventory_logs'
        verbose_name = '입출고 이력'
        verbose_name_plural = '입출고 이력들'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_display()} - {self.fish_type.name} {self.change} {self.unit}" 