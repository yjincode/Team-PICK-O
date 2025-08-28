import json
import os
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from core.middleware import get_user_queryset_filter
from .models import FishAnalysis, DiseaseDetection, DiseaseClass
from business.models import User
import logging

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class FishAnalysisView(View):
    """어류 질병 분석 API - Django View 기반 JWT 미들웨어 인증"""
    
    def post(self, request):
        """이미지 분석 요청 - 데이터베이스 저장 없이 즉시 결과 반환"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 업로드된 이미지 파일 확인
            if 'image' not in request.FILES:
                return JsonResponse({'error': '이미지 파일이 필요합니다.'}, status=400)
            
            image_file = request.FILES['image']
            
            # 파일 확장자 검증
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
            file_extension = os.path.splitext(image_file.name)[1].lower()
            if file_extension not in allowed_extensions:
                return JsonResponse({
                    'error': f'지원되지 않는 파일 형식입니다. 허용 형식: {", ".join(allowed_extensions)}'
                }, status=400)
            
            # 파일 크기 검증 (10MB 제한)
            if image_file.size > 10 * 1024 * 1024:
                return JsonResponse({'error': '파일 크기는 10MB를 초과할 수 없습니다.'}, status=400)
            
            logger.info(f"새로운 분석 시작 - 파일: {image_file.name} - 사용자: {request.user_id}")
            
            # 임시 파일로 저장하여 AI 서버에 전송
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=f'_{image_file.name}', delete=False) as temp_file:
                for chunk in image_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            try:
                # AI 서버를 통한 즉시 분석
                from .services.ai_client import ai_client
                result = ai_client.analyze_image_sync(temp_file_path)
                
                # 디버깅을 위한 AI 서버 응답 로깅
                logger.info(f"AI 서버 원본 응답: {result}")
                
                if result['success']:
                    # AI 서버 통합 응답을 프론트엔드 기대 구조로 변환
                    response_data = {
                        'success': True,
                        'message': result.get('message', '이미지 분석이 완료되었습니다.'),
                        'overall_health_status': result.get('overall_health_status'),
                        'total_detections': result.get('total_detections', 0),
                        'yolo_confidence_avg': result.get('yolo_confidence_avg', 0.0),
                        'detections': [],
                        'model_info': result.get('model_info'),
                        'image_info': result.get('image_info')
                    }
                    
                    # AI 서버의 새로운 건강도 평가 데이터 추가
                    if result.get('health_evaluation'):
                        response_data['health_evaluation'] = result['health_evaluation']
                    if result.get('health_grade_info'):
                        response_data['health_grade_info'] = result['health_grade_info']
                    
                    # detections 배열을 프론트엔드가 기대하는 구조로 변환
                    ai_detections = result.get('detections', [])
                    health_evaluation = result.get('health_evaluation', {})
                    health_grade_info = result.get('health_grade_info', {})
                    image_info = result.get('image_info', {})
                    
                    # 이미지 크기 정보 추출
                    img_width = image_info.get('width', 1)
                    img_height = image_info.get('height', 1)
                    
                    logger.info(f"AI 서버 detections 원본: {ai_detections}")
                    logger.info(f"이미지 크기: {img_width}x{img_height}")
                    
                    for i, detection in enumerate(ai_detections):
                        logger.info(f"Detection {i}: {detection}")
                        
                        # AI 서버는 bbox를 중첩 객체로 반환하고 이미 정규화된 좌표임
                        bbox = detection.get('bbox', {})
                        
                        converted_detection = {
                            'bbox_x': bbox.get('x', 0) if isinstance(bbox, dict) else 0,
                            'bbox_y': bbox.get('y', 0) if isinstance(bbox, dict) else 0,
                            'bbox_width': bbox.get('width', 0) if isinstance(bbox, dict) else 0,
                            'bbox_height': bbox.get('height', 0) if isinstance(bbox, dict) else 0,
                            'confidence': detection.get('yolo_confidence', 0),
                            'class_name': detection.get('class_name', ''),
                            'disease': detection.get('disease')  # VGG 분류 결과
                        }
                        
                        # 디버깅을 위한 로깅
                        logger.info(f"AI 서버 bbox (이미 정규화됨): x={converted_detection['bbox_x']:.4f}, y={converted_detection['bbox_y']:.4f}, w={converted_detection['bbox_width']:.4f}, h={converted_detection['bbox_height']:.4f}")
                        logger.info(f"confidence: {converted_detection['confidence']}")
                        
                        response_data['detections'].append(converted_detection)
                    
                    return JsonResponse(response_data, status=200)
                else:
                    # AI 서버 오류 처리 - 명확한 실패 메시지 반환
                    error_type = result.get('error_type', 'analysis_error')
                    error_message = result.get('error', '분석 중 오류가 발생했습니다.')
                    
                    # 에러 타입별 사용자 친화적 메시지 설정
                    if error_type == 'fish_validation_failed' or '어류가 아닙니다' in error_message or 'is_fish' in error_message:
                        user_message = '업로드하신 이미지는 어류가 아닙니다. 광어 사진을 업로드해 주세요.'
                    elif error_type == 'multiple_fish_detected' or '여러 마리' in error_message:
                        user_message = '한 마리의 광어가 선명하게 나온 사진을 업로드해 주세요. 여러 마리가 함께 있는 사진은 정확한 분석이 어렵습니다.'
                    elif error_type == 'connection_error':
                        user_message = 'AI 분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
                    elif error_type == 'timeout':
                        user_message = 'AI 분석 처리 시간이 초과되었습니다. 이미지 크기를 줄이거나 잠시 후 다시 시도해주세요.'
                    elif error_type == 'compatibility_error':
                        user_message = 'AI 모델 호환성 문제가 발생했습니다. 관리자에게 문의해주세요.'
                    elif 'EfficientNet' in error_message or 'efficientnet' in error_message.lower() or error_type == 'efficientnet_model_unavailable' or error_type == 'efficientnet_classification_failed':
                        user_message = '어종 질병 분류 모델을 사용할 수 없습니다. 학습된 모델이 로드되지 않았거나 손상되었을 수 있습니다.'
                    elif 'YOLO' in error_message or 'yolo' in error_message.lower():
                        user_message = '증상 탐지 모델에 문제가 발생했습니다. 현재 분석을 수행할 수 없습니다.'
                    else:
                        user_message = '어류 질병 분석에 실패했습니다. 잠시 후 다시 시도해주세요.'
                    
                    error_response = {
                        'success': False,
                        'message': user_message,
                        'error': error_message,
                        'error_type': error_type,
                        'analysis_status': 'failed',
                        'timestamp': timezone.now().isoformat()
                    }
                    
                    # 호환성 문제인 경우 해결 방안 포함
                    if 'solution' in result:
                        error_response['solution'] = result['solution']
                    
                    # 기술적 상세 정보 (디버깅용)
                    if hasattr(request, 'user_id') and str(request.user_id) in ['1', 'admin']:  # 관리자용
                        error_response['technical_details'] = {
                            'ai_server_response': result,
                            'debug_info': 'AI 서버 응답 실패'
                        }
                    
                    return JsonResponse(error_response, status=503)  # 서비스 일시 불가
                    
            finally:
                # 임시 파일 정리
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
            
        except Exception as e:
            logger.error(f"분석 요청 처리 중 오류: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': '분석 요청 처리 중 오류가 발생했습니다.',
                'error_detail': str(e)
            }, status=500)
    
    def get(self, request):
        """사용자의 분석 목록 조회"""
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 페이징 파라미터
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            offset = (page - 1) * page_size
            
            # 사용자별 분석 목록 조회
            queryset = FishAnalysis.objects.filter(**get_user_queryset_filter(request))
            total_count = queryset.count()
            analyses = queryset[offset:offset + page_size]
            
            # 직렬화
            data = []
            for analysis in analyses:
                data.append({
                    'id': analysis.id,
                    'status': analysis.status,
                    'overall_health_status': analysis.overall_health_status,
                    'total_detections': analysis.total_detections,
                    'yolo_confidence_avg': analysis.yolo_confidence_avg,
                    'original_image_url': analysis.original_image.url if analysis.original_image else None,
                    'processed_image_url': analysis.processed_image.url if analysis.processed_image else None,
                    'created_at': analysis.created_at.isoformat(),
                    'completed_at': analysis.completed_at.isoformat() if analysis.completed_at else None
                })
            
            return JsonResponse({
                'results': data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'has_next': offset + page_size < total_count
            })
            
        except Exception as e:
            logger.error(f"분석 목록 조회 중 오류: {str(e)}")
            return JsonResponse({'error': '분석 목록을 불러오는데 실패했습니다.'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class FishAnalysisDetailView(View):
    """특정 분석 결과 상세 조회"""
    
    def get(self, request, analysis_id):
        """분석 결과 상세 조회"""
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 사용자 소유 분석만 조회 가능
            analysis = FishAnalysis.objects.select_related('user').prefetch_related(
                'detections'
            ).get(
                id=analysis_id,
                **get_user_queryset_filter(request)
            )
            
            # 탐지 결과들
            detections_data = []
            for detection in analysis.detections.all():
                detections_data.append({
                    'id': detection.id,
                    'bbox_x': detection.bbox_x,
                    'bbox_y': detection.bbox_y,
                    'bbox_width': detection.bbox_width,
                    'bbox_height': detection.bbox_height,
                    'yolo_confidence': detection.yolo_confidence,
                    'disease_class': detection.disease_class,
                    'disease_name_ko': detection.disease_name_ko,
                    'vgg_confidence': detection.vgg_confidence,
                    'severity': detection.severity,
                    'description': detection.description,
                    'treatment_recommendation': detection.treatment_recommendation,
                    'cropped_image_url': detection.cropped_image.url if detection.cropped_image else None,
                    'created_at': detection.created_at.isoformat()
                })
            
            # 상세 정보
            data = {
                'id': analysis.id,
                'status': analysis.status,
                'overall_health_status': analysis.overall_health_status,
                'total_detections': analysis.total_detections,
                'yolo_confidence_avg': analysis.yolo_confidence_avg,
                'original_image_url': analysis.original_image.url if analysis.original_image else None,
                'processed_image_url': analysis.processed_image.url if analysis.processed_image else None,
                'detections': detections_data,
                'created_at': analysis.created_at.isoformat(),
                'completed_at': analysis.completed_at.isoformat() if analysis.completed_at else None
            }
            
            return JsonResponse(data)
            
        except FishAnalysis.DoesNotExist:
            return JsonResponse({'error': '분석 결과를 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            logger.error(f"분석 상세 조회 중 오류: {str(e)}")
            return JsonResponse({'error': '분석 결과를 불러오는데 실패했습니다.'}, status=500)
    
    def delete(self, request, analysis_id):
        """분석 결과 삭제"""
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 사용자 소유 분석만 삭제 가능
            analysis = FishAnalysis.objects.get(
                id=analysis_id,
                **get_user_queryset_filter(request)
            )
            
            # 관련 파일들 삭제
            if analysis.original_image:
                analysis.original_image.delete()
            if analysis.processed_image:
                analysis.processed_image.delete()
                
            # 크롭된 이미지들도 삭제
            for detection in analysis.detections.all():
                if detection.cropped_image:
                    detection.cropped_image.delete()
            
            analysis_id_copy = analysis.id
            analysis.delete()
            
            logger.info(f"분석 결과 삭제 완료: {analysis_id_copy}")
            
            return JsonResponse({'message': '분석 결과가 삭제되었습니다.'})
            
        except FishAnalysis.DoesNotExist:
            return JsonResponse({'error': '분석 결과를 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            logger.error(f"분석 결과 삭제 중 오류: {str(e)}")
            return JsonResponse({'error': '분석 결과 삭제에 실패했습니다.'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class EfficientNetClassificationView(View):
    """EfficientNet 질병 분류 API - 전체 이미지 처리"""
    
    def post(self, request):
        """EfficientNet을 사용한 전체 이미지 질병 분류"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 업로드된 이미지 파일 확인
            if 'image' not in request.FILES:
                return JsonResponse({'error': '이미지 파일이 필요합니다.'}, status=400)
            
            image_file = request.FILES['image']
            
            logger.info(f"EfficientNet 전체 이미지 분류 요청 - 파일: {image_file.name}")
            
            # 임시 파일로 저장
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(image_file.name)[1]) as temp_file:
                for chunk in image_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            try:
                # AI 서버 EfficientNet 분류 전용 엔드포인트 호출
                from .services.ai_client import ai_client
                result = ai_client.classify_full_image_sync(temp_file_path)
            finally:
                # 임시 파일 정리
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            
            if result['success']:
                # AI 서버 응답을 그대로 전달 (불필요한 변환 제거)
                return JsonResponse(result, status=200)
            else:
                # EfficientNet 전체 이미지 분류 실패 처리
                error_type = result.get('error_type', 'classification_error')
                error_message = result.get('error', 'EfficientNet 전체 이미지 분류 중 오류가 발생했습니다.')
                
                # 에러 타입별 사용자 친화적 메시지
                if error_type == 'connection_error':
                    user_message = 'AI 분석 서버에 연결할 수 없습니다.'
                elif error_type == 'timeout':
                    user_message = 'EfficientNet 질병 분류 처리 시간이 초과되었습니다.'
                elif 'EfficientNet' in error_message or 'model' in error_message.lower():
                    user_message = '질병 분류 모델을 사용할 수 없습니다. 현재 분석을 수행할 수 없습니다.'
                else:
                    user_message = '질병 분류에 실패했습니다. 현재 이 기능을 사용할 수 없습니다.'
                
                return JsonResponse({
                    'success': False,
                    'message': user_message,
                    'error': error_message,
                    'error_type': error_type,
                    'analysis_status': 'classification_failed'
                }, status=503)
            
        except Exception as e:
            logger.error(f"EfficientNet 전체 이미지 분류 요청 처리 중 오류: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': 'EfficientNet 전체 이미지 분류 요청 처리 중 오류가 발생했습니다.',
                'error_detail': str(e)
            }, status=500)
