from django.apps import AppConfig


class FishAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fish_analysis'
    verbose_name = '생선 상태 분석'
    
    def ready(self):
        """앱이 준비될 때 실행되는 함수"""
        # AI 모델 초기화는 여기서 수행
        import fish_analysis.signals