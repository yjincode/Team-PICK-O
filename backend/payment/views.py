import httpx
import base64
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from order.models import Order
from .models import Payment


class TossConfirmView(APIView):
    """
    토스 결제 승인 엔드포인트
    프론트 성공 리다이렉트에서 전달된 paymentKey, orderId, amount를 받아
    토스 서버 승인 API 호출 후 Payment/Order 상태 갱신
    """

    permission_classes = [AllowAny]

    def post(self, request):
        payment_key = request.data.get('paymentKey')
        order_id = request.data.get('orderId')
        amount = request.data.get('amount')

        if not payment_key or not order_id or not amount:
            return Response({'error': 'paymentKey, orderId, amount는 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = int(amount)
        except Exception:
            return Response({'error': 'amount는 정수여야 합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # orderId 형식: order-<order_pk>-<timestamp> 가정
        try:
            order_pk = int(str(order_id).split('-')[1])
        except Exception:
            return Response({'error': 'orderId 형식이 올바르지 않습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, id=order_pk)

        # 금액 유효성 검증 (요청 금액과 주문 금액 일치 여부)
        if amount != (order.total_price or 0):
            return Response({'error': '요청 금액이 주문 금액과 일치하지 않습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        # Toss API 인증 정보
        toss_secret_key = getattr(settings, 'TOSS_SECRET_KEY', None)
        if not toss_secret_key:
            return Response({'error': '서버에 TOSS_SECRET_KEY가 설정되어 있지 않습니다.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 승인 호출
        url = 'https://api.tosspayments.com/v1/payments/confirm'
        auth = (toss_secret_key + ':').encode('utf-8')

        headers = {
            'Authorization': 'Basic ' + base64.b64encode(auth).decode('utf-8'),
            'Content-Type': 'application/json',
        }

        payload = {
            'paymentKey': payment_key,
            'orderId': order_id,
            'amount': amount,
        }

        try:
            with httpx.Client(timeout=10) as client:
                resp = client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    return Response({'error': '토스 승인 실패', 'detail': resp.text}, status=resp.status_code)
                data = resp.json()
        except httpx.HTTPError as e:
            return Response({'error': '토스 승인 호출 오류', 'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # 토스 응답 금액 검증
        toss_total_amount = data.get('totalAmount')
        if toss_total_amount is not None and int(toss_total_amount) != amount:
            return Response({'error': '토스 승인 금액 불일치'}, status=status.HTTP_400_BAD_REQUEST)

        # 결제 정보 갱신/저장
        payment = Payment.objects.filter(order=order).order_by('-id').first()
        if not payment:
            payment = Payment.objects.create(
                order=order,
                business=order.business,
                amount=amount,
                method='card',
                payment_status='paid',
                merchant_uid=order_id,
                imp_uid=data.get('paymentKey'),
                receipt_url=(data.get('receipt', {}) or {}).get('url'),
                card_approval_number=(data.get('card', {}) or {}).get('approveNo'),
            )
        else:
            payment.amount = amount
            payment.method = 'card'
            payment.payment_status = 'paid'
            payment.merchant_uid = order_id
            payment.imp_uid = data.get('paymentKey')
            payment.receipt_url = (data.get('receipt', {}) or {}).get('url')
            payment.card_approval_number = (data.get('card', {}) or {}).get('approveNo')
            if not payment.paid_at:
                payment.paid_at = timezone.now()
            payment.save()

        # 주문의 상태는 그대로 두되, 필요 시 여기서 갱신 가능
        return Response({
            'message': '결제가 승인되었습니다.',
            'payment': {
                'id': payment.id,
                'status': payment.payment_status,
                'amount': payment.amount,
                'method': payment.method,
                'receipt_url': payment.receipt_url,
            }
        })


