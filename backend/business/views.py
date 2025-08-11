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
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import ListAPIView
from core.middleware import get_user_queryset_filter
import firebase_admin
from firebase_admin import auth

@api_view(['POST'])
@authentication_classes([])  # 인증 완전 비활성화
@permission_classes([AllowAny])
def register_user(request):
    """사용자 회원가입 API"""
    try:
        data = request.data
        
        # 필수 필드 검증
        required_fields = ['firebase_uid', 'business_name', 'owner_name', 'phone_number', 'address']
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


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_user_id_from_token(request):
    """Firebase 토큰으로 user_id 반환하는 API"""
    try:
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({
                'error': 'Authorization 헤더가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        token = auth_header.split(' ')[1]
        
        try:
            # Firebase 토큰 검증
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                return Response({
                    'error': '유효하지 않은 토큰입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # User 모델에서 firebase_uid로 사용자 찾기
            try:
                user = User.objects.get(firebase_uid=firebase_uid, status='approved')
                return Response({
                    'user_id': user.id,
                    'business_name': user.business_name,
                    'owner_name': user.owner_name
                })
            except User.DoesNotExist:
                return Response({
                    'error': '승인된 사용자를 찾을 수 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'error': '토큰 검증에 실패했습니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        print(f"❌ user_id 조회 오류: {e}")
        return Response({
            'error': 'user_id 조회 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BusinessCreateAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        print(f"🏢 Business 생성 요청 받음")
        print(f"📝 요청 데이터: {request.data}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        data = request.data.copy()
        
        serializer = BusinessSerializer(data=data)
        if serializer.is_valid():
            print(f"✅ Serializer 검증 통과")
            business = serializer.save(user_id=request.user_id)  # 미들웨어의 사용자 ID로 저장
            print(f"✅ Business 생성 성공: {business.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        print(f"❌ Serializer 검증 실패: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def get(self, request):
        # GET 요청은 미들웨어에서 제외되므로 직접 토큰에서 user_id 추출
        user_id = self._get_user_id_from_token(request)
        if not user_id:
            return Response({'error': '인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        businesses = Business.objects.filter(user_id=user_id)
        serializer = BusinessSerializer(businesses, many=True)
        return Response(serializer.data)
    
    def _get_user_id_from_token(self, request):
        """토큰에서 user_id 추출"""
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        
        try:
            # Firebase 토큰 검증
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                return None
                
            # User 모델에서 firebase_uid로 사용자 찾기
            try:
                user = User.objects.get(firebase_uid=firebase_uid, status='approved')
                return user.id
            except User.DoesNotExist:
                return None
                
        except Exception as e:
            return None
    
    def put(self, request, pk):
        try:
            # 미들웨어에서 설정된 user_id 사용
            business = Business.objects.get(id=pk, **get_user_queryset_filter(request))
            serializer = BusinessSerializer(business, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Business.DoesNotExist:
            return Response({'error': '거래처를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

class BusinessPagination(PageNumberPagination):
    page_size = 10  # 한 페이지에 10개 아이템
    page_size_query_param = 'page_size'  # 클라이언트에서 페이지 크기 조정 가능
    max_page_size = 50

class BusinessListAPIView(ListAPIView):
    serializer_class = BusinessSerializer
    pagination_class = BusinessPagination
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        # GET 요청은 미들웨어에서 제외되므로 직접 토큰에서 user_id 추출
        user_id = self._get_user_id_from_token(self.request)
        if not user_id:
            return Business.objects.none()  # 빈 QuerySet 반환
            
        return Business.objects.filter(user_id=user_id).order_by('-id')
    
    def _get_user_id_from_token(self, request):
        """토큰에서 user_id 추출"""
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        
        try:
            # Firebase 토큰 검증
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                return None
                
            # User 모델에서 firebase_uid로 사용자 찾기
            try:
                user = User.objects.get(firebase_uid=firebase_uid, status='approved')
                return user.id
            except User.DoesNotExist:
                return None
                
        except Exception as e:
            return None