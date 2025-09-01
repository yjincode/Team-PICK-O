from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    verbose_name = '재고 관리'
    
    def ready(self):
        """앱 시작 시 PyOD 모델 자동 로드"""
        try:
            from .anomaly_detection.pyod_engine import PyODAnomalyDetector
            detector = PyODAnomalyDetector()
            
            # 모델이 존재하면 자동 로드
            if detector.load_model():
                logger.info("✅ PyOD 모델 자동 로드 완료 (하이브리드 시스템 활성화)")
            else:
                logger.warning("⚠️ PyOD 모델 파일이 없습니다. 룰 기반 시스템만 사용됩니다.")
        except Exception as e:
            logger.error(f"❌ PyOD 모델 로드 실패: {e}")
            logger.info("룰 기반 시스템으로 계속 진행합니다.") 