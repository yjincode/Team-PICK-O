from django.apps import AppConfig


class PaymentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payment'
    
    def ready(self):
        """앱이 준비되었을 때 signals를 import"""
        import payment.signals 