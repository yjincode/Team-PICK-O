from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
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
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
import firebase_admin
from firebase_admin import auth
from core.jwt_utils import generate_token_pair, verify_refresh_token, generate_access_token
from django.db.models import Sum, Count
from order.models import Order
from inventory.models import Inventory
from datetime import datetime, date
from rest_framework import generics
from order.models import Order


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
        
        # Firebase 토큰 처리
        firebase_token = data['firebase_token']
        
        try:
            # Firebase 토큰 검증
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
        try:
            send_discord_notification(user)
        except Exception as discord_error:
            print(f"⚠️ Discord 알림 전송 실패: {discord_error}")
            # Discord 오류는 회원가입을 막지 않음
        
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
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'회원가입 처리 중 오류가 발생했습니다: {str(e)}'
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
    print(f"🔍 Firebase-to-JWT 교환 요청 시작")
    print(f"📱 요청 데이터: {request.data}")
    print(f"🔑 Firebase 토큰 길이: {len(request.data.get('firebase_token', '')) if request.data.get('firebase_token') else 'None'}")
    
    try:
        firebase_token = request.data.get('firebase_token')
        
        if not firebase_token:
            return Response({
                'error': 'firebase_token이 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Firebase Admin SDK 상태 확인
            import firebase_admin
            print(f"🔥 Firebase Admin SDK 상태: {bool(firebase_admin._apps)}")
            print(f"🔥 Firebase Admin Apps: {firebase_admin._apps}")
            
            # Firebase 토큰 검증을 비동기로 처리하고 타임아웃 설정
            import asyncio
            import concurrent.futures
            
            def verify_firebase_token(token):
                print(f"🔐 Firebase 토큰 검증 시작: {token[:20]}...")
                try:
                    # 기본 검증 시도
                    print("🔐 Firebase Admin SDK로 토큰 검증 시도...")
                    result = auth.verify_id_token(token, check_revoked=False)
                    print(f"✅ Firebase 토큰 검증 성공: {result}")
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
                    print(f"❌ Firebase 토큰 검증 실패: {str(e)}")
                    print(f"❌ 에러 타입: {type(e).__name__}")
                    return Response({
                        'error': f'Firebase 토큰 검증 실패: {str(e)}'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            
            firebase_uid = decoded_token.get('uid')
            
            if not firebase_uid:
                return Response({
                    'error': '유효하지 않은 Firebase 토큰입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 사용자 존재 여부 확인
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


@method_decorator(csrf_exempt, name='dispatch')
class BusinessCreateView(View):
    """Django 기본 View 사용 - REST Framework 권한 검증 완전 우회"""
    
    def post(self, request):
        print(f"🏢 Business 생성 요청 받음 (Django View)")
        print(f"📝 요청 데이터: {request.POST}")
        print(f"📝 JSON 데이터: {request.body}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 JSON 데이터 파싱
        try:
            import json
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            print(f"📋 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        serializer = BusinessSerializer(data=data)
        if serializer.is_valid():
            print(f"✅ Serializer 검증 통과")
            business = serializer.save(user_id=request.user_id)  # 미들웨어의 사용자 ID로 저장
            print(f"✅ Business 생성 성공: {business.id}")
            return JsonResponse(serializer.data, status=201)
        
        print(f"❌ Serializer 검증 실패: {serializer.errors}")
        return JsonResponse(serializer.errors, status=400)
        
    def get(self, request):
        # 미들웨어에서 설정된 user_id 사용 (GET 요청도 JWT 인증 적용)
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        businesses = Business.objects.filter(user_id=request.user_id)
        serializer = BusinessSerializer(businesses, many=True)
        return JsonResponse(serializer.data, safe=False)
    
    def put(self, request, pk):
        try:
            # 미들웨어에서 설정된 user_id 사용
            business = Business.objects.get(id=pk, **get_user_queryset_filter(request))
            
            # Django View에서 JSON 데이터 파싱
            try:
                import json
                if request.content_type == 'application/json':
                    data = json.loads(request.body)
                else:
                    data = request.POST.dict()
            except json.JSONDecodeError as e:
                return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
            
            serializer = BusinessSerializer(business, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return JsonResponse(serializer.data, status=200)
            return JsonResponse(serializer.errors, status=400)
        except Business.DoesNotExist:
            return JsonResponse({'error': '거래처를 찾을 수 없습니다.'}, status=404)

class BusinessPagination(PageNumberPagination):
    page_size = 10  # 한 페이지에 10개 아이템
    page_size_query_param = 'page_size'  # 클라이언트에서 페이지 크기 조정 가능
    max_page_size = 50

class BusinessListAPIView(ListAPIView):
    serializer_class = BusinessSerializer
    pagination_class = BusinessPagination
    
    def get_queryset(self):
        # 미들웨어에서 설정된 user_id 사용 (JWT 미들웨어 인증 필요)
        if not hasattr(self.request, 'user_id') or not self.request.user_id:
            raise PermissionDenied('사용자 인증이 필요합니다.')
        return Business.objects.filter(user_id=self.request.user_id).order_by('-id')

class BusinessDetailAPIView(generics.RetrieveAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = BusinessSerializer
    permission_classes = [AllowAny]  # 권한 검사 비활성화 (JWT 미들웨어에서 처리)
    authentication_classes = []      # DRF 인증 비활성화 (JWT 미들웨어에서 처리)
    
    def get_queryset(self):
        # 디버깅 로그 추가
        print(f"🔍 BusinessDetailAPIView - request.user_id: {getattr(self.request, 'user_id', 'NOT SET')}")
        print(f"🔍 BusinessDetailAPIView - Authorization header: {self.request.headers.get('Authorization', 'NOT SET')}")
        print(f"🔍 BusinessDetailAPIView - HTTP method: {self.request.method}")
        
        # 미들웨어에서 설정된 user_id 사용 (JWT 미들웨어 인증 필요)
        if not hasattr(self.request, 'user_id') or not self.request.user_id:
            print(f"❌ BusinessDetailAPIView - 사용자 인증 실패")
            raise PermissionDenied('사용자 인증이 필요합니다.')
        
        print(f"✅ BusinessDetailAPIView - 사용자 인증 성공: user_id={self.request.user_id}")
        return Business.objects.filter(user_id=self.request.user_id)
    
    def destroy(self, request, *args, **kwargs):
        print(f"🗑️ BusinessDetailAPIView.destroy 호출됨")
        print(f"🔍 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        print(f"🔍 Authorization header: {request.headers.get('Authorization', 'NOT SET')}")
        
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                print(f"❌ destroy - 사용자 인증 실패")
                raise PermissionDenied('사용자 인증이 필요합니다.')
            
            business = self.get_object()
            print(f"✅ destroy - 거래처 조회 성공: business_id={business.id}")
            
            # 연관된 주문이 있는지 확인
            related_orders = Order.objects.filter(business_id=business.id).exists()
            if related_orders:
                print(f"⚠️ destroy - 연관된 주문 있음")
                return Response({
                    'error': '연관된 주문이 있어 삭제할 수 없습니다. 주문을 먼저 삭제해주세요.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"🗑️ destroy - 거래처 삭제 실행")
            business.delete()
            print(f"✅ destroy - 거래처 삭제 완료")
            return Response({'message': '거래처가 성공적으로 삭제되었습니다.'}, status=status.HTTP_204_NO_CONTENT)
            
        except Business.DoesNotExist:
            print(f"❌ destroy - 거래처 없음")
            return Response({'error': '거래처를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as e:
            print(f"❌ destroy - 권한 없음: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            print(f"❌ destroy - 예외 발생: {str(e)}")
            return Response({'error': f'삭제 중 오류가 발생했습니다: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def unpaid_orders_view(request, business_id):
    orders = get_unpaid_orders(business_id)  # DB 조회
    data = list(orders.values())
    return JsonResponse({"orders": data})