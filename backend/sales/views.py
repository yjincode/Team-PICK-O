import json
from datetime import datetime, timedelta
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth, TruncYear, TruncDate
from core.middleware import get_user_queryset_filter
from order.models import Order
from decimal import Decimal


@method_decorator(csrf_exempt, name='dispatch')
class SalesStatsView(View):
    """매출 통계 API - JWT 미들웨어 인증"""
    
    def get(self, request):
        """매출 통계 조회"""
        print(f"📊 매출 통계 조회 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        try:
            # 쿼리 파라미터 가져오기
            period_type = request.GET.get('period_type', 'month')  # 'month' 또는 'year'
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')
            
            print(f"📝 매개변수: period_type={period_type}, start_date={start_date}, end_date={end_date}")
            
            # 기본 날짜 범위 설정
            if not end_date:
                end_date = datetime.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                
            if not start_date:
                if period_type == 'month':
                    # 최근 12개월
                    start_date = (end_date.replace(day=1) - timedelta(days=365)).replace(day=1)
                else:
                    # 최근 5년
                    start_date = end_date.replace(year=end_date.year - 5, month=1, day=1)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            print(f"📅 실제 날짜 범위: {start_date} ~ {end_date}")
            
            # 사용자의 결제 완료된 주문만 필터링
            orders_queryset = Order.objects.filter(
                **get_user_queryset_filter(request),
                order_status__in=['delivered', 'completed'],  # 결제 완료된 상태
                order_datetime__date__gte=start_date,
                order_datetime__date__lte=end_date
            )
            
            print(f"🔍 필터링된 주문 수: {orders_queryset.count()}")
            
            # 총 매출 계산
            total_revenue = orders_queryset.aggregate(
                total=Sum('total_price')
            )['total'] or Decimal('0')
            
            # 특정 기간 선택 여부에 따른 계산 분기
            selectedPeriod = request.GET.get('selected_period')
            if selectedPeriod:
                if period_type == 'month':
                    # 선택된 월의 통계
                    year, month = selectedPeriod.split('-')
                    month_start = datetime(int(year), int(month), 1).date()
                    if int(month) == 12:
                        month_end = datetime(int(year) + 1, 1, 1).date() - timedelta(days=1)
                    else:
                        month_end = datetime(int(year), int(month) + 1, 1).date() - timedelta(days=1)
                    
                    # 해당 월의 일별 데이터
                    daily_data = orders_queryset.filter(
                        order_datetime__date__gte=month_start,
                        order_datetime__date__lte=month_end
                    ).annotate(
                        day=TruncDate('order_datetime')
                    ).values('day').annotate(
                        revenue=Sum('total_price'),
                        order_count=Count('id')
                    ).order_by('day')
                    
                    # 일평균 매출
                    days_in_month = (month_end - month_start).days + 1
                    daily_average = float(total_revenue) / days_in_month if days_in_month > 0 else 0
                    
                    # 최고 매출일
                    highest_day = daily_data.order_by('-revenue').first()
                    highest_period = highest_day['day'].strftime('%m월 %d일') if highest_day else '데이터 없음'
                    
                    # 지난달 매출과 비교하여 성장률 계산
                    prev_month = int(month) - 1 if int(month) > 1 else 12
                    prev_year = int(year) if int(month) > 1 else int(year) - 1
                    prev_month_start = datetime(prev_year, prev_month, 1).date()
                    if prev_month == 12:
                        prev_month_end = datetime(prev_year + 1, 1, 1).date() - timedelta(days=1)
                    else:
                        prev_month_end = datetime(prev_year, prev_month + 1, 1).date() - timedelta(days=1)
                    
                    prev_month_revenue = Order.objects.filter(
                        **get_user_queryset_filter(request),
                        order_status__in=['delivered', 'completed'],
                        order_datetime__date__gte=prev_month_start,
                        order_datetime__date__lte=prev_month_end
                    ).aggregate(total=Sum('total_price'))['total'] or Decimal('0')
                    
                    growth_rate = 0
                    if prev_month_revenue > 0:
                        growth_rate = ((total_revenue - prev_month_revenue) / prev_month_revenue) * 100
                    
                    formatted_data = []
                    for item in daily_data:
                        day_str = item['day'].strftime('%m월 %d일')
                        formatted_data.append({
                            'month': day_str,
                            'revenue': float(item['revenue'] or 0),
                            'order_count': item['order_count']
                        })
                    
                else:  # year
                    # 선택된 년도의 통계
                    year = int(selectedPeriod)
                    year_start = datetime(year, 1, 1).date()
                    year_end = datetime(year, 12, 31).date()
                    
                    # 해당 년도의 월별 데이터
                    monthly_data = orders_queryset.filter(
                        order_datetime__date__gte=year_start,
                        order_datetime__date__lte=year_end
                    ).annotate(
                        month=TruncMonth('order_datetime')
                    ).values('month').annotate(
                        revenue=Sum('total_price'),
                        order_count=Count('id')
                    ).order_by('month')
                    
                    # 월평균 매출
                    daily_average = float(total_revenue) / 12 if total_revenue > 0 else 0
                    
                    # 최고 매출월
                    highest_month = monthly_data.order_by('-revenue').first()
                    highest_period = highest_month['month'].strftime('%m월') if highest_month else '데이터 없음'
                    
                    # 지난해 매출과 비교하여 성장률 계산
                    prev_year_start = datetime(year - 1, 1, 1).date()
                    prev_year_end = datetime(year - 1, 12, 31).date()
                    
                    prev_year_revenue = Order.objects.filter(
                        **get_user_queryset_filter(request),
                        order_status__in=['delivered', 'completed'],
                        order_datetime__date__gte=prev_year_start,
                        order_datetime__date__lte=prev_year_end
                    ).aggregate(total=Sum('total_price'))['total'] or Decimal('0')
                    
                    growth_rate = 0
                    if prev_year_revenue > 0:
                        growth_rate = ((total_revenue - prev_year_revenue) / prev_year_revenue) * 100
                    
                    formatted_data = []
                    for item in monthly_data:
                        month_str = item['month'].strftime('%Y년 %m월')
                        formatted_data.append({
                            'month': month_str,
                            'revenue': float(item['revenue'] or 0),
                            'order_count': item['order_count']
                        })
                
                result = {
                    'total_revenue': float(total_revenue),
                    'daily_average': daily_average,  # 일평균 또는 월평균
                    'highest_period': highest_period,  # 최고 매출일 또는 월
                    'growth_rate': round(growth_rate, 1),
                    'monthly_data': formatted_data,
                    'period_type': period_type,
                    'selected_period': selectedPeriod
                }
                
            else:
                # 기본 범위 조회 (기존 로직)
                if period_type == 'month':
                    # 월별 데이터
                    monthly_data = orders_queryset.annotate(
                        period=TruncMonth('order_datetime')
                    ).values('period').annotate(
                        revenue=Sum('total_price'),
                        order_count=Count('id')
                    ).order_by('period')
                    
                    # 월 이름 형식으로 변환
                    formatted_data = []
                    for item in monthly_data:
                        month_str = item['period'].strftime('%Y년 %m월')
                        formatted_data.append({
                            'month': month_str,
                            'revenue': float(item['revenue'] or 0),
                            'order_count': item['order_count']
                        })
                else:
                    # 연도별 데이터
                    yearly_data = orders_queryset.annotate(
                        period=TruncYear('order_datetime')
                    ).values('period').annotate(
                        revenue=Sum('total_price'),
                        order_count=Count('id')
                    ).order_by('period')
                    
                    # 연도 형식으로 변환
                    formatted_data = []
                    for item in yearly_data:
                        year_str = item['period'].strftime('%Y년')
                        formatted_data.append({
                            'month': year_str,  # 프론트엔드 호환성을 위해 'month' 키 사용
                            'revenue': float(item['revenue'] or 0),
                            'order_count': item['order_count']
                        })
            
            # 월평균 매출 계산
            months_count = len(formatted_data) if formatted_data else 1
            monthly_average = float(total_revenue) / months_count
            
            # 최고 매출 계산
            highest_month_revenue = max([item['revenue'] for item in formatted_data]) if formatted_data else 0
            
            # 성장률 계산 (최근 2개 기간 비교)
            growth_rate = 0
            if len(formatted_data) >= 2:
                recent_revenue = formatted_data[-1]['revenue']
                previous_revenue = formatted_data[-2]['revenue']
                if previous_revenue > 0:
                    growth_rate = ((recent_revenue - previous_revenue) / previous_revenue) * 100
            
            result = {
                'total_revenue': float(total_revenue),
                'monthly_average': monthly_average,
                'highest_month_revenue': highest_month_revenue,
                'growth_rate': round(growth_rate, 1),
                'monthly_data': formatted_data
            }
            
            print(f"✅ 매출 통계 계산 완료: 총 매출={total_revenue}, 데이터 수={len(formatted_data)}")
            
            return JsonResponse(result)
            
        except Exception as e:
            print(f"❌ 매출 통계 조회 오류: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'매출 통계 조회 중 오류가 발생했습니다: {str(e)}'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class DailySalesView(View):
    """일별 매출 조회 API - JWT 미들웨어 인증"""
    
    def get(self, request):
        """특정 날짜의 매출 조회"""
        print(f"📅 일별 매출 조회 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        try:
            # 날짜 파라미터 가져오기
            date_str = request.GET.get('date')
            if not date_str:
                return JsonResponse({'error': 'date 파라미터가 필요합니다.'}, status=400)
            
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({'error': '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)'}, status=400)
            
            print(f"📅 조회 대상 날짜: {target_date}")
            
            # 해당 날짜의 결제 완료된 주문들 조회
            daily_orders = Order.objects.filter(
                **get_user_queryset_filter(request),
                order_status__in=['delivered', 'completed'],  # 결제 완료된 상태
                order_datetime__date=target_date
            ).select_related('business').order_by('-order_datetime')
            
            print(f"🔍 해당 날짜 주문 수: {daily_orders.count()}")
            
            # 총 매출 및 주문 수 계산
            total_revenue = daily_orders.aggregate(
                total=Sum('total_price')
            )['total'] or Decimal('0')
            
            order_count = daily_orders.count()
            
            # 시간대별 매출 데이터
            hourly_data = daily_orders.annotate(
                hour=Extract('order_datetime', 'hour')
            ).values('hour').annotate(
                revenue=Sum('total_price'),
                order_count=Count('id')
            ).order_by('hour')
            
            hourly_stats = []
            for item in hourly_data:
                hourly_stats.append({
                    'hour': item['hour'],
                    'revenue': float(item['revenue'] or 0),
                    'order_count': item['order_count']
                })
            
            # 어종별 매출 및 수량 통계
            from django.db.models import F, Extract
            from order.models import OrderItem
            fish_stats = OrderItem.objects.filter(
                order__in=daily_orders
            ).select_related('fish_type').values(
                'fish_type__name'
            ).annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum(F('quantity') * F('unit_price'))
            ).order_by('-total_revenue')
            
            total_fish_revenue = sum(item['total_revenue'] for item in fish_stats if item['total_revenue'])
            
            top_fish_types = []
            for item in fish_stats[:5]:  # 상위 5개 어종
                revenue = float(item['total_revenue'] or 0)
                percentage = (revenue / total_fish_revenue * 100) if total_fish_revenue > 0 else 0
                top_fish_types.append({
                    'fish_name': item['fish_type__name'],
                    'quantity': item['total_quantity'],
                    'revenue': revenue,
                    'percentage': round(percentage, 1)
                })
            
            # 주문 세부 정보
            orders_detail = []
            for order in daily_orders:
                orders_detail.append({
                    'id': order.id,
                    'business_name': order.business.business_name if order.business else '미확인',
                    'total_price': float(order.total_price),
                    'order_datetime': order.order_datetime.isoformat()
                })
            
            result = {
                'date': target_date.isoformat(),
                'total_revenue': float(total_revenue),
                'order_count': order_count,
                'orders': orders_detail,
                'hourly_data': hourly_stats,
                'top_fish_types': top_fish_types
            }
            
            print(f"✅ 일별 매출 조회 완료: {target_date}, 매출={total_revenue}, 주문수={order_count}")
            
            return JsonResponse(result)
            
        except Exception as e:
            print(f"❌ 일별 매출 조회 오류: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'일별 매출 조회 중 오류가 발생했습니다: {str(e)}'}, status=500)