from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from django.db.models import Count
import json

from .models import FishAnalysis, DetectionBox, DiseaseDetection, AnalysisSession


@admin.register(FishAnalysis)
class FishAnalysisAdmin(admin.ModelAdmin):
    """생선 분석 결과 관리"""
    
    list_display = [
        'id_short', 'image_thumbnail', 'user', 'fish_species_display',
        'overall_health_display', 'fish_detected', 'disease_count_display',
        'quality_score_display', 'processing_time', 'created_at'
    ]
    list_filter = [
        'fish_species', 'overall_health', 'fish_detected',
        'created_at', 'user'
    ]
    search_fields = ['id', 'user__username', 'user__email']
    readonly_fields = [
        'id', 'image_preview', 'created_at', 'updated_at',
        'processing_time', 'quality_score', 'fish_detected',
        'species_confidence', 'health_confidence'
    ]
    fieldsets = (
        ('기본 정보', {
            'fields': ('id', 'user', 'session', 'image_preview', 'created_at', 'updated_at')
        }),
        ('분석 결과', {
            'fields': (
                'fish_detected', 'fish_species', 'species_confidence',
                'overall_health', 'health_confidence'
            )
        }),
        ('이미지 정보', {
            'fields': ('image_width', 'image_height', 'quality_score', 'processing_time'),
            'classes': ('collapse',)
        }),
        ('추가 정보', {
            'fields': ('recommendations', 'warning_messages'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'session').prefetch_related('diseases')
    
    def id_short(self, obj):
        """짧은 ID 표시"""
        return str(obj.id)[:8] + '...'
    id_short.short_description = 'ID'
    
    def image_thumbnail(self, obj):
        """썸네일 이미지"""
        if obj.image:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit: cover; border-radius: 4px;" />',
                obj.image.url
            )
        return '-'
    image_thumbnail.short_description = '이미지'
    
    def image_preview(self, obj):
        """상세 이미지 미리보기"""
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 8px;" />',
                obj.image.url
            )
        return '이미지 없음'
    image_preview.short_description = '이미지 미리보기'
    
    def disease_count_display(self, obj):
        """질병 개수 표시"""
        count = obj.diseases.count()
        if count > 0:
            color = 'red' if count > 2 else 'orange'
            return format_html(
                '<span style="color: {}; font-weight: bold;">{}</span>',
                color, count
            )
        return '0'
    disease_count_display.short_description = '질병 수'
    
    def quality_score_display(self, obj):
        """품질 점수 시각화"""
        score = obj.quality_score
        if score >= 0.8:
            color = 'green'
        elif score >= 0.5:
            color = 'orange'
        else:
            color = 'red'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.2f}</span>',
            color, score
        )
    quality_score_display.short_description = '품질 점수'
    
    def fish_species_display(self, obj):
        """생선 종류 표시"""
        return obj.get_fish_species_display()
    fish_species_display.short_description = '종류'
    
    def overall_health_display(self, obj):
        """건강 상태 표시"""
        health = obj.overall_health
        health_colors = {
            'healthy': 'green',
            'diseased': 'red',
            'suspicious': 'orange',
            'unknown': 'gray'
        }
        color = health_colors.get(health, 'gray')
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_overall_health_display()
        )
    overall_health_display.short_description = '건강 상태'


class DetectionBoxInline(admin.TabularInline):
    """탐지 박스 인라인"""
    model = DetectionBox
    extra = 0
    readonly_fields = ['width', 'height', 'area']
    fields = ['x1', 'y1', 'x2', 'y2', 'confidence', 'class_name', 'width', 'height', 'area']


class DiseaseDetectionInline(admin.TabularInline):
    """질병 탐지 인라인"""
    model = DiseaseDetection
    extra = 0
    readonly_fields = ['risk_level', 'created_at']
    fields = [
        'disease_type', 'confidence', 'severity', 'risk_level',
        'description', 'treatment_recommendation', 'affected_box', 'created_at'
    ]


# FishAnalysis에 인라인 추가
FishAnalysisAdmin.inlines = [DetectionBoxInline, DiseaseDetectionInline]


