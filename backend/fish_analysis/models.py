from django.db import models
from django.conf import settings
import uuid
import os


def fish_image_upload_path(instance, filename):
    """생선 이미지 업로드 경로 생성"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('fish_images', filename)


class FishAnalysis(models.Model):
    """생선 분석 결과 모델"""
    
    SPECIES_CHOICES = [
        ('flatfish', '광어(넙치)'),
        ('unknown', '알 수 없음'),
    ]
    
    HEALTH_CHOICES = [
        ('healthy', '건강함'),
        ('diseased', '질병 있음'),
        ('suspicious', '의심스러움'),
        ('unknown', '알 수 없음'),
    ]
    
    # 기본 정보
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, verbose_name='사용자')
    image = models.ImageField(upload_to=fish_image_upload_path, verbose_name='생선 이미지')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='분석 시간')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정 시간')
    
    # 탐지 결과
    fish_detected = models.BooleanField(default=False, verbose_name='생선 탐지 여부')
    fish_species = models.CharField(
        max_length=20, 
        choices=SPECIES_CHOICES, 
        default='unknown',
        verbose_name='생선 종류'
    )
    species_confidence = models.FloatField(default=0.0, verbose_name='종류 분류 신뢰도')
    
    # 건강 상태
    overall_health = models.CharField(
        max_length=20,
        choices=HEALTH_CHOICES,
        default='unknown',
        verbose_name='전체 건강 상태'
    )
    health_confidence = models.FloatField(default=0.0, verbose_name='건강 상태 신뢰도')
    
    # 이미지 정보
    image_width = models.IntegerField(default=0, verbose_name='이미지 너비')
    image_height = models.IntegerField(default=0, verbose_name='이미지 높이')
    quality_score = models.FloatField(default=0.0, verbose_name='이미지 품질 점수')
    
    # 처리 정보
    processing_time = models.FloatField(default=0.0, verbose_name='처리 시간(초)')
    
    # 추가 정보
    recommendations = models.JSONField(default=list, blank=True, verbose_name='권장사항')
    warning_messages = models.JSONField(default=list, blank=True, verbose_name='경고 메시지')
    
    class Meta:
        db_table = 'fish_analysis'
        ordering = ['-created_at']
        verbose_name = '생선 분석 결과'
        verbose_name_plural = '생선 분석 결과들'
        
    def __str__(self):
        return f"생선 분석 {self.id} - {self.get_fish_species_display()} ({self.get_overall_health_display()})"
    
    @property
    def has_diseases(self):
        """질병이 있는지 확인"""
        return self.diseases.exists()
    
    @property
    def disease_count(self):
        """질병 개수"""
        return self.diseases.count()


class DetectionBox(models.Model):
    """객체 탐지 박스 모델"""
    
    analysis = models.ForeignKey(
        FishAnalysis, 
        on_delete=models.CASCADE, 
        related_name='detection_boxes',
        verbose_name='분석 결과'
    )
    
    # 박스 좌표
    x1 = models.FloatField(verbose_name='좌상단 X')
    y1 = models.FloatField(verbose_name='좌상단 Y')
    x2 = models.FloatField(verbose_name='우하단 X')
    y2 = models.FloatField(verbose_name='우하단 Y')
    
    # 탐지 정보
    confidence = models.FloatField(verbose_name='신뢰도')
    class_name = models.CharField(max_length=50, verbose_name='클래스 이름')
    
    class Meta:
        db_table = 'detection_box'
        verbose_name = '탐지 박스'
        verbose_name_plural = '탐지 박스들'
        
    def __str__(self):
        return f"{self.class_name} ({self.confidence:.2f})"
    
    @property
    def width(self):
        """박스 너비"""
        return abs(self.x2 - self.x1)
    
    @property
    def height(self):
        """박스 높이"""
        return abs(self.y2 - self.y1)
    
    @property
    def area(self):
        """박스 면적"""
        return self.width * self.height


class DiseaseDetection(models.Model):
    """질병 탐지 결과 모델"""
    
    DISEASE_TYPE_CHOICES = [
        ('bacterial', '세균성 질병'),
        ('viral', '바이러스성 질병'),
        ('parasitic', '기생충성 질병'),
        ('fungal', '진균성 질병'),
        ('nutritional', '영양 결핍'),
        ('environmental', '환경적 요인'),
        ('unknown', '알 수 없음'),
    ]
    
    analysis = models.ForeignKey(
        FishAnalysis,
        on_delete=models.CASCADE,
        related_name='diseases',
        verbose_name='분석 결과'
    )
    
    # 질병 정보
    disease_type = models.CharField(
        max_length=50,
        choices=DISEASE_TYPE_CHOICES,
        verbose_name='질병 유형'
    )
    confidence = models.FloatField(verbose_name='신뢰도')
    severity = models.FloatField(verbose_name='심각도')
    description = models.TextField(verbose_name='질병 설명')
    treatment_recommendation = models.TextField(blank=True, verbose_name='치료 권장사항')
    
    # affected_area는 별도 관계로 처리 (optional)
    affected_box = models.ForeignKey(
        DetectionBox,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='영향받은 영역'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='탐지 시간')
    
    class Meta:
        db_table = 'disease_detection'
        ordering = ['-confidence']
        verbose_name = '질병 탐지'
        verbose_name_plural = '질병 탐지들'
        
    def __str__(self):
        return f"{self.get_disease_type_display()} - {self.confidence:.2f}"
    
    @property
    def risk_level(self):
        """위험 수준 계산"""
        if self.severity >= 0.8:
            return 'high'
        elif self.severity >= 0.5:
            return 'medium'
        else:
            return 'low'


class AnalysisSession(models.Model):
    """분석 세션 모델 (배치 분석용)"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=200, verbose_name='세션 이름')
    description = models.TextField(blank=True, verbose_name='세션 설명')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성 시간')
    
    class Meta:
        db_table = 'analysis_session'
        ordering = ['-created_at']
        verbose_name = '분석 세션'
        verbose_name_plural = '분석 세션들'
        
    def __str__(self):
        return f"{self.name} ({self.analyses.count()}개 분석)"
    
    @property
    def total_analyses(self):
        """총 분석 개수"""
        return self.analyses.count()
    
    @property
    def healthy_percentage(self):
        """건강한 생선 비율"""
        total = self.total_analyses
        if total == 0:
            return 0
        healthy = self.analyses.filter(overall_health='healthy').count()
        return (healthy / total) * 100


# 분석 결과와 세션 연결
FishAnalysis.add_to_class('session', models.ForeignKey(
    AnalysisSession,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='analyses',
    verbose_name='분석 세션'
))