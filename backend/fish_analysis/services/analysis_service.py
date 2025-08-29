"""
통합 어류 질병 분석 서비스 - AI 서버 연동
AI 서버(FastAPI)를 호출하여 YOLO11 + VGG16 분석 수행
"""
import os
import logging
from django.conf import settings
from django.utils import timezone
from typing import Dict, Any, List

from ..models import FishAnalysis, DiseaseDetection, DiseaseClass
from .ai_client import ai_client

logger = logging.getLogger(__name__)


class FishDiseaseAnalysisService:
    """어류 질병 분석 통합 서비스 - AI 서버 연동"""
    
    def __init__(self):
        pass  # AI 서버 클라이언트 사용
    
    def process_fish_analysis_sync(self, analysis_id: int) -> Dict[str, Any]:
        """
        AI 서버를 통한 어류 질병 분석 수행
        
        Args:
            analysis_id: FishAnalysis 모델 ID
            
        Returns:
            분석 결과 딕셔너리
        """
        try:
            logger.info(f"어류 질병 분석 시작 (AI 서버): {analysis_id}")
            
            # FishAnalysis 객체 가져오기
            analysis = FishAnalysis.objects.get(id=analysis_id)
            analysis.status = 'processing'
            analysis.save()
            
            # 원본 이미지 경로
            original_image_path = analysis.original_image.path
            
            # AI 서버를 통한 분석 수행
            logger.info("AI 서버로 분석 요청 전송")
            ai_result = ai_client.analyze_image_sync(original_image_path)
            
            # AI 서버 응답 확인
            if not ai_result['success']:
                analysis.status = 'failed'
                analysis.save()
                
                error_msg = ai_result['error']
                error_type = ai_result.get('error_type', 'unknown')
                
                logger.error(f"AI 서버 분석 실패: {error_msg}")
                
                # 호환성 문제인 경우
                if error_type == 'compatibility_error':
                    return {
                        'success': False,
                        'error': error_msg,
                        'error_type': error_type,
                        'solution': ai_result.get('solution'),
                        'analysis_id': analysis_id
                    }
                
                # 일반 오류
                return {
                    'success': False,
                    'error': error_msg,
                    'error_type': error_type,
                    'analysis_id': analysis_id
                }
            
            # AI 서버 분석 성공
            logger.info("AI 서버 분석 완료")
            
            # AI 서버 결과를 Django 모델에 저장
            try:
                self._save_ai_results_to_database(analysis, ai_result)
                
                # 분석 완료 처리
                analysis.status = 'completed'
                analysis.overall_health_status = ai_result.get('overall_health_status', 'fair')
                analysis.total_detections = ai_result.get('total_detections', 0)
                analysis.yolo_confidence_avg = ai_result.get('yolo_confidence_avg', 0.0)
                analysis.completed_at = timezone.now()
                analysis.save()
                
                logger.info(f"어류 질병 분석 완료: {analysis_id}")
                
                return {
                    'success': True,
                    'message': ai_result.get('message', '어류 질병 분석이 완료되었습니다.'),
                    'data': {
                        'analysis_id': analysis_id,
                        'status': 'completed',
                        'overall_health_status': analysis.overall_health_status,
                        'total_detections': analysis.total_detections,
                        'yolo_confidence_avg': analysis.yolo_confidence_avg,
                        'detections': ai_result.get('detections', [])
                    }
                }
                
            except Exception as save_error:
                logger.error(f"AI 결과 저장 중 오류: {str(save_error)}")
                # 저장 실패해도 분석은 성공한 것으로 처리
                analysis.status = 'completed'
                analysis.save()
                
                return {
                    'success': True,
                    'message': 'AI 분석은 완료되었으나 데이터베이스 저장에 문제가 있습니다.',
                    'warning': str(save_error),
                    'data': ai_result
                }
                
        except FishAnalysis.DoesNotExist:
            logger.error(f"FishAnalysis 객체를 찾을 수 없습니다: {analysis_id}")
            return {
                'success': False,
                'error': f'분석 ID {analysis_id}를 찾을 수 없습니다.',
                'analysis_id': analysis_id
            }
        except Exception as e:
            logger.error(f"어류 질병 분석 중 오류 (ID: {analysis_id}): {str(e)}")
            try:
                analysis = FishAnalysis.objects.get(id=analysis_id)
                analysis.status = 'failed'
                analysis.save()
            except:
                pass
            
            return {
                'success': False,
                'error': f'분석 중 오류가 발생했습니다: {str(e)}',
                'analysis_id': analysis_id
            }
    
    def _save_ai_results_to_database(self, analysis: FishAnalysis, ai_result: Dict[str, Any]) -> None:
        """AI 서버 결과를 Django 데이터베이스에 저장"""
        try:
            detections = ai_result.get('detections', [])
            
            for detection in detections:
                # AI 서버 응답 구조에 맞게 데이터 추출
                bbox = detection.get('bbox', {})
                disease = detection.get('disease', {})
                
                # DiseaseDetection 객체 생성
                DiseaseDetection.objects.create(
                    analysis=analysis,
                    bbox_x=bbox.get('x', 0),
                    bbox_y=bbox.get('y', 0),
                    bbox_width=bbox.get('width', 0),
                    bbox_height=bbox.get('height', 0),
                    yolo_confidence=detection.get('yolo_confidence', 0),
                    # cropped_image는 AI 서버에서 임시 파일이므로 생략
                    disease_class=disease.get('class', 'unknown'),
                    disease_name_ko=disease.get('name_ko', '알 수 없음'),
                    vgg_confidence=disease.get('confidence', 0),
                    severity=disease.get('severity', 'moderate'),
                    description=disease.get('description', ''),
                    treatment_recommendation=disease.get('treatment', '')
                )
                
                logger.debug(f"질병 탐지 결과 저장 완료: {disease.get('name_ko', 'unknown')}")
                
        except Exception as e:
            logger.error(f"AI 결과 저장 중 오류: {str(e)}")
            raise
    
    # 아래 함수들은 AI 서버 연동으로 인해 더 이상 사용되지 않음
    # 시각화 및 크롭 처리는 AI 서버에서 담당


# 편의를 위한 함수
def process_fish_analysis_sync(analysis_id: int) -> Dict[str, Any]:
    """통합 분석 서비스의 진입점"""
    service = FishDiseaseAnalysisService()
    return service.process_fish_analysis_sync(analysis_id)