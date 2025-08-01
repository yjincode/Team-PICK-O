from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
import requests
import logging

from .models import User, Business, FishType, Inventory, Order, Payment
from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer,
    BusinessSerializer,
    FishTypeSerializer,
    InventorySerializer,
    OrderSerializer,
    PaymentSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()


def send_discord_notification(user_data):
    """Discord 웹훅으로 신규 가입 알림 전송"""
    webhook_url = getattr(settings, 'DISCORD_WEBHOOK_URL', None)
    
    if not webhook_url:
        logger.warning("Discord webhook URL이 설정되지 않았습니다.")
        return False
        
    embed = {
        "title": "🆕 신규 회원가입 요청",
        "color": 0x00ff00,
        "fields": [
            {"name": "사업장명", "value": user_data.get('business_name', 'N/A'), "inline": True},
            {"name": "대표자명", "value": user_data.get('owner_name', 'N/A'), "inline": True}, 
            {"name": "전화번호", "value": user_data.get('phone_number', 'N/A'), "inline": True},
            {"name": "주소", "value": user_data.get('address', 'N/A'), "inline": False},
            {"name": "사업자등록번호", "value": user_data.get('business_registration_number', 'N/A'), "inline": True},
            {"name": "구독플랜", "value": user_data.get('subscription_plan', 'basic'), "inline": True},
        ],
        "footer": {"text": "승인이 필요한 회원입니다."},
        "timestamp": timezone.now().isoformat()
    }
    
    payload = {
        "embeds": [embed]
    }
    
    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info("Discord 알림 전송 성공")
        return True
    except requests.RequestException as e:
        logger.error(f"Discord 알림 전송 실패: {e}")
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    사용자 등록 API
    Firebase 인증 후 상세 정보를 받아 사용자를 등록합니다.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        # 사용자 생성 (기본적으로 pending 상태)
        user = serializer.save()
        
        # Discord 알림 전송
        send_discord_notification(serializer.validated_data)
        
        # 응답 데이터 준비
        response_serializer = UserSerializer(user)
        
        return Response({
            'message': '회원가입 요청이 성공적으로 접수되었습니다. 승인까지 잠시만 기다려주세요.',
            'user': response_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_user_status(request):
    """
    Firebase UID로 사용자 상태 확인
    """
    firebase_uid = request.GET.get('firebase_uid')
    
    if not firebase_uid:
        return Response({
            'error': 'firebase_uid 파라미터가 필요합니다.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(firebase_uid=firebase_uid)
        serializer = UserSerializer(user)
        
        return Response({
            'exists': True,
            'user': serializer.data
        })
    except User.DoesNotExist:
        return Response({
            'exists': False,
            'message': '등록되지 않은 사용자입니다.'
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def pending_users(request):
    """
    승인 대기 중인 사용자 목록 (개발/테스트용)
    """
    users = User.objects.filter(status='pending').order_by('-created_at')
    serializer = UserSerializer(users, many=True)
    
    return Response({
        'count': users.count(),
        'users': serializer.data
    })


class BusinessListCreateView(generics.ListCreateAPIView):
    """거래처 목록 조회 및 생성"""
    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Business.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FishTypeListCreateView(generics.ListCreateAPIView):
    """어종 목록 조회 및 생성"""
    serializer_class = FishTypeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FishType.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InventoryListCreateView(generics.ListCreateAPIView):
    """재고 목록 조회 및 생성"""
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Inventory.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderListCreateView(generics.ListCreateAPIView):
    """주문 목록 조회 및 생성"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PaymentListCreateView(generics.ListCreateAPIView):
    """결제 목록 조회 및 생성"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)