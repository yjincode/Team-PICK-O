"""
결제 관련 시리얼라이저
토스 페이먼츠 확정, 수동 결제 완료, 환불 처리, 주문 취소 로직 포함
"""
from rest_framework import serializers
from .models import Payment
from django.utils import timezone

class TossConfirmSerializer(serializers.Serializer):
    paymentKey = serializers.CharField()
    orderId = serializers.CharField()
    amount = serializers.IntegerField()

    def validate(self, data):
        from order.models import Order
        from .models import Payment

        payment_key = data["paymentKey"]
        order_id_str = data["orderId"]
        amount = data["amount"]

        if amount <= 0:
            raise serializers.ValidationError({"amount": "결제 금액은 0보다 커야 합니다."})

        # 1) Payment에서 merchant_uid 기준 조회
        try:
            payment = Payment.objects.get(merchant_uid=order_id_str, payment_status='pending')
        except Payment.DoesNotExist:
            raise serializers.ValidationError({"orderId": "최초 결제요청에 사용한 주문 ID와 일치하지 않습니다."})

        order = payment.order

        # 2) 이미 결제 완료 여부 확인
        if Payment.objects.filter(order=order, payment_status='paid').exists():
            raise serializers.ValidationError({"orderId": "이미 결제가 완료된 주문입니다."})

        # 3) 금액 검증
        if order.total_price != amount:
            raise serializers.ValidationError({"amount": f"결제 금액({amount:,}원)이 주문 금액({order.total_price:,}원)과 일치하지 않습니다."})

        # 4) 결제키 중복 방지 (imp_uid 필드 사용)
        if Payment.objects.filter(imp_uid=payment_key, payment_status='paid').exists():
            raise serializers.ValidationError({"paymentKey": "이미 처리된 결제키입니다."})

        self.context["order"] = order
        self.context["payment"] = payment
        return data



class MarkPaidSerializer(serializers.Serializer):
    """수동 결제 완료 시리얼라이저"""
    orderId = serializers.IntegerField(help_text="주문 ID")
    amount = serializers.IntegerField(help_text="결제 금액")
    method = serializers.ChoiceField(
        choices=['cash', 'bank_transfer'],
        help_text="결제 방법 (현금 또는 계좌이체)"
    )
    payerName = serializers.CharField(required=False, allow_blank=True, help_text="입금자명 (선택)")
    bankName = serializers.CharField(required=False, allow_blank=True, help_text="은행명 (선택)")

    def validate_orderId(self, value):
        from order.models import Order
        try:
            order = Order.objects.get(id=value)
        except Order.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 주문입니다.")
        existing_paid = Payment.objects.filter(order=order, payment_status='paid').exists()
        if existing_paid:
            raise serializers.ValidationError("이미 결제가 완료된 주문입니다.")
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("결제 금액은 0보다 커야 합니다.")
        return value

    def validate(self, data):
        from order.models import Order
        order = Order.objects.get(id=data['orderId'])
        if data['amount'] != order.total_price:
            raise serializers.ValidationError(
                f"결제 금액({data['amount']:,}원)이 주문 금액({order.total_price:,}원)과 일치하지 않습니다."
            )
        return data


class RefundSerializer(serializers.Serializer):
    """환불 처리 시리얼라이저"""
    orderId = serializers.IntegerField(help_text="주문 ID")
    refundReason = serializers.CharField(max_length=500, help_text="환불 사유")

    def validate_orderId(self, value):
        from order.models import Order
        try:
            order = Order.objects.get(id=value)
        except Order.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 주문입니다.")
        existing_paid = Payment.objects.filter(order=order, payment_status='paid').exists()
        if not existing_paid:
            raise serializers.ValidationError("결제가 완료되지 않은 주문입니다.")
        existing_refunded = Payment.objects.filter(order=order, payment_status='refunded').exists()
        if existing_refunded:
            raise serializers.ValidationError("이미 환불된 주문입니다.")
        return value


class CancelOrderSerializer(serializers.Serializer):
    """주문 취소 시리얼라이저"""
    orderId = serializers.IntegerField(help_text="주문 ID")
    cancelReason = serializers.CharField(max_length=500, help_text="취소 사유")

    def validate_orderId(self, value):
        from order.models import Order
        try:
            order = Order.objects.get(id=value)
        except Order.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 주문입니다.")
        if order.order_status == 'cancelled':
            raise serializers.ValidationError("이미 취소된 주문입니다.")
        if order.order_status == 'delivered':
            raise serializers.ValidationError("납품이 완료된 주문은 취소할 수 없습니다.")
        return value
