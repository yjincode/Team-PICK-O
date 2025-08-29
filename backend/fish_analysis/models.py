from django.db import models
from django.conf import settings


class FishAnalysis(models.Model):
    """어류 질병 분석 결과 모델"""
    
    STATUS_CHOICES = [
        ('processing', '분석 중'),
        ('completed', '완료'),
        ('failed', '실패'),
    ]
    
    HEALTH_STATUS_CHOICES = [
        ('good', '상'),
        ('fair', '중'), 
        ('poor', '하'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="사용자")
    
    # 분석 기본 정보
    original_image = models.ImageField(upload_to='fish_analysis/original/%Y/%m/%d/', verbose_name="원본 이미지")
    processed_image = models.ImageField(upload_to='fish_analysis/processed/%Y/%m/%d/', null=True, blank=True, verbose_name="처리된 이미지")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing', verbose_name="분석 상태")
    overall_health_status = models.CharField(max_length=10, choices=HEALTH_STATUS_CHOICES, null=True, blank=True, verbose_name="전체 건강 상태")
    
    # 분석 결과 메타데이터
    yolo_confidence_avg = models.FloatField(null=True, blank=True, verbose_name="YOLO 평균 신뢰도")
    total_detections = models.IntegerField(default=0, verbose_name="총 탐지 개수")
    
    # 시간 정보
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="완료일시")
    
    class Meta:
        db_table = 'fish_analyses'
        verbose_name = '어류 분석'
        verbose_name_plural = '어류 분석들'
        ordering = ['-created_at']

    def __str__(self):
        return f"분석 #{self.id} - {self.user.business_name} ({self.get_status_display()})"


class DiseaseDetection(models.Model):
    """개별 질병 탐지 결과 모델"""
    
    SEVERITY_CHOICES = [
        ('mild', '경미'),
        ('moderate', '보통'),
        ('severe', '심각'),
        ('critical', '긴급'),
    ]
    
    id = models.AutoField(primary_key=True)
    analysis = models.ForeignKey(FishAnalysis, on_delete=models.CASCADE, related_name='detections', verbose_name="분석")
    
    # YOLO 탐지 정보
    bbox_x = models.FloatField(verbose_name="바운딩박스 X 좌표")
    bbox_y = models.FloatField(verbose_name="바운딩박스 Y 좌표")
    bbox_width = models.FloatField(verbose_name="바운딩박스 너비")
    bbox_height = models.FloatField(verbose_name="바운딩박스 높이")
    yolo_confidence = models.FloatField(verbose_name="YOLO 신뢰도")
    
    # 크롭된 이미지 및 VGG 분석
    cropped_image = models.ImageField(upload_to='fish_analysis/cropped/%Y/%m/%d/', verbose_name="크롭된 이미지")
    disease_class = models.CharField(max_length=100, verbose_name="질병 클래스")
    disease_name_ko = models.CharField(max_length=100, verbose_name="질병명 (한국어)")
    vgg_confidence = models.FloatField(verbose_name="VGG 신뢰도")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, verbose_name="심각도")
    
    # 질병 정보
    description = models.TextField(blank=True, null=True, verbose_name="질병 설명")
    treatment_recommendation = models.TextField(blank=True, null=True, verbose_name="치료 권장사항")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    
    class Meta:
        db_table = 'disease_detections'
        verbose_name = '질병 탐지'
        verbose_name_plural = '질병 탐지들'
        ordering = ['-vgg_confidence']

    def __str__(self):
        return f"{self.disease_name_ko} - {self.get_severity_display()} (신뢰도: {self.vgg_confidence:.2f})"


class DiseaseClass(models.Model):
    """질병 클래스 정보 모델"""
    
    id = models.AutoField(primary_key=True)
    class_name = models.CharField(max_length=100, unique=True, verbose_name="클래스명")
    disease_name_ko = models.CharField(max_length=100, verbose_name="질병명 (한국어)")
    disease_name_en = models.CharField(max_length=100, verbose_name="질병명 (영어)")
    
    # 질병 정보
    description = models.TextField(verbose_name="질병 설명")
    symptoms = models.TextField(verbose_name="증상")
    causes = models.TextField(verbose_name="원인")
    treatment = models.TextField(verbose_name="치료법")
    prevention = models.TextField(verbose_name="예방법")
    
    # 심각도 기본값
    default_severity = models.CharField(max_length=20, choices=DiseaseDetection.SEVERITY_CHOICES, default='moderate', verbose_name="기본 심각도")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")
    
    class Meta:
        db_table = 'disease_classes'
        verbose_name = '질병 클래스'
        verbose_name_plural = '질병 클래스들'
        ordering = ['class_name']

    def __str__(self):
        return f"{self.class_name} - {self.disease_name_ko}"
