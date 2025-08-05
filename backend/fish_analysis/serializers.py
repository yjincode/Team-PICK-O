from rest_framework import serializers
from django.contrib.auth.models import User
from .models import FishAnalysis, DetectionBox, DiseaseDetection, AnalysisSession
import base64
from django.core.files.base import ContentFile


class DetectionBoxSerializer(serializers.ModelSerializer):
    """탐지 박스 시리얼라이저"""
    
    width = serializers.ReadOnlyField()
    height = serializers.ReadOnlyField()
    area = serializers.ReadOnlyField()
    
    class Meta:
        model = DetectionBox
        fields = [
            'id', 'x1', 'y1', 'x2', 'y2', 
            'confidence', 'class_name',
            'width', 'height', 'area'
        ]


class DiseaseDetectionSerializer(serializers.ModelSerializer):
    """질병 탐지 시리얼라이저"""
    
    disease_type_display = serializers.CharField(source='get_disease_type_display', read_only=True)
    risk_level = serializers.ReadOnlyField()
    affected_box = DetectionBoxSerializer(read_only=True)
    
    class Meta:
        model = DiseaseDetection
        fields = [
            'id', 'disease_type', 'disease_type_display',
            'confidence', 'severity', 'description', 
            'treatment_recommendation', 'affected_box',
            'risk_level', 'created_at'
        ]


class FishAnalysisSerializer(serializers.ModelSerializer):
    """생선 분석 결과 시리얼라이저"""
    
    # 관련 모델들
    detection_boxes = DetectionBoxSerializer(many=True, read_only=True)
    diseases = DiseaseDetectionSerializer(many=True, read_only=True)
    
    # 읽기 전용 필드들
    fish_species_display = serializers.CharField(source='get_fish_species_display', read_only=True)
    overall_health_display = serializers.CharField(source='get_overall_health_display', read_only=True)
    has_diseases = serializers.ReadOnlyField()
    disease_count = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()
    
    # 사용자 정보
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = FishAnalysis
        fields = [
            'id', 'user', 'user_username', 'image', 'image_url',
            'created_at', 'updated_at',
            # 탐지 결과
            'fish_detected', 'fish_species', 'fish_species_display', 'species_confidence',
            # 건강 상태  
            'overall_health', 'overall_health_display', 'health_confidence',
            # 이미지 정보
            'image_width', 'image_height', 'quality_score',
            # 처리 정보
            'processing_time',
            # 추가 정보
            'recommendations', 'warning_messages',
            # 관련 데이터
            'detection_boxes', 'diseases', 'has_diseases', 'disease_count'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'user',
            'fish_detected', 'species_confidence', 'health_confidence',
            'image_width', 'image_height', 'quality_score', 'processing_time',
            'recommendations', 'warning_messages'
        ]
    
    def get_image_url(self, obj):
        """이미지 URL 반환"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class AnalysisRequestSerializer(serializers.Serializer):
    """분석 요청 시리얼라이저"""
    
    image = serializers.ImageField(
        help_text="분석할 생선 이미지 파일 (JPEG, PNG, BMP, TIFF 지원)"
    )
    analyze_species = serializers.BooleanField(
        default=True,
        help_text="생선 종류 분석 여부"
    )
    analyze_health = serializers.BooleanField(
        default=True,
        help_text="건강 상태 분석 여부"
    )
    analyze_diseases = serializers.BooleanField(
        default=True,
        help_text="질병 분석 여부"
    )
    confidence_threshold = serializers.FloatField(
        default=0.5,
        min_value=0.0,
        max_value=1.0,
        help_text="탐지 신뢰도 임계값 (0.0 ~ 1.0)"
    )
    session_name = serializers.CharField(
        required=False,
        max_length=200,
        help_text="분석 세션 이름 (배치 분석용)"
    )
    
    def validate_image(self, value):
        """이미지 파일 유효성 검사"""
        # 파일 크기 검사 (10MB)
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"파일 크기가 너무 큽니다. 최대 크기: {max_size // (1024*1024)}MB"
            )
        
        # 파일 형식 검사
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"지원되지 않는 파일 형식입니다. 지원 형식: {', '.join(allowed_types)}"
            )
        
        return value


class AnalysisResponseSerializer(serializers.Serializer):
    """분석 응답 시리얼라이저"""
    
    success = serializers.BooleanField(help_text="분석 성공 여부")
    message = serializers.CharField(help_text="응답 메시지")
    result = FishAnalysisSerializer(required=False, help_text="분석 결과")
    error_code = serializers.CharField(required=False, help_text="에러 코드")


class BatchAnalysisRequestSerializer(serializers.Serializer):
    """배치 분석 요청 시리얼라이저"""
    
    images = serializers.ListField(
        child=serializers.ImageField(),
        max_length=10,
        help_text="분석할 이미지 파일들 (최대 10개)"
    )
    analyze_species = serializers.BooleanField(default=True)
    analyze_health = serializers.BooleanField(default=True)
    analyze_diseases = serializers.BooleanField(default=True)
    confidence_threshold = serializers.FloatField(default=0.5, min_value=0.0, max_value=1.0)
    session_name = serializers.CharField(
        required=False,
        max_length=200,
        help_text="배치 분석 세션 이름"
    )
    
    def validate_images(self, value):
        """이미지 리스트 유효성 검사"""
        if len(value) > 10:
            raise serializers.ValidationError("한 번에 최대 10개의 파일만 처리할 수 있습니다.")
        
        for image in value:
            # 각 이미지에 대해 동일한 검사 수행
            max_size = 10 * 1024 * 1024
            if image.size > max_size:
                raise serializers.ValidationError(
                    f"파일 '{image.name}' 크기가 너무 큽니다."
                )
        
        return value


class HealthSummarySerializer(serializers.Serializer):
    """건강 상태 요약 시리얼라이저"""
    
    total_fish_count = serializers.IntegerField(help_text="총 생선 개수")
    healthy_count = serializers.IntegerField(help_text="건강한 생선 개수")
    diseased_count = serializers.IntegerField(help_text="질병이 있는 생선 개수")
    suspicious_count = serializers.IntegerField(help_text="의심스러운 생선 개수")
    unknown_count = serializers.IntegerField(help_text="알 수 없는 생선 개수")
    health_percentage = serializers.FloatField(help_text="건강도 백분율")
    most_common_disease = serializers.CharField(help_text="가장 흔한 질병", allow_null=True)
    risk_level = serializers.CharField(help_text="위험 수준 (low/medium/high)")
    average_confidence = serializers.FloatField(help_text="평균 신뢰도")
    processing_time_avg = serializers.FloatField(help_text="평균 처리 시간")


class AnalysisSessionSerializer(serializers.ModelSerializer):
    """분석 세션 시리얼라이저"""
    
    total_analyses = serializers.ReadOnlyField()
    healthy_percentage = serializers.ReadOnlyField()
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AnalysisSession
        fields = [
            'id', 'user', 'user_username', 'name', 'description',
            'created_at', 'total_analyses', 'healthy_percentage'
        ]
        read_only_fields = ['id', 'created_at', 'user']


class AnalysisSessionDetailSerializer(AnalysisSessionSerializer):
    """분석 세션 상세 시리얼라이저"""
    
    analyses = FishAnalysisSerializer(many=True, read_only=True)
    
    class Meta(AnalysisSessionSerializer.Meta):
        fields = AnalysisSessionSerializer.Meta.fields + ['analyses']


class ModelStatusSerializer(serializers.Serializer):
    """AI 모델 상태 시리얼라이저"""
    
    model_loaded = serializers.BooleanField(help_text="모델 로드 상태")
    available_models = serializers.DictField(help_text="사용 가능한 모델들")
    status = serializers.CharField(help_text="전체 상태")
    last_updated = serializers.DateTimeField(required=False, help_text="마지막 업데이트 시간")


class SupportedFormatsSerializer(serializers.Serializer):
    """지원 형식 시리얼라이저"""
    
    supported_formats = serializers.ListField(
        child=serializers.CharField(),
        help_text="지원되는 파일 형식들"
    )
    max_file_size_mb = serializers.IntegerField(help_text="최대 파일 크기 (MB)")
    max_batch_files = serializers.IntegerField(help_text="배치 처리 최대 파일 개수")


# Base64 이미지 처리용 시리얼라이저 (모바일 앱용)
class Base64ImageField(serializers.ImageField):
    """Base64 인코딩된 이미지를 처리하는 필드"""
    
    def to_internal_value(self, data):
        # Base64 문자열인 경우 처리
        if isinstance(data, str) and data.startswith('data:image'):
            # data:image/jpeg;base64,... 형식에서 실제 데이터 추출
            format, imgstr = data.split(';base64,')
            ext = format.split('/')[-1]
            
            # Base64 디코딩
            data = ContentFile(base64.b64decode(imgstr), name=f'image.{ext}')
        
        return super().to_internal_value(data)


class MobileAnalysisRequestSerializer(AnalysisRequestSerializer):
    """모바일 앱용 분석 요청 시리얼라이저"""
    
    image = Base64ImageField(help_text="Base64 인코딩된 이미지 또는 파일")
    device_info = serializers.JSONField(
        required=False,
        help_text="디바이스 정보 (OS, 버전 등)"
    )
    location = serializers.JSONField(
        required=False,
        help_text="촬영 위치 정보 (GPS 좌표)"
    )