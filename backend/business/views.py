from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import requests
import json
from datetime import datetime
from .models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Business
from .serializers import BusinessSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated

@api_view(['POST'])
@authentication_classes([])  # 인증 완전 비활성화
@permission_classes([AllowAny])
def register_user(request):
    """사용자 회원가입 API"""
    try:
        data = request.data
        
        # 필수 필드 검증
        required_fields = ['firebase_uid', 'business_name', 'owner_name', 'phone_number', 'address', 'business_registration_number']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    'error': f'{field} 필드가 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 이미 존재하는 사용자 확인
        if User.objects.filter(firebase_uid=data['firebase_uid']).exists():
            return Response({
                'error': '이미 등록된 사용자입니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 사용자 생성
        user = User.objects.create(
            username=data['firebase_uid'],  # username은 unique해야 하므로 firebase_uid 사용
            firebase_uid=data['firebase_uid'],
            business_name=data['business_name'],
            owner_name=data['owner_name'],
            phone_number=data['phone_number'],
            address=data['address'],
            business_registration_number=data['business_registration_number'],
            subscription_plan=data.get('subscription_plan', 'basic'),
            status='approved'
        )
        
        # Discord 웹훅 전송
        send_discord_notification(user)
        
        return Response({
            'message': '회원가입 신청이 완료되었습니다.',
            'user': {
                'id': user.id,
                'firebase_uid': user.firebase_uid,
                'business_name': user.business_name,
                'owner_name': user.owner_name,
                'phone_number': user.phone_number,
                'address': user.address,
                'business_registration_number': user.business_registration_number,
                'subscription_plan': user.subscription_plan,
                'status': user.status,
                'created_at': user.created_at
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"❌ 회원가입 처리 오류: {e}")
        return Response({
            'error': '회원가입 처리 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([])  # 인증 완전 비활성화
@permission_classes([AllowAny])
def check_user_status(request):
    """사용자 상태 확인 API"""
    try:
        firebase_uid = request.GET.get('firebase_uid')
        
        if not firebase_uid:
            return Response({
                'error': 'firebase_uid 파라미터가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(firebase_uid=firebase_uid)
            return Response({
                'exists': True,
                'user': {
                    'id': user.id,
                    'firebase_uid': user.firebase_uid,
                    'business_name': user.business_name,
                    'owner_name': user.owner_name,
                    'phone_number': user.phone_number,
                    'address': user.address,
                    'business_registration_number': user.business_registration_number,
                    'subscription_plan': user.subscription_plan,
                    'status': user.status,
                    'created_at': user.created_at
                }
            })
        except User.DoesNotExist:
            return Response({
                'exists': False,
                'user': None
            })
            
    except Exception as e:
        print(f"❌ 사용자 상태 확인 오류: {e}")
        return Response({
            'error': '사용자 상태 확인 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_discord_notification(user):
    """Discord 웹훅으로 회원가입 신청 알림 전송"""
    webhook_url = settings.DISCORD_WEBHOOK_URL
    
    if not webhook_url:
        print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
        return
    
    embed = {
        "title": "🐟 새로운 회원가입 신청",
        "color": 0x3498db,
        "description": "새로운 사용자가 회원가입을 신청했습니다. 데이터베이스에서 수동으로 승인 처리해주세요.",
        "fields": [
            {"name": "🏢 사업장명", "value": user.business_name, "inline": True},
            {"name": "👤 대표자명", "value": user.owner_name, "inline": True},
            {"name": "📱 전화번호", "value": user.phone_number, "inline": True},
            {"name": "📍 주소", "value": user.address, "inline": False},
            {"name": "🏭 사업자등록번호", "value": user.business_registration_number, "inline": True},
            {"name": "💳 구독 플랜", "value": user.subscription_plan, "inline": True},
            {"name": "🆔 Firebase UID", "value": user.firebase_uid, "inline": False},
            {"name": "📅 신청 시간", "value": user.created_at.strftime("%Y-%m-%d %H:%M:%S"), "inline": True},
        ],
        "footer": {
            "text": "승인하려면 DB에서 status를 'approved'로 변경하세요"
        },
        "timestamp": datetime.now().isoformat()
    }
    
    payload = {
        "content": "🔔 **회원가입 승인 요청**",
        "embeds": [embed]
    }
    
    try:
        response = requests.post(webhook_url, json=payload)
        if response.status_code == 204:
            print("✅ Discord 회원가입 알림 전송 성공")
        else:
            print(f"❌ Discord 알림 전송 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ Discord 알림 전송 오류: {e}")


class BusinessCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # 인증된 사용자만 접근 가능
        data = request.data.copy()
        
        # 보안: 인증된 사용자의 ID를 강제로 설정
        data['user'] = request.user.id
        
        serializer = BusinessSerializer(data=data)
        if serializer.is_valid():
            business = serializer.save(user=request.user)  # 인증된 사용자로 저장
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def get(self, request):
        businesses = Business.objects.all()
        serializer = BusinessSerializer(businesses, many=True)
        return Response(serializer.data)

class BusinessListAPIView(APIView):
    permission_classes = [AllowAny]  # 인증 제거 - 프론트엔드에서 Context로 관리

    def get(self, request):
        businesses = Business.objects.all()
        serializer = BusinessSerializer(businesses, many=True)
        return Response(serializer.data)