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


@api_view(['POST'])
def manual_payment_complete_view(request):
    """
    현금/계좌이체 결제 완료 처리 API
    운영자가 수동으로 결제 상태를 'paid'로 변경
    """
    # 사용자 인증 확인
    if not hasattr(request, 'user_id') or not request.user_id:
        return Response({
            'error': '사용자 인증이 필요합니다.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    order_id = request.data.get('order_id')
    payment_method = request.data.get('method')  # 'cash' 또는 'bank_transfer'
    amount = request.data.get('amount')
    
    if not order_id or not payment_method or not amount:
        return Response({
            'error': 'order_id, method, amount는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        amount = int(amount)
    except Exception:
        return Response({
            'error': 'amount는 정수여야 합니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if payment_method not in ['cash', 'bank_transfer']:
        return Response({
            'error': 'method는 cash 또는 bank_transfer여야 합니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        order = get_object_or_404(Order, id=order_id)
        
        # 사용자 권한 확인 - 자신이 생성한 주문만 결제 완료 처리 가능 (임시 주석처리)
        # if order.user_id != request.user_id:
        #     return Response({
        #         'error': '해당 주문을 결제 완료 처리할 권한이 없습니다.'
        #     }, status=status.HTTP_403_FORBIDDEN)
        
        # 결제 정보 생성 또는 업데이트
        payment, created = Payment.objects.get_or_create(
            order=order,
            defaults={
                'business_id': order.business_id,
                'amount': amount,
                'method': payment_method,
                'payment_status': 'paid',
                'paid_at': timezone.now()
            }
        )
        
        if not created:
            # 기존 결제 정보가 있으면 업데이트
            payment.amount = amount
            payment.method = payment_method
            payment.payment_status = 'paid'
            payment.paid_at = timezone.now()
            payment.save()
        
        # 주문 상태를 'ready'로 변경 (결제 완료 시)
        order.order_status = 'ready'
        order.save()
        
        return Response({
            'message': '결제가 완료되었습니다',
            'order_id': order.id,
            'payment_id': payment.id,
            'status': 'paid'
        })
        
    except Exception as e:
        return Response({
            'error': '결제 완료 처리 중 오류 발생',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def refund_payment_view(request):
    """
    결제 환불 처리 API
    결제 상태를 'refunded'로 변경하고 환불 사유 기록
    """
    # 사용자 인증 확인
    if not hasattr(request, 'user_id') or not request.user_id:
        return Response({
            'error': '사용자 인증이 필요합니다.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    payment_id = request.data.get('payment_id')
    refund_reason = request.data.get('refund_reason', '')
    
    if not payment_id:
        return Response({
            'error': 'payment_id는 필수입니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        payment = Payment.objects.get(id=payment_id)
        
        # 사용자 권한 확인 - 자신이 생성한 주문의 결제만 환불 가능 (임시 주석처리)
        # if payment.order.user_id != request.user_id:
        #     return Response({
        #         'error': '해당 결제를 환불할 권한이 없습니다.'
        #     }, status=status.HTTP_403_FORBIDDEN)
        
        # 환불 가능 여부 확인
        if payment.payment_status != 'paid':
            return Response({
                'error': '결제 완료된 결제만 환불할 수 있습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 환불 처리
        payment.payment_status = 'refunded'
        payment.refund_reason = refund_reason
        payment.refunded = True
        payment.save()
        
        return Response({
            'message': '환불이 처리되었습니다',
            'payment_id': payment.id,
            'payment_status': 'refunded',
            'refund_reason': refund_reason
        })
        
    except Payment.DoesNotExist:
        return Response({
            'error': '결제를 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': '환불 처리 중 오류 발생',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 기존 클래스 기반 뷰를 유지하되 사용하지 않음
class TossConfirmView:
    """레거시 - 사용하지 않음"""
    pass