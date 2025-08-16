"""
결제 서비스 로직
중복 paid 방지, 주문 상태 자동 변경, 토스 페이먼츠 연동, 환불 처리, 주문 취소
"""
import requests
import logging
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from .models import Payment
from order.models import Order

logger = logging.getLogger(__name__)


class PaymentService:
    """결제 서비스 클래스"""
    
    @staticmethod
    def ensure_no_paid(order_id):
        """중복 paid 결제 방지"""
        existing_paid = Payment.objects.filter(
            order_id=order_id,
            payment_status='paid'
        ).exists()
        
        if existing_paid:
            raise PaymentError("이미 결제가 완료된 주문입니다.", code=409)
    
    @staticmethod
    def promote_order_ready(order_id):
        """주문을 ready 상태로 변경"""
        try:
            Order.objects.filter(id=order_id).update(
                order_status='ready'  # order_status 필드명 사용
            )
            logger.info(f"주문 {order_id} 상태를 'ready'로 변경했습니다.")
        except Exception as e:
            logger.error(f"주문 상태 변경 실패 (주문 {order_id}): {e}")
            raise PaymentError("주문 상태 변경에 실패했습니다.")
    
    @staticmethod
    def verify_toss_payment(payment_key, order_id_for_toss, amount):
        """토스 페이먼츠 결제 검증"""
        logger.info(f"토스 페이먼츠 검증 시작: {payment_key}")
        
        # 토스 페이먼츠 시크릿 키 확인
        toss_secret_key = getattr(settings, 'TOSS_SECRET_KEY', '')
        if not toss_secret_key:
            logger.error("토스페이먼츠 시크릿 키가 설정되지 않았습니다.")
            raise PaymentError("토스페이먼츠 설정이 없습니다. 환경 변수 TOSS_SECRET_KEY를 확인해주세요.")
        
        # 환경 설정 확인
        toss_environment = getattr(settings, 'TOSS_ENVIRONMENT', 'test')
        
        # Basic 인증 헤더 생성
        import base64
        auth_string = f"{toss_secret_key}:"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Authorization': f'Basic {auth_b64}',
            'Content-Type': 'application/json'
        }

        # 토스 페이먼츠 결제 확정 API
        confirm_url = "https://api.tosspayments.com/v1/payments/confirm"
        confirm_data = {
            'paymentKey': payment_key,
            'orderId': str(order_id_for_toss),
            'amount': amount,
        }
        
        try:
            response = requests.post(confirm_url, json=confirm_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"토스페이먼츠 API 호출 성공: {payment_key}")
                return response_data
            else:
                error_data = response.json()
                logger.error(f"토스페이먼츠 API 오류: {response.status_code} - {error_data}")
                
                # 토스페이먼츠 에러 코드별 처리
                error_code = error_data.get('code', 'UNKNOWN_ERROR')
                error_message = error_data.get('message', '알 수 없는 오류')
                
                # 일반적인 에러 코드들
                if error_code == 'INVALID_PAYMENT_KEY':
                    raise PaymentError("유효하지 않은 결제 키입니다.", code=400)
                elif error_code == 'INVALID_ORDER_ID':
                    raise PaymentError("유효하지 않은 주문 ID입니다.", code=400)
                elif error_code == 'INVALID_AMOUNT':
                    raise PaymentError("결제 금액이 일치하지 않습니다.", code=400)
                elif error_code == 'ALREADY_PROCESSED_PAYMENT':
                    raise PaymentError("이미 처리된 결제입니다.", code=409)
                elif error_code == 'PAYMENT_NOT_FOUND':
                    raise PaymentError("결제 정보를 찾을 수 없습니다.", code=404)
                elif error_code == 'PAYMENT_EXPIRED':
                    raise PaymentError("결제가 만료되었습니다.", code=410)
                else:
                    raise PaymentError(
                        f"토스페이먼츠 검증 실패: {error_message} (코드: {error_code})",
                        code=422
                    )
                    
        except requests.Timeout:
            logger.error("토스페이먼츠 API 호출 시간 초과")
            raise PaymentError("결제 검증 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")
        except requests.RequestException as e:
            logger.error(f"토스페이먼츠 API 호출 오류: {e}")
            raise PaymentError("결제 검증 중 네트워크 오류가 발생했습니다.")
        except Exception as e:
            logger.error(f"토스페이먼츠 검증 중 예상치 못한 오류: {e}")
            raise PaymentError("결제 검증 중 오류가 발생했습니다.")
    
    @staticmethod
    @transaction.atomic
    def process_toss_confirm(payment_key, order_id, amount, order_id_for_toss):
        """토스 페이먼츠 결제 확정 처리
        - 사전 생성된 pending Payment(merchant_uid=order_id_for_toss)를 업데이트하여 paid로 전환
        """
        try:
            logger.info(f"토스페이먼츠 결제 확정 시작: 주문 {order_id}")
            
            # 1. 중복 paid 결제 방지
            PaymentService.ensure_no_paid(order_id)
            
            # 2. pending 결제 조회 (사전 생성된 Payment)
            try:
                payment = Payment.objects.get(
                    merchant_uid=str(order_id_for_toss),
                    payment_status='pending'
                )
                order = payment.order
                logger.info(f"pending 결제 조회 성공: payment_id={payment.id}")
            except Payment.DoesNotExist:
                logger.error(f"pending 결제를 찾을 수 없습니다: merchant_uid={order_id_for_toss}")
                raise PaymentError("해당 주문의 대기 결제를 찾을 수 없습니다.", code=404)
            
            # 3. 금액 검증
            if amount != order.total_price:
                logger.error(f"금액 불일치: 결제 금액 {amount}, 주문 금액 {order.total_price}")
                raise PaymentError(
                    f"결제 금액({amount:,}원)이 주문 금액({order.total_price:,}원)과 일치하지 않습니다.",
                    code=400
                )
            
            # 4. 토스 페이먼츠 검증
            toss_response = PaymentService.verify_toss_payment(payment_key, order_id_for_toss, amount)
            
            # 5. pending 결제 업데이트 → paid
            payment.payment_status = 'paid'
            payment.paid_at = timezone.now()
            payment.imp_uid = payment_key
            payment.receipt_url = toss_response.get('receipt', {}).get('url')
            payment.card_approval_number = toss_response.get('card', {}).get('approvalNumber')
            payment.save()
            logger.info(f"결제 상태 업데이트 완료: payment_id={payment.id}, status=paid")
            
            # 6. 주문 상태 변경 (placed → ready)
            try:
                order.order_status = 'ready'
                order.save()
                logger.info(f"주문 상태 변경 완료: order_id={order.id}, status=ready")
            except Exception as e:
                logger.error(f"주문 상태 변경 실패: {e}")
                pass
            
            logger.info(f"토스페이먼츠 결제 확정 완료: 결제 {payment.id}, 주문 {order_id}")
            
            return {
                'paymentKey': payment_key,
                'orderId': order_id,
                'status': 'paid',
                'totalAmount': amount,
                'payment_id': payment.id,
                'order_status': 'ready'
            }
            
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"토스페이먼츠 결제 확정 오류: {e}", exc_info=True)
            raise PaymentError("결제 처리 중 오류가 발생했습니다.")
    
    @staticmethod
    @transaction.atomic
    def process_mark_paid(order_id, amount, method, payer_name=None, bank_name=None):
        """수동 결제 완료 처리"""
        try:
            logger.info(f"수동 결제 완료 처리 시작: 주문 {order_id}, 방법 {method}")
            
            # 1. 중복 paid 방지
            PaymentService.ensure_no_paid(order_id)
            
            # 2. 주문 정보 조회
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                logger.error(f"존재하지 않는 주문: {order_id}")
                raise PaymentError("존재하지 않는 주문입니다.", code=404)
            
            # 3. 금액 검증
            if amount != order.total_price:
                logger.error(f"금액 불일치: 결제 금액 {amount}, 주문 금액 {order.total_price}")
                raise PaymentError(
                    f"결제 금액({amount:,}원)이 주문 금액({order.total_price:,}원)과 일치하지 않습니다.",
                    code=400
                )
            
            # 4. 결제 정보 저장
            payment = Payment.objects.create(
                order=order,
                business_id=order.business_id,
                amount=amount,
                method=method,
                payment_status='paid',
                paid_at=timezone.now(),
                merchant_uid=f"manual_{order_id}_{int(timezone.now().timestamp())}",
                payer_name=payer_name,
                bank_name=bank_name
            )
            
            # 5. 주문 상태 변경
            PaymentService.promote_order_ready(order_id)
            
            logger.info(f"수동 결제 완료: 결제 {payment.id}, 주문 {order_id}")
            
            return {
                'orderId': order_id,
                'status': 'paid',
                'amount': amount,
                'method': method,
                'payment_id': payment.id
            }
            
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"수동 결제 완료 오류: {e}", exc_info=True)
            raise PaymentError("결제 처리 중 오류가 발생했습니다.")
    
    @staticmethod
    @transaction.atomic
    def process_refund(order_id, refund_reason):
        """환불 처리"""
        try:
            logger.info(f"환불 처리 시작: 주문 {order_id}")
            
            # 1. 주문 정보 조회
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                logger.error(f"존재하지 않는 주문: {order_id}")
                raise PaymentError("존재하지 않는 주문입니다.", code=404)
            
            # 2. 결제 정보 조회
            try:
                payment = Payment.objects.get(order=order, payment_status='paid')
            except Payment.DoesNotExist:
                logger.error(f"결제 정보를 찾을 수 없음: 주문 {order_id}")
                raise PaymentError("결제 정보를 찾을 수 없습니다.", code=404)
            
            # 3. 이미 환불된 주문인지 확인
            if payment.payment_status == 'refunded':
                logger.warning(f"이미 환불된 주문: {order_id}")
                raise PaymentError("이미 환불된 주문입니다.", code=409)
            
            # 4. 토스 페이먼츠 환불 처리 (카드 결제인 경우)
            if payment.method == 'card' and payment.imp_uid:
                try:
                    PaymentService.process_toss_refund(payment.imp_uid, payment.amount)
                except Exception as e:
                    logger.warning(f"토스페이먼츠 환불 실패, 수동 처리로 진행: {e}")
            
            # 5. 재고 복원 처리
            PaymentService.restore_stock_on_cancel(order)
            
            # 6. 결제 상태를 환불로 변경
            payment.payment_status = 'refunded'
            payment.refunded = True
            payment.refund_reason = refund_reason
            payment.save()
            
            # 7. 주문 상태를 취소로 변경
            order.order_status = 'cancelled'
            order.save()
            
            logger.info(f"환불 처리 완료: 결제 {payment.id}, 주문 {order_id}")
            
            return {
                'orderId': order_id,
                'status': 'refunded',
                'refund_reason': refund_reason,
                'payment_id': payment.id
            }
            
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"환불 처리 오류: {e}", exc_info=True)
            raise PaymentError("환불 처리 중 오류가 발생했습니다.")
    
    @staticmethod
    @transaction.atomic
    def process_cancel_order(order_id, cancel_reason):
        """주문 취소 처리"""
        try:
            logger.info(f"주문 취소 처리 시작: 주문 {order_id}, 사유: {cancel_reason}")
            
            # 1. 주문 정보 조회
            try:
                order = Order.objects.get(id=order_id)
                logger.info(f"주문 정보 조회 성공: {order.id}")
            except Order.DoesNotExist:
                logger.error(f"존재하지 않는 주문: {order_id}")
                raise PaymentError("존재하지 않는 주문입니다.", code=404)
            
            # 2. 주문 상태 확인
            if order.order_status == 'cancelled':
                logger.warning(f"이미 취소된 주문: {order_id}")
                raise PaymentError("이미 취소된 주문입니다.", code=409)
            
            if order.order_status == 'delivered':
                logger.warning(f"납품 완료된 주문은 취소 불가: {order_id}")
                raise PaymentError("납품이 완료된 주문은 취소할 수 없습니다.", code=400)
            
            # 3. 결제 정보가 있는 경우 환불 처리
            try:
                payment = Payment.objects.get(order=order, payment_status='paid')
                if payment:
                    logger.info("결제된 주문 취소, 환불 처리 진행")
                    # 환불 처리 (사유를 취소 사유로 설정)
                    return PaymentService.process_refund(order_id, f"주문 취소: {cancel_reason}")
            except Payment.DoesNotExist:
                logger.info("미결제 주문 취소")
                pass
            
            # 4. 재고 복원 처리
            PaymentService.restore_stock_on_cancel(order)
            
            # 5. 주문 상태를 취소로 변경
            order.order_status = 'cancelled'
            # order.cancel_reason = cancel_reason  # cancel_reason 필드가 있는 경우
            order.save()
            
            logger.info(f"주문 상태를 취소로 변경: 주문 {order_id}")
            logger.info(f"주문 취소 완료: 주문 {order_id}")
            
            return {
                'orderId': order_id,
                'status': 'cancelled',
                'cancelReason': cancel_reason
            }
            
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"주문 취소 오류: {e}", exc_info=True)
            raise PaymentError("주문 취소 중 오류가 발생했습니다.")
    
    @staticmethod
    @transaction.atomic
    def restore_stock_on_cancel(order):
        """주문 취소시 재고 복원 처리"""
        try:
            from inventory.models import StockTransaction
            
            logger.info(f"주문 취소에 따른 재고 복원 시작: 주문 {order.id}")
            
            # 1. 해당 주문으로 차감된 재고 트랜잭션들을 찾아서 복원
            order_items = order.items.all()
            restored_items = []
            
            for item in order_items:
                # 해당 주문 항목에 대한 차감 트랜잭션 조회
                deduction_transactions = StockTransaction.objects.filter(
                    fish_type_id=item.fish_type_id,
                    user_id=order.user_id,
                    transaction_type='order',
                    quantity_change__lt=0,  # 음수 (차감된 것들)
                    order_item_id=item.id if hasattr(item, 'id') else None
                )
                
                total_deducted = sum(abs(t.quantity_change) for t in deduction_transactions)
                
                if total_deducted > 0:
                    # 복원 트랜잭션 생성 (양수로 복원)
                    StockTransaction.objects.create(
                        fish_type_id=item.fish_type_id,
                        user_id=order.user_id,
                        transaction_type='cancel_restore',  # 취소 복원 타입
                        quantity_change=total_deducted,  # 양수로 복원
                        memo=f"주문 취소에 따른 재고 복원 - 주문 #{order.id}, {item.fish_type.name}"
                    )
                    
                    restored_items.append({
                        'fish_type': item.fish_type.name,
                        'quantity': total_deducted,
                        'unit': item.unit
                    })
                    
                    logger.info(f"재고 복원: {item.fish_type.name} {total_deducted}{item.unit}")
            
            logger.info(f"재고 복원 완료: 주문 {order.id}, 복원 항목 {len(restored_items)}개")
            
            return restored_items
            
        except Exception as e:
            logger.error(f"재고 복원 실패: 주문 {order.id}, 오류: {e}")
            # 재고 복원 실패해도 주문 취소는 진행되도록 에러를 발생시키지 않음
            return []
    
    @staticmethod
    def process_toss_refund(imp_uid, amount):
        """토스 페이먼츠 환불 처리"""
        logger.info(f"토스페이먼츠 환불 처리 시작: {imp_uid}, 금액: {amount}")
        
        toss_secret_key = getattr(settings, 'TOSS_SECRET_KEY', '')
        if not toss_secret_key:
            logger.error("토스페이먼츠 시크릿 키가 설정되지 않았습니다.")
            raise PaymentError("토스페이먼츠 설정이 없습니다.")
        
        # Basic 인증 헤더 생성
        import base64
        auth_string = f"{toss_secret_key}:"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Authorization': f'Basic {auth_b64}',
            'Content-Type': 'application/json'
        }
        
        # 토스 페이먼츠 환불 API 호출
        refund_url = f"https://api.tosspayments.com/v1/payments/{imp_uid}/cancel"
        refund_data = {
            'cancelAmount': amount,
            'cancelReason': '고객 요청'
        }
        
        logger.info(f"토스페이먼츠 환불 API 호출: {refund_url}")
        logger.info(f"환불 데이터: {refund_data}")
        
        try:
            response = requests.post(refund_url, json=refund_data, headers=headers, timeout=30)
            
            logger.info(f"토스페이먼츠 환불 API 응답 상태: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"토스페이먼츠 환불 성공: {imp_uid}")
                logger.info(f"응답 데이터: {response_data}")
                return response_data
            else:
                error_data = response.json()
                logger.error(f"토스페이먼츠 환불 API 오류 응답: {response.status_code} - {error_data}")
                
                # 토스페이먼츠 환불 에러 코드별 처리
                error_code = error_data.get('code', 'UNKNOWN_ERROR')
                error_message = error_data.get('message', '알 수 없는 오류')
                
                if error_code == 'PAYMENT_NOT_FOUND':
                    raise PaymentError("환불할 결제 정보를 찾을 수 없습니다.", code=404)
                elif error_code == 'ALREADY_CANCELED_PAYMENT':
                    raise PaymentError("이미 취소된 결제입니다.", code=409)
                elif error_code == 'INVALID_CANCEL_AMOUNT':
                    raise PaymentError("환불 금액이 유효하지 않습니다.", code=400)
                else:
                    raise PaymentError(
                        f"토스페이먼츠 환불 실패: {error_message} (코드: {error_code})",
                        code=422
                    )
                    
        except requests.Timeout:
            logger.error("토스페이먼츠 환불 API 호출 시간 초과")
            raise PaymentError("환불 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")
        except requests.RequestException as e:
            logger.error(f"토스페이먼츠 환불 API 호출 오류: {e}")
            raise PaymentError("환불 처리 중 네트워크 오류가 발생했습니다.")
        except Exception as e:
            logger.error(f"토스페이먼츠 환불 중 예상치 못한 오류: {e}")
            raise PaymentError("환불 처리 중 오류가 발생했습니다.")


class PaymentError(Exception):
    """결제 관련 커스텀 에러"""
    
    def __init__(self, message, code=500):
        self.message = message
        self.code = code
        super().__init__(self.message)
