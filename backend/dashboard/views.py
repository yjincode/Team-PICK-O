from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models import Sum, Count
from datetime import datetime, date
from order.models import Order
from inventory.models import Inventory
from business.models import Business
from .weather_service import WeatherService


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_dashboard_stats(request):
    """관리자 대시보드 통계 (추후 구현)"""
    return Response({
        "message": "관리자 대시보드 API는 추후 구현될 예정입니다.",
        "total_analyses": 0,
        "total_users": 0,
        "recent_activity": []
    })


class DashboardStatsView(APIView):
    """대시보드 통계 정보 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                return Response({'error': '사용자 인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_id = request.user_id
            today = date.today()
            
            # 1. 오늘 주문 건수
            today_orders = Order.objects.filter(
                user_id=user_id,
                order_datetime__date=today
            ).count()
            
            # 2. 재고 부족 어종 수 계산 (재고수량 <= 10)
            low_stock_count = Inventory.objects.filter(
                user_id=user_id,
                stock_quantity__lte=10
            ).count()
            
            # 3. 전체 미수금 합계 (각 거래처별로 계산해서 합산)
            businesses = Business.objects.filter(user_id=user_id)
            total_outstanding = 0
            for business in businesses:
                total_outstanding += business.outstanding_balance
            
            # 4. 거래처 수
            business_count = Business.objects.filter(user_id=user_id).count()
            
            return Response({
                'todayOrders': today_orders,
                'lowStockCount': low_stock_count,
                'totalOutstandingBalance': float(total_outstanding),
                'businessCount': business_count
            })
            
        except Exception as e:
            return Response({
                'error': f'대시보드 통계 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardRecentOrdersView(APIView):
    """최근 주문 목록 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                return Response({'error': '사용자 인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_id = request.user_id
            limit = int(request.GET.get('limit', 10))
            
            # 최근 주문 조회 (business는 property이므로 select_related 사용 불가)
            recent_orders = Order.objects.filter(
                user_id=user_id
            ).prefetch_related('items__fish_type').order_by('-order_datetime')[:limit]
            
            # 주문 데이터 정리
            orders_data = []
            for order in recent_orders:
                # 주문 아이템들을 요약 (related_name이 'items'임)
                order_items = order.items.all()
                items_count = order_items.count()
                
                if items_count > 0:
                    first_item = order_items.first()
                    if items_count > 1:
                        items_summary = f"{first_item.fish_type.name} 외 {items_count-1}종"
                    else:
                        items_summary = first_item.fish_type.name
                else:
                    items_summary = "주문 품목 없음"
                
                orders_data.append({
                    'id': order.id,
                    'business_name': order.business.business_name if order.business else '거래처명 없음',
                    'items_summary': items_summary,
                    'total_price': float(order.total_price),
                    'order_status': order.order_status,
                    'order_datetime': order.order_datetime.isoformat()
                })
            
            return Response(orders_data)
            
        except Exception as e:
            return Response({
                'error': f'최근 주문 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardLowStockView(APIView):
    """재고 부족 어종 목록 조회"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # 미들웨어에서 설정된 user_id 사용
            if not hasattr(request, 'user_id') or not request.user_id:
                return Response({'error': '사용자 인증이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_id = request.user_id
            
            # 재고 부족 어종 조회 (재고수량 <= 10)
            low_stock_inventories = Inventory.objects.filter(
                user_id=user_id,
                stock_quantity__lte=10
            ).select_related('fish_type')
            
            stock_summary = []
            for inventory in low_stock_inventories:
                stock_summary.append({
                    'fish_name': inventory.fish_type.name,
                    'stock_quantity': inventory.stock_quantity,
                    'ordered_quantity': inventory.ordered_quantity,
                    'unit': inventory.unit,
                    'status': 'out_of_stock' if inventory.stock_quantity <= 0 else 'low'
                })
            
            return Response(stock_summary)
            
        except Exception as e:
            return Response({
                'error': f'재고 부족 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 기상청 날씨 및 경보 API 뷰들
@api_view(['GET'])
@permission_classes([])  # 인증 불필요
def weather_warnings(request):
    """
    현재 발효 중인 기상청 특보 정보를 반환합니다.
    
    Query Parameters:
        area: 지역명 (선택사항, 기본값: 전체)
    
    Returns:
        JSON 형태의 특보 정보 리스트
    """
    try:
        area = request.GET.get('area', None)
        
        weather_service = WeatherService()
        warnings = weather_service.get_current_warnings(area)
        
        # 프론트엔드 타입에 맞게 데이터 변환
        formatted_warnings = []
        for warning in warnings:
            formatted_warning = {
                'level': warning['level'],
                'type': warning['type'],
                'message': warning['message'],
                'area': warning['area'],
                'validTime': warning['validTime']
            }
            formatted_warnings.append(formatted_warning)
        
        return Response({
            'success': True,
            'data': formatted_warnings,
            'count': len(formatted_warnings)
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'data': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])  # 인증 불필요
def weather_forecast(request):
    """
    특정 지역의 기상청 단기 예보 정보를 반환합니다.
    
    Query Parameters:
        area: 지역명 (필수)
    
    Returns:
        JSON 형태의 예보 정보
    """
    try:
        area = request.GET.get('area', '서울')
        
        if not area:
            return Response({
                'success': False,
                'error': '지역명이 필요합니다.',
                'data': {}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        weather_service = WeatherService()
        forecast = weather_service.get_weather_forecast(area)
        
        if not forecast:
            return Response({
                'success': False,
                'error': '예보 정보를 가져올 수 없습니다.',
                'data': {}
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'success': True,
            'data': forecast
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'data': {}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])  # 인증 불필요
def weather_status(request):
    """
    날씨 서비스 상태를 확인합니다.
    
    Returns:
        JSON 형태의 서비스 상태 정보
    """
    try:
        weather_service = WeatherService()
        has_api_key = bool(weather_service.api_key)
        
        # 간단한 API 키 유효성 테스트
        test_warnings = []
        if has_api_key:
            try:
                test_warnings = weather_service.get_current_warnings('서울')
            except:
                pass
        
        return Response({
            'success': True,
            'data': {
                'api_key_configured': has_api_key,
                'service_status': 'active' if has_api_key else 'inactive',
                'test_warnings_count': len(test_warnings),
                'supported_areas': list(weather_service.city_coordinates.keys())
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'data': {}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)