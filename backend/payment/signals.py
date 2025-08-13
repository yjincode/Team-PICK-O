from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Payment
from order.models import Order


@receiver(post_save, sender=Payment)
def update_order_status_on_payment(sender, instance, created, **kwargs):
    """
    결제 상태가 'paid'로 변경될 때 주문 상태를 'ready'로 자동 변경
    """
    if instance.payment_status == 'paid':
        try:
            order = instance.order
            
            # 주문 상태가 'placed'인 경우에만 'ready'로 변경
            if order.order_status == 'placed':
                order.order_status = 'ready'
                order.save()
                
                print(f"✅ 주문 {order.id} 상태가 자동으로 'ready'로 변경되었습니다.")
                
        except Exception as e:
            print(f"❌ 주문 상태 자동 변경 중 오류 발생: {e}")


@receiver(post_save, sender=Payment)
def log_payment_status_change(sender, instance, created, **kwargs):
    """
    결제 상태 변경 로그 기록
    """
    if created:
        print(f" 새 결제 생성: ID {instance.id}, 상태: {instance.payment_status}, 금액: {instance.amount}")
    else:
        print(f" 결제 상태 변경: ID {instance.id}, 상태: {instance.payment_status}, 금액: {instance.amount}")