@admin.register(DetectionBox)
class DetectionBoxAdmin(admin.ModelAdmin):
    """탐지 박스 관리"""
    
    list_display = ['analysis_id_short', 'class_name', 'confidence', 'width', 'height', 'area']
    list_filter = ['class_name', 'confidence']
    search_fields = ['analysis__id', 'class_name']
    readonly_fields = ['width', 'height', 'area']
    
    def analysis_id_short(self, obj):
        return str(obj.analysis.id)[:8] + '...'
    analysis_id_short.short_description = '분석 ID'


@admin.register(DiseaseDetection)  
class DiseaseDetectionAdmin(admin.ModelAdmin):
    """질병 탐지 관리"""
    
    list_display = [
        'analysis_id_short', 'disease_type_display', 'confidence_display',
        'severity_display', 'risk_level_display', 'created_at'
    ]
    list_filter = ['disease_type', 'created_at']
    search_fields = ['analysis__id', 'description']
    readonly_fields = ['risk_level', 'created_at']
    
    def analysis_id_short(self, obj):
        return str(obj.analysis.id)[:8] + '...'
    analysis_id_short.short_description = '분석 ID'
    
    def disease_type_display(self, obj):
        return obj.get_disease_type_display()
    disease_type_display.short_description = '질병 유형'
    
    def confidence_display(self, obj):
        confidence = obj.confidence
        color = 'green' if confidence >= 0.8 else 'orange' if confidence >= 0.5 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.2f}</span>',
            color, confidence
        )
    confidence_display.short_description = '신뢰도'
    
    def severity_display(self, obj):
        severity = obj.severity
        color = 'red' if severity >= 0.8 else 'orange' if severity >= 0.5 else 'green'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.2f}</span>',
            color, severity
        )
    severity_display.short_description = '심각도'
    
    def risk_level_display(self, obj):
        risk = obj.risk_level
        risk_colors = {'high': 'red', 'medium': 'orange', 'low': 'green'}
        color = risk_colors.get(risk, 'gray')
        
        return format_html(
            '<span style="color: {}; font-weight: bold; text-transform: uppercase;">{}</span>',
            color, risk
        )
    risk_level_display.short_description = '위험 수준'


@admin.register(AnalysisSession)
class AnalysisSessionAdmin(admin.ModelAdmin):
    """분석 세션 관리"""
    
    list_display = [
        'id_short', 'name', 'user', 'total_analyses_display',
        'healthy_percentage_display', 'created_at'
    ]
    list_filter = ['created_at', 'user']
    search_fields = ['name', 'description', 'user__username']
    readonly_fields = ['id', 'created_at', 'total_analyses', 'healthy_percentage']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user').annotate(
            analysis_count=Count('analyses')
        )
    
    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    id_short.short_description = 'ID'
    
    def total_analyses_display(self, obj):
        count = obj.total_analyses
        color = 'green' if count > 10 else 'orange' if count > 5 else 'gray'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, count
        )
    total_analyses_display.short_description = '분석 수'
    
    def healthy_percentage_display(self, obj):
        percentage = obj.healthy_percentage
        color = 'green' if percentage >= 80 else 'orange' if percentage >= 50 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color, percentage
        )
    healthy_percentage_display.short_description = '건강도'


# Django Admin 사이트 커스터마이징
admin.site.site_header = "Team-PICK-O 관리자"
admin.site.site_title = "Team-PICK-O Admin"
admin.site.index_title = "생선 상태 분석 시스템 관리"

# 사용자 관리
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from accounts.models import UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = '프로필'

# User 모델 커스터마이징 (프로필 포함)
class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = UserAdmin.list_display + ('get_analysis_count', 'get_last_login')
    
    def get_analysis_count(self, obj):
        count = FishAnalysis.objects.filter(user=obj).count()
        return format_html('<span style="font-weight: bold;">{}</span>', count)
    get_analysis_count.short_description = '분석 횟수'
    
    def get_last_login(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M')
        return '-'
    get_last_login.short_description = '마지막 로그인'

# User admin은 core 앱에서 처리