from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Avg, Q
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
import logging
from collections import Counter
from datetime import datetime, timedelta

from .models import FishAnalysis, DiseaseDetection, AnalysisSession
from .serializers import (
    FishAnalysisSerializer,
    AnalysisRequestSerializer,
    AnalysisResponseSerializer,
    BatchAnalysisRequestSerializer,
    HealthSummarySerializer,
    AnalysisSessionSerializer,
    AnalysisSessionDetailSerializer,
    ModelStatusSerializer,
    SupportedFormatsSerializer,
    MobileAnalysisRequestSerializer
)
from .analyzer import django_fish_analyzer

logger = logging.getLogger(__name__)

# 지원되는 이미지 형식
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/bmp", "image/tiff"
}

# 최대 파일 크기 (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


class StandardResultsSetPagination(PageNumberPagination):
    """표준 페이지네이션"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema(
    summary="생선 상태 분석",
    description="업로드된 생선 이미지를 분석하여 종류, 건강 상태, 질병을 판단합니다.",
    request=AnalysisRequestSerializer,
    responses={
        201: FishAnalysisSerializer,
        400: "잘못된 요청",
        500: "서버 오류"
    },
    tags=["생선 분석"]
)
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def analyze_fish_image(request):
    """단일 생선 이미지 분석 API"""
    
    try:
        # 요청 데이터 검증
        serializer = AnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "요청 데이터가 유효하지 않습니다.", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        image_file = validated_data['image']
        
        logger.info(f"🔍 이미지 분석 시작 - 파일명: {image_file.name}, 크기: {image_file.size} bytes")
        
        # 세션 처리
        session = None
        session_name = validated_data.get('session_name')
        if session_name and request.user.is_authenticated:
            session, created = AnalysisSession.objects.get_or_create(
                user=request.user,
                name=session_name,
                defaults={'description': f'세션 생성: {datetime.now()}'}
            )
        
        # 이미지 바이트 읽기
        image_bytes = image_file.read()
        
        # AI 분석 수행
        analysis_result = django_fish_analyzer.analyze_image_sync(
            image_bytes=image_bytes,
            user=request.user if request.user.is_authenticated else None,
            analyze_species=validated_data['analyze_species'],
            analyze_health=validated_data['analyze_health'],
            analyze_diseases=validated_data['analyze_diseases'],
            confidence_threshold=validated_data['confidence_threshold'],
            session=session
        )
        
        # 응답 데이터 직렬화
        response_serializer = FishAnalysisSerializer(
            analysis_result, 
            context={'request': request}
        )
        
        logger.info(f"✅ 분석 완료 - ID: {analysis_result.id}")
        
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        logger.error(f"❌ 이미지 분석 실패: {str(e)}")
        return Response(
            {"error": f"분석 중 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="배치 이미지 분석",
    description="여러 이미지를 한 번에 분석합니다.",
    request=BatchAnalysisRequestSerializer,
    responses={
        201: FishAnalysisSerializer(many=True),
        400: "잘못된 요청"
    },
    tags=["생선 분석"]
)
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def batch_analyze_fish_images(request):
    """배치 이미지 분석 API"""
    
    try:
        # FormData에서 여러 파일 처리
        images = request.FILES.getlist('images')
        
        if len(images) > 10:
            return Response(
                {"error": "한 번에 최대 10개의 파일만 처리할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기타 파라미터 추출
        analyze_species = request.data.get('analyze_species', 'true').lower() == 'true'
        analyze_health = request.data.get('analyze_health', 'true').lower() == 'true'
        analyze_diseases = request.data.get('analyze_diseases', 'true').lower() == 'true'
        confidence_threshold = float(request.data.get('confidence_threshold', 0.5))
        session_name = request.data.get('session_name', f'배치분석_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        
        # 세션 생성
        session = None
        if request.user.is_authenticated:
            session = AnalysisSession.objects.create(
                user=request.user,
                name=session_name,
                description=f'배치 분석 - {len(images)}개 이미지'
            )
        
        results = []
        
        for i, image_file in enumerate(images):
            try:
                logger.info(f"🔍 배치 분석 [{i+1}/{len(images)}] - 파일명: {image_file.name}")
                
                # 파일 유효성 검사
                if image_file.content_type not in SUPPORTED_IMAGE_TYPES:
                    continue
                    
                if image_file.size > MAX_FILE_SIZE:
                    continue
                
                # 이미지 분석
                image_bytes = image_file.read()
                analysis_result = django_fish_analyzer.analyze_image_sync(
                    image_bytes=image_bytes,
                    user=request.user if request.user.is_authenticated else None,
                    analyze_species=analyze_species,
                    analyze_health=analyze_health,
                    analyze_diseases=analyze_diseases,
                    confidence_threshold=confidence_threshold,
                    session=session
                )
                
                results.append(analysis_result)
                
            except Exception as e:
                logger.error(f"❌ 파일 {image_file.name} 분석 실패: {str(e)}")
                continue
        
        # 결과 직렬화
        response_serializer = FishAnalysisSerializer(
            results, 
            many=True, 
            context={'request': request}
        )
        
        logger.info(f"✅ 배치 분석 완료 - {len(results)}개 처리")
        
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        logger.error(f"❌ 배치 분석 실패: {str(e)}")
        return Response(
            {"error": f"배치 분석 중 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="건강 상태 요약",
    description="분석 결과들의 전체 건강 상태를 요약합니다.",
    parameters=[
        OpenApiParameter("days", OpenApiTypes.INT, description="최근 N일 데이터 (기본: 30일)"),
        OpenApiParameter("user_id", OpenApiTypes.INT, description="특정 사용자 데이터만 조회"),
        OpenApiParameter("session_id", OpenApiTypes.UUID, description="특정 세션 데이터만 조회"),
    ],
    responses={200: HealthSummarySerializer},
    tags=["생선 분석"]
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def get_health_summary(request):
    """건강 상태 요약 API"""
    
    try:
        # 쿼리 파라미터 처리
        days = int(request.GET.get('days', 30))
        user_id = request.GET.get('user_id')
        session_id = request.GET.get('session_id')
        
        # 날짜 필터
        date_from = datetime.now() - timedelta(days=days)
        queryset = FishAnalysis.objects.filter(created_at__gte=date_from)
        
        # 사용자 필터
        if user_id and request.user.is_authenticated:
            if request.user.is_staff or str(request.user.id) == user_id:
                queryset = queryset.filter(user_id=user_id)
        
        # 세션 필터
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        # 권한 확인 (본인 데이터만 조회)
        if not request.user.is_staff and request.user.is_authenticated:
            queryset = queryset.filter(user=request.user)
        
        # 통계 계산
        total_count = queryset.count()
        
        if total_count == 0:
            return Response({
                "total_fish_count": 0,
                "healthy_count": 0,
                "diseased_count": 0,
                "suspicious_count": 0,
                "unknown_count": 0,
                "health_percentage": 0,
                "most_common_disease": None,
                "risk_level": "low",
                "average_confidence": 0,
                "processing_time_avg": 0
            })
        
        # 건강 상태별 개수
        health_stats = queryset.values('overall_health').annotate(count=Count('id'))
        health_counts = {item['overall_health']: item['count'] for item in health_stats}
        
        healthy_count = health_counts.get('healthy', 0)
        diseased_count = health_counts.get('diseased', 0)
        suspicious_count = health_counts.get('suspicious', 0)
        unknown_count = health_counts.get('unknown', 0)
        
        health_percentage = (healthy_count / total_count) * 100
        
        # 가장 흔한 질병 찾기
        most_common_disease = None
        disease_stats = DiseaseDetection.objects.filter(
            analysis__in=queryset
        ).values('disease_type').annotate(count=Count('id')).order_by('-count')
        
        if disease_stats:
            most_common_disease = disease_stats[0]['disease_type']
        
        # 위험 수준 결정
        if health_percentage >= 80:
            risk_level = "low"
        elif health_percentage >= 50:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        # 평균값 계산
        averages = queryset.aggregate(
            avg_confidence=Avg('health_confidence'),
            avg_processing_time=Avg('processing_time')
        )
        
        summary_data = {
            "total_fish_count": total_count,
            "healthy_count": healthy_count,
            "diseased_count": diseased_count,
            "suspicious_count": suspicious_count,
            "unknown_count": unknown_count,
            "health_percentage": round(health_percentage, 2),
            "most_common_disease": most_common_disease,
            "risk_level": risk_level,
            "average_confidence": round(averages['avg_confidence'] or 0, 3),
            "processing_time_avg": round(averages['avg_processing_time'] or 0, 3)
        }
        
        return Response(summary_data)
        
    except Exception as e:
        logger.error(f"❌ 건강 상태 요약 생성 실패: {str(e)}")
        return Response(
            {"error": f"요약 생성 중 오류가 발생했습니다: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="지원되는 파일 형식 조회",
    description="지원되는 이미지 파일 형식과 제한사항을 반환합니다.",
    responses={200: SupportedFormatsSerializer},
    tags=["시스템 정보"]
)
@api_view(['GET'])
def get_supported_formats(request):
    """지원되는 파일 형식 조회 API"""
    return Response({
        "supported_formats": list(SUPPORTED_IMAGE_TYPES),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "max_batch_files": 10
    })


@extend_schema(
    summary="AI 모델 상태 확인",
    description="AI 모델 로드 상태를 확인합니다.",
    responses={200: ModelStatusSerializer},
    tags=["시스템 정보"]
)
@api_view(['GET'])
@method_decorator(cache_page(60), name='dispatch')  # 1분 캐시
def get_model_status(request):
    """AI 모델 상태 확인 API"""
    model_status = django_fish_analyzer.get_model_status()
    return Response(model_status)


@extend_schema(
    summary="AI 모델 초기화",
    description="AI 모델을 수동으로 초기화합니다.",
    responses={200: "초기화 성공", 500: "초기화 실패"},
    tags=["시스템 관리"]
)
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def initialize_models(request):
    """AI 모델 초기화 API (관리자 전용)"""
    try:
        django_fish_analyzer.initialize_models()
        return Response({
            "success": True,
            "message": "모델 초기화가 완료되었습니다.",
            "model_loaded": django_fish_analyzer.model_loaded
        })
    except Exception as e:
        logger.error(f"❌ 모델 초기화 실패: {str(e)}")
        return Response(
            {"success": False, "error": f"모델 초기화 실패: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class AnalysisHistoryListView(ListAPIView):
    """분석 기록 조회 (페이지네이션 지원)"""
    
    serializer_class = FishAnalysisSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = FishAnalysis.objects.select_related('user', 'session').prefetch_related(
            'detection_boxes', 'diseases'
        )
        
        # 본인 데이터만 조회 (관리자는 모든 데이터)
        if not self.request.user.is_staff and self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
        
        # 필터링
        species = self.request.GET.get('species')
        if species:
            queryset = queryset.filter(fish_species=species)
        
        health = self.request.GET.get('health')
        if health:
            queryset = queryset.filter(overall_health=health)
        
        days = self.request.GET.get('days')
        if days:
            date_from = datetime.now() - timedelta(days=int(days))
            queryset = queryset.filter(created_at__gte=date_from)
        
        return queryset.order_by('-created_at')


class AnalysisDetailView(RetrieveAPIView):
    """분석 결과 상세 조회"""
    
    serializer_class = FishAnalysisSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'id'
    
    def get_queryset(self):
        queryset = FishAnalysis.objects.select_related('user', 'session').prefetch_related(
            'detection_boxes', 'diseases'
        )
        
        # 본인 데이터만 조회 (관리자는 모든 데이터)
        if not self.request.user.is_staff and self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
        
        return queryset


class AnalysisSessionListView(ListAPIView):
    """분석 세션 목록 조회"""
    
    serializer_class = AnalysisSessionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnalysisSession.objects.filter(
            user=self.request.user
        ).order_by('-created_at')


class AnalysisSessionDetailView(RetrieveAPIView):
    """분석 세션 상세 조회"""
    
    serializer_class = AnalysisSessionDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        return AnalysisSession.objects.filter(
            user=self.request.user
        ).prefetch_related('analyses__detection_boxes', 'analyses__diseases')


# 모바일 앱 전용 API
@extend_schema(
    summary="모바일 앱용 생선 분석",
    description="모바일 앱에서 Base64 이미지나 파일을 분석합니다.",
    request=MobileAnalysisRequestSerializer,
    responses={201: FishAnalysisSerializer},
    tags=["모바일 API"]
)
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def mobile_analyze_fish_image(request):
    """모바일 앱용 생선 이미지 분석 API"""
    
    # 기본 분석 로직과 동일하지만 추가 메타데이터 처리
    return analyze_fish_image(request)