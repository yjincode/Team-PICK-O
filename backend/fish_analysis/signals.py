from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.apps import apps
from django.conf import settings
import logging
import os

from .models import FishAnalysis, DiseaseDetection
from .analyzer import django_fish_analyzer

logger = logging.getLogger(__name__)

def initialize_ai_models():
    """AI 모델 초기화 (필요시 수동 호출)"""
    try:
        if settings.DEBUG:
            logger.info("🔄 개발 모드에서 AI 모델 초기화 건너뜀")
            return
            
        logger.info("🚀 AI 모델 초기화 시작...")
        django_fish_analyzer.initialize_models()
        logger.info("✅ AI 모델 초기화 완료")
        
    except Exception as e:
        logger.error(f"❌ AI 모델 초기화 실패: {str(e)}")


@receiver(post_save, sender=FishAnalysis)
def analysis_post_save(sender, instance, created, **kwargs):
    """분석 결과 저장 후 처리"""
    if created:
        logger.info(f"📊 새로운 분석 결과 생성: {instance.id}")
        
        # 통계 업데이트나 알림 발송 등의 추가 작업 수행 가능
        # update_analysis_statistics(instance)
        # send_analysis_notification(instance)


@receiver(pre_delete, sender=FishAnalysis)
def analysis_pre_delete(sender, instance, **kwargs):
    """분석 결과 삭제 전 처리"""
    try:
        # 관련 이미지 파일 삭제
        if instance.image:
            image_path = instance.image.path
            if os.path.exists(image_path):
                os.remove(image_path)
                logger.info(f"🗑️ 이미지 파일 삭제: {image_path}")
                
    except Exception as e:
        logger.error(f"❌ 이미지 파일 삭제 실패: {str(e)}")


def update_analysis_statistics(analysis_instance):
    """분석 통계 업데이트 (선택사항)"""
    # Redis나 별도 통계 테이블에 통계 정보 업데이트
    # 예: 일별/월별 분석 횟수, 질병 발견율 등
    pass


def send_analysis_notification(analysis_instance):
    """분석 완료 알림 발송 (선택사항)"""
    # 이메일, 푸시 알림, 웹소켓 등으로 사용자에게 알림
    # 특히 질병이 발견된 경우 즉시 알림
    if analysis_instance.overall_health == 'diseased':
        logger.warning(f"⚠️ 질병 발견 - 분석 ID: {analysis_instance.id}")
        # send_disease_alert_notification(analysis_instance)