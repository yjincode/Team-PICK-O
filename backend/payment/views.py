import httpx
import base64
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from order.models import Order
from .models import Payment


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def toss_confirm_view(request):
    """
    토스 결제 승인 엔드포인트
    프론트 성공 리다이렉트에서 전달된 paymentKey, orderId, amount를 받아
    토스 서버 승인 API 호출 후 Payment/Order 상태 갱신
    """
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
        # 개발 환경에서는 토스 승인을 스킵하고 주문 상태만 업데이트
        print("⚠️ TOSS_SECRET_KEY가 설정되지 않아 개발 모드로 동작합니다.")
        
        # 주문 상태를 결제 완료로 업데이트
        order.order_status = 'ready'  # 또는 'paid' 상태
        order.save()
        
        # Payment 레코드 생성
        Payment.objects.create(
            order=order,
            business_id=order.business_id,
            amount=amount,
            method='card',
            payment_status='paid',
            paid_at=timezone.now(),
            imp_uid=payment_key,
            merchant_uid=order_id
        )
        
        return Response({
            'message': '결제가 완료되었습니다 (개발 모드)',
            'order_id': order.id,
            'status': 'paid'
        })

    # 실제 토스 승인 API 호출
    try:
        toss_url = 'https://api.tosspayments.com/v1/payments/confirm'
        auth_string = base64.b64encode(f'{toss_secret_key}:'.encode()).decode()
        
        with httpx.Client() as client:
            response = client.post(
                toss_url,
                json={
                    'paymentKey': payment_key,
                    'orderId': order_id,
                    'amount': amount
                },
                headers={
                    'Authorization': f'Basic {auth_string}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                # 결제 승인 성공
                order.order_status = 'ready'
                order.save()
                
                # Payment 레코드 생성
                Payment.objects.create(
                    order=order,
                    business_id=order.business_id,
                    amount=amount,
                    method='card',
                    payment_status='paid',
                    paid_at=timezone.now(),
                    imp_uid=payment_key,
                    merchant_uid=order_id
                )
                
                return Response({
                    'message': '결제가 완료되었습니다',
                    'order_id': order.id,
                    'status': 'paid'
                })
            else:
                return Response({
                    'error': '토스 결제 승인 실패',
                    'details': response.text
                }, status=status.HTTP_400_BAD_REQUEST)
                
    except Exception as e:
        return Response({
            'error': '결제 승인 처리 중 오류 발생',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 기존 클래스 기반 뷰를 유지하되 사용하지 않음
class TossConfirmView:
    """레거시 - 사용하지 않음"""
    pass