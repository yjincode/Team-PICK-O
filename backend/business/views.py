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
from core.jwt_utils import generate_token_pair, verify_refresh_token, generate_access_token

@api_view(['POST'])
@authentication_classes([])  # 인증 완전 비활성화
@permission_classes([AllowAny])
def register_user(request):
    """사용자 회원가입 API"""
    try:
        data = request.data
        
        # 필수 필드 검증 (phone_number는 Firebase 토큰에서 추출하므로 제외)
        required_fields = ['firebase_token', 'business_name', 'owner_name', 'address']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    'error': f'{field} 필드가 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Firebase 토큰으로 사용자 정보 확인 및 생성
        try:
            # Firebase 토큰 검증
            firebase_token = data['firebase_token']
            decoded_token = auth.verify_id_token(firebase_token)
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                return Response({
                    'error': '유효하지 않은 Firebase 토큰입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 이미 존재하는 사용자인지 확인
            if User.objects.filter(firebase_uid=firebase_uid).exists():
                return Response({
                    'error': '이미 등록된 사용자입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Firebase 토큰에서 전화번호 추출
            phone_number = decoded_token.get('phone_number', '')
            if not phone_number:
                return Response({
                    'error': 'Firebase 토큰에서 전화번호를 찾을 수 없습니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            
            # 신규 사용자 생성
            user = User.objects.create(
                username=firebase_uid,
                firebase_uid=firebase_uid,
                business_name=data['business_name'],
                owner_name=data['owner_name'],
                phone_number=phone_number,  # Firebase 토큰에서 추출
                address=data['address'],
                status='approved'  # 즉시 승인
            )
            
        except Exception as e:
            return Response({
                'error': f'회원가입 처리 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Discord 웹훅 전송
        send_discord_notification(user)
        
        # 회원가입 완료 후 즉시 JWT 토큰 발급
        token_pair = generate_token_pair(user)
        
        if not token_pair:
            return Response({
                'error': 'JWT 토큰 생성에 실패했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': '회원가입이 완료되었습니다.',
            'user': {
                'id': user.id,
                'firebase_uid': user.firebase_uid,
                'business_name': user.business_name,
                'owner_name': user.owner_name,
                'phone_number': user.phone_number,
                'address': user.address,
                'status': user.status,
                'created_at': user.created_at
            },
            'access_token': token_pair['access_token'],
            'refresh_token': token_pair['refresh_token'],
            'token_type': 'Bearer',
            'access_expires_in': token_pair['access_expires_in'],
            'refresh_expires_in': token_pair['refresh_expires_in']
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


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def firebase_to_jwt_exchange(request):
    """
    Firebase 토큰을 자체 JWT 토큰으로 교환하는 API
    전화번호 인증 완료 후 한 번만 호출하여 빠른 JWT 토큰 획득
    """
    try:
        firebase_token = request.data.get('firebase_token')
        
        if not firebase_token:
            return Response({
                'error': 'firebase_token이 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Firebase 토큰 검증을 비동기로 처리하고 타임아웃 설정
            import asyncio
            import concurrent.futures
            
            def verify_firebase_token(token):
                try:
                    # 기본 검증 시도
                    result = auth.verify_id_token(token, check_revoked=False)
                    return result
                except Exception as e:
                    # 시간 오류인 경우 수동 토큰 파싱으로 대체
                    if "used too early" in str(e) or "clock" in str(e).lower():
                        try:
                            import jwt
                            
                            # JWT 토큰을 시간 검증 없이 디코딩
                            decoded = jwt.decode(token, options={"verify_signature": False, "verify_exp": False, "verify_iat": False})
                            
                            # Firebase 토큰인지 확인
                            if decoded.get('iss') and 'securetoken.google.com' in decoded.get('iss', ''):
                                if decoded.get('aud') == 'pick-o-main':  # 프로젝트 ID 확인
                                    return {
                                        'uid': decoded.get('user_id') or decoded.get('sub'),
                                        'phone_number': decoded.get('phone_number'),
                                        'firebase': decoded.get('firebase', {})
                                    }
                            
                            raise Exception("토큰 형식이 올바르지 않습니다")
                            
                        except Exception as retry_e:
                            raise retry_e
                    raise e
            
            # ThreadPoolExecutor를 사용하여 비동기 처리
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(verify_firebase_token, firebase_token)
                try:
                    # 10초 타임아웃 설정
                    decoded_token = future.result(timeout=10)
                except concurrent.futures.TimeoutError:
                    return Response({
                        'error': 'Firebase 토큰 검증 시간 초과. 다시 시도해주세요.'
                    }, status=status.HTTP_408_REQUEST_TIMEOUT)
                except Exception as e:
                    return Response({
                        'error': f'Firebase 토큰 검증 실패: {str(e)}'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                return Response({
                    'error': '유효하지 않은 Firebase 토큰입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # ✅ 사용자 존재 여부 확인
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                # 기존 사용자 - JWT 토큰 발급
                is_new_user = False
                token_pair = generate_token_pair(user)
                
                if not token_pair:
                    return Response({
                        'error': '토큰 생성에 실패했습니다.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                return Response({
                    'access_token': token_pair['access_token'],
                    'refresh_token': token_pair['refresh_token'],
                    'user_id': user.id,
                    'business_name': user.business_name,
                    'status': user.status,
                    'is_new_user': is_new_user,
                    'token_type': 'Bearer',
                    'access_expires_in': token_pair['access_expires_in'],
                    'refresh_expires_in': token_pair['refresh_expires_in'],
                    'message': 'JWT 토큰 발급 완료!'
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                # 신규 사용자 - 회원가입 단계로
                return Response({
                    'is_new_user': True,
                    'message': '신규 사용자입니다. 회원가입을 진행해주세요.'
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"❌ Firebase 토큰 검증 실패: {e}")
            return Response({
                'error': 'Firebase 토큰 검증에 실패했습니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        print(f"❌ Firebase-JWT 교환 오류: {e}")
        return Response({
            'error': '토큰 교환 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def refresh_access_token(request):
    """
    리프레시 토큰으로 새로운 액세스 토큰 발급
    쿠키에서 리프레시 토큰을 읽어와 새로운 액세스 토큰 생성
    """
    try:
        refresh_token = request.data.get('refresh_token')
        
        if not refresh_token:
            return Response({
                'error': 'refresh_token이 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 리프레시 토큰 검증
        payload = verify_refresh_token(refresh_token)
        
        if not payload:
            return Response({
                'error': '리프레시 토큰이 유효하지 않거나 만료되었습니다.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 사용자 조회
        user_id = payload.get('user_id')
        try:
            user = User.objects.get(id=user_id, status='approved')
        except User.DoesNotExist:
            return Response({
                'error': '사용자를 찾을 수 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 새로운 액세스 토큰 생성
        new_access_token = generate_access_token(user)
        
        if not new_access_token:
            return Response({
                'error': '새로운 액세스 토큰 생성에 실패했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        print(f"🔄 액세스 토큰 갱신 성공: user_id={user.id}")
        
        return Response({
            'access_token': new_access_token,
            'token_type': 'Bearer',
            'expires_in': 15 * 60,  # 15분
            'message': '액세스 토큰이 갱신되었습니다.'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ 액세스 토큰 갱신 오류: {e}")
        return Response({
            'error': '토큰 갱신 중 오류가 발생했습니다.'
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
        # 미들웨어에서 설정된 user_id 사용 (GET 요청도 JWT 인증 적용)
        businesses = Business.objects.filter(user_id=request.user_id)
        serializer = BusinessSerializer(businesses, many=True)
        return Response(serializer.data)
    
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
        # 미들웨어에서 설정된 user_id 사용
        return Business.objects.filter(user_id=self.request.user_id).order_by('-id')