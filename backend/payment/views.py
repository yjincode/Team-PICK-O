import logging
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Sum, Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from core.middleware import UserValidationMixin, get_user_queryset_filter
from .serializers import TossConfirmSerializer, MarkPaidSerializer, RefundSerializer, CancelOrderSerializer
from .services import PaymentService, PaymentError
from order.models import Order
from payment.models import Payment  # 결제 모델

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class TossConfirmView(APIView):
    """
    토스 페이먼츠 결제 확정 API
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        logger.debug(f"🔍 TossConfirmView.post 시작: {request.path}")
        logger.debug(f"🔍 request.data: {request.data}")

        try:
            serializer = TossConfirmSerializer(data=request.data, context={"request": request})
            if not serializer.is_valid():
                return Response(
                    {"error": "요청 데이터가 올바르지 않습니다.", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            payment_key = serializer.validated_data["paymentKey"]
            merchant_uid = serializer.validated_data["orderId"]  # 문자열 그대로
            amount = serializer.validated_data["amount"]

            # serializer에서 찾아둔 pending 결제
            payment = serializer.context.get("payment")
            if not payment:
                payment = Payment.objects.filter(merchant_uid=merchant_uid, payment_status="pending").first()
                if not payment:
                    return Response({"error": "해당 결제를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

            result = PaymentService.process_toss_confirm(
                payment_key=payment_key,
                order_id=payment.order.id,
                amount=amount,
                order_id_for_toss=merchant_uid
            )

            return Response({"message": "결제가 성공적으로 확정되었습니다.", "data": result})

        except PaymentError as e:
            return Response({"error": e.message}, status=e.code)
        except Exception as e:
            logger.error(f"토스 페이먼츠 확정 오류: {e}", exc_info=True)
            return Response({"error": "결제 확정 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class MarkPaidView(UserValidationMixin, APIView):
    """수동 결제 완료 API (현금/계좌이체)"""
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            serializer = MarkPaidSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": "요청 데이터가 올바르지 않습니다.", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = PaymentService.process_mark_paid(
                serializer.validated_data["orderId"],
                serializer.validated_data["amount"],
                serializer.validated_data["method"],
                serializer.validated_data.get("payerName"),
                serializer.validated_data.get("bankName")
            )

            return Response({"message": "결제가 성공적으로 완료되었습니다.", "data": result})

        except PaymentError as e:
            return Response({"error": e.message}, status=e.code)
        except Exception as e:
            logger.error(f"수동 결제 완료 오류: {e}", exc_info=True)
            return Response({"error": "결제 완료 처리 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class RefundView(UserValidationMixin, APIView):
    """환불 처리 API"""
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            serializer = RefundSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": "요청 데이터가 올바르지 않습니다.", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = PaymentService.process_refund(
                serializer.validated_data["orderId"],
                serializer.validated_data["refundReason"]
            )

            return Response({"message": "환불이 성공적으로 처리되었습니다.", "data": result})

        except PaymentError as e:
            return Response({"error": e.message}, status=e.code)
        except Exception as e:
            logger.error(f"환불 처리 오류: {e}", exc_info=True)
            return Response({"error": "환불 처리 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class CancelOrderView(UserValidationMixin, APIView):
    """주문 취소 API"""
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            serializer = CancelOrderSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"error": "요청 데이터가 올바르지 않습니다.", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = PaymentService.process_cancel_order(
                serializer.validated_data["orderId"],
                serializer.validated_data["cancelReason"]
            )

            return Response({"message": "주문이 성공적으로 취소되었습니다.", "data": result})

        except PaymentError as e:
            return Response({"error": e.message}, status=e.code)
        except Exception as e:
            logger.error(f"주문 취소 오류: {e}", exc_info=True)
            return Response({"error": "주문 취소 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentRollbackView(UserValidationMixin, APIView):
    """결제 상태 롤백 API (실제 환불 없이 결제 상태만 되돌리기)"""
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        try:
            order_id = request.data.get('orderId')
            rollback_reason = request.data.get('rollbackReason', '결제 실수')
            
            if not order_id:
                return Response(
                    {"error": "주문 ID가 필요합니다."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = PaymentService.process_payment_rollback(order_id, rollback_reason)
            return Response({"message": "결제 상태가 성공적으로 롤백되었습니다.", "data": result})

        except PaymentError as e:
            return Response({"error": e.message}, status=e.code)
        except Exception as e:
            logger.error(f"결제 롤백 오류: {e}", exc_info=True)
            return Response({"error": "결제 롤백 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class TossRequestView(APIView):
    """
    토스 페이먼츠 결제 요청 API (결제창 방식용)
    pending 상태의 Payment를 미리 생성하여 결제창 호출 준비
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        logger.debug(f"🔍 TossRequestView.post 시작: {request.path}")
        logger.debug(f"🔍 request.data: {request.data}")

        try:
            order_id = request.data.get("orderId")
            amount = request.data.get("amount")
            order_id_for_toss = request.data.get("orderIdForToss")

            logger.info(f"🔍 받은 데이터: orderId={order_id}, amount={amount}, orderIdForToss={order_id_for_toss}")

            if not all([order_id, amount, order_id_for_toss]):
                missing_fields = []
                if not order_id: missing_fields.append("orderId")
                if not amount: missing_fields.append("amount")
                if not order_id_for_toss: missing_fields.append("orderIdForToss")
                
                logger.error(f"필수 파라미터 누락: {missing_fields}")
                return Response(
                    {"error": f"필수 파라미터가 누락되었습니다: {missing_fields}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 주문 정보 조회
            try:
                order = Order.objects.get(id=order_id)
                logger.info(f"주문 정보 조회 성공: order_id={order.id}, business_id={order.business_id}, total_price={order.total_price}")
            except Order.DoesNotExist:
                logger.error(f"존재하지 않는 주문: {order_id}")
                return Response({"error": "존재하지 않는 주문입니다."}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                logger.error(f"주문 조회 중 오류: {e}", exc_info=True)
                return Response({"error": "주문 조회 중 오류가 발생했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # 금액 검증
            if amount != order.total_price:
                logger.error(f"금액 불일치: 결제 금액 {amount}, 주문 금액 {order.total_price}")
                return Response(
                    {"error": f"결제 금액({amount:,}원)이 주문 금액({order.total_price:,}원)과 일치하지 않습니다."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 중복 pending 결제 방지
            existing_pending = Payment.objects.filter(
                merchant_uid=order_id_for_toss,
                payment_status='pending'
            ).exists()
            
            if existing_pending:
                logger.warning(f"이미 대기 중인 결제가 있습니다: merchant_uid={order_id_for_toss}")
                return Response({"error": "이미 대기 중인 결제가 있습니다."}, status=status.HTTP_409_CONFLICT)

            # pending 상태의 Payment 생성
            try:
                payment = Payment.objects.create(
                    order=order,
                    business_id=order.business_id,
                    amount=amount,
                    method='card',
                    payment_status='pending',
                    merchant_uid=order_id_for_toss,
                    created_at=timezone.now()
                )
                logger.info(f"pending Payment 생성 완료: payment_id={payment.id}, merchant_uid={order_id_for_toss}")
            except Exception as e:
                logger.error(f"Payment 생성 중 오류: {e}", exc_info=True)
                return Response({"error": "결제 정보 생성 중 오류가 발생했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "message": "결제 요청이 성공적으로 생성되었습니다.",
                "data": {
                    "paymentId": payment.id,
                    "orderId": order_id,
                    "amount": amount,
                    "merchantUid": order_id_for_toss
                }
            })

        except Exception as e:
            logger.error(f"토스 페이먼츠 요청 생성 오류: {e}", exc_info=True)
            return Response({"error": "결제 요청 생성 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnpaidOrdersView(UserValidationMixin, APIView):
    """미결제 주문 목록 조회 API"""

    def get(self, request):
        try:
            business_id = request.GET.get("businessId")
            from_date = request.GET.get("from")
            to_date = request.GET.get("to")

            user_filter = get_user_queryset_filter(request)
            orders_query = Order.objects.filter(**user_filter)
            orders_query = orders_query.exclude(payment__payment_status="paid").distinct()

            if business_id:
                orders_query = orders_query.filter(business_id=business_id)
            if from_date:
                orders_query = orders_query.filter(order_datetime__gte=from_date)
            if to_date:
                orders_query = orders_query.filter(order_datetime__lte=to_date)

            unpaid_orders = []
            for order in orders_query.select_related("business"):
                unpaid_orders.append({
                    "orderId": order.id,
                    "businessId": order.business_id,
                    "businessName": order.business.business_name if order.business else None,
                    "unpaidAmount": order.total_price,
                    "orderStatus": getattr(order, "order_status", None) or getattr(order, "status", None),
                    "orderDatetime": order.order_datetime.isoformat(),
                    "deliveryDatetime": getattr(order, "delivery_datetime", None).isoformat()
                        if getattr(order, "delivery_datetime", None) else None
                })

            return Response(unpaid_orders)

        except Exception as e:
            logger.error(f"미결제 주문 조회 오류: {e}", exc_info=True)
            return Response({"error": "미결제 주문 조회 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ARSummaryView(UserValidationMixin, APIView):
    """미수금 요약 조회 API"""

    def get(self, request):
        try:
            user_filter = get_user_queryset_filter(request)
            from business.models import Business

            summary_data = (
                Order.objects
                .filter(**user_filter)
                .exclude(payment__payment_status="paid")
                .values("business_id")
                .annotate(
                    unpaidTotal=Sum("total_price"),
                    unpaidOrders=Count("id")
                )
                .order_by("-unpaidTotal")
            )

            summary_list = []
            for item in summary_data:
                business_id = item["business_id"]
                business_name = "알 수 없는 거래처"
                if business_id:
                    try:
                        business = Business.objects.get(id=business_id)
                        business_name = business.business_name
                    except Business.DoesNotExist:
                        pass
                summary_list.append({
                    "businessId": business_id,
                    "businessName": business_name,
                    "unpaidTotal": item["unpaidTotal"] or 0,
                    "unpaidOrders": item["unpaidOrders"] or 0
                })

            return Response(summary_list)

        except Exception as e:
            logger.error(f"미수금 요약 조회 오류: {e}", exc_info=True)
            return Response({"error": "미수금 요약 조회 중 오류가 발생했습니다."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
