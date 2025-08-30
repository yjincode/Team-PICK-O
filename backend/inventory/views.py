import json
from django.views import View
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Q
from core.middleware import get_user_queryset_filter
from .models import Inventory, InventoryLog, InventoryAnomaly, InventoryPattern
from .serializers import (
    InventorySerializer, InventoryLogSerializer, InventoryListSerializer,
    InventoryCreateSerializer, FishTypeSerializer, InventoryAnomalySerializer,
    InventoryPatternSerializer, AnomalySummarySerializer
)
from fish_registry.models import FishType
from business.models import User
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from django.utils import timezone
from .anomaly_service import InventoryAnomalyService
from .services import InventoryService
from django.http import StreamingHttpResponse
from django.core.serializers.json import DjangoJSONEncoder



@method_decorator(csrf_exempt, name='dispatch')
class InventoryListCreateView(View):
    """재고 목록 조회 및 생성 - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request):
        """재고 목록 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # 미들웨어에서 설정된 user_id 사용
        queryset = Inventory.objects.select_related('fish_type').filter(**get_user_queryset_filter(request))
        
        # 검색 기능
        search = request.GET.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(fish_type__name__icontains=search) |
                Q(status__icontains=search)
            )
        
        # 상태 필터
        status_filter = request.GET.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        queryset = queryset.order_by('-updated_at')
        
        inventory_data = []
        for inventory in queryset:
            # 시리얼라이저 데이터 생성
            inventory_serialized = InventoryListSerializer(inventory).data
            
            # 단순한 재고 정보만 추가
            inventory_serialized['ordered_quantity'] = inventory.ordered_quantity
            
            inventory_data.append(inventory_serialized)
        
        return JsonResponse(inventory_data, safe=False)
    
    def post(self, request):
        """재고 생성"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
        except json.JSONDecodeError as e:
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        serializer = InventoryCreateSerializer(data=data)
        if serializer.is_valid():
            try:
                from django.db import transaction
                with transaction.atomic():
                    # 기존 재고 확인
                    fish_type_id = serializer.validated_data.get('fish_type_id', data.get('fish_type_id'))
                    existing_inventory = Inventory.objects.filter(
                        fish_type_id=fish_type_id, 
                        user_id=request.user_id
                    ).first()
                    
                    # 기존 재고 수량 저장
                    old_quantity = existing_inventory.stock_quantity if existing_inventory else 0
                    added_quantity = serializer.validated_data['stock_quantity']
                    
                    inventory = serializer.save(user_id=request.user_id)
                    
                    # 재고 생성 로그 기록
                    user = User.objects.get(id=request.user_id)
                    
                    # 단가 정보 가져오기
                    unit_price = serializer.validated_data.get('unit_price')
                    total_amount = serializer.validated_data.get('total_amount')
                    
                    inventory_log, anomaly_detected = InventoryService.create_inventory_log(
                        inventory=inventory,
                        fish_type=inventory.fish_type,
                        change_type='in',
                        change_quantity=added_quantity,
                        source_type='manual',
                        unit_price=unit_price,
                        total_amount=total_amount,
                        updated_by=user
                    )
                
                inventory_data = InventoryListSerializer(inventory).data
                inventory_data['ordered_quantity'] = inventory.ordered_quantity
                return JsonResponse(inventory_data, status=201)
                
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"재고 추가 중 오류 발생: {e}", exc_info=True)
                return JsonResponse({'error': f'재고 추가 실패: {str(e)}'}, status=500)
        
        return JsonResponse(serializer.errors, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryDetailView(View):
    """재고 상세 조회, 수정, 삭제 - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request, pk):
        """재고 상세 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            inventory = Inventory.objects.select_related('fish_type').get(pk=pk, **get_user_queryset_filter(request))
            serializer = InventorySerializer(inventory)
            return JsonResponse(serializer.data)
        except Inventory.DoesNotExist:
            return JsonResponse({'error': '재고를 찾을 수 없습니다.'}, status=404)
    
    def put(self, request, pk):
        """재고 수정"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
        except json.JSONDecodeError as e:
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        try:
            inventory = Inventory.objects.select_related('fish_type').get(pk=pk, **get_user_queryset_filter(request))
            old_quantity = inventory.stock_quantity
            
            serializer = InventorySerializer(inventory, data=data, partial=True)
            if serializer.is_valid():
                inventory = serializer.save()
                
                # 수량이 변경된 경우 로그 기록
                new_quantity = inventory.stock_quantity
                if old_quantity != new_quantity:
                    change = new_quantity - old_quantity
                    log_type = 'in' if change > 0 else 'out'
                    
                    from business.models import User
                    user = User.objects.get(id=request.user_id)
                    
                    # InventoryService 사용하여 로그 생성 및 이상탐지

                    
                    # 단가 정보 가져오기
                    unit_price = data.get('unit_price')
                    total_amount = data.get('total_amount')
                    
                    inventory_log, anomaly_detected = InventoryService.create_inventory_log(
                        inventory=inventory,
                        fish_type=inventory.fish_type,
                        change_type=log_type,
                        change_quantity=abs(change),
                        source_type='manual',
                        unit_price=unit_price,
                        total_amount=total_amount,
                        updated_by=user
                    )
                    
                    if anomaly_detected:
                        pass
                
                # 단순한 재고 수정 응답
                inventory_data = serializer.data
                
                return JsonResponse(inventory_data)
            return JsonResponse(serializer.errors, status=400)
        except Inventory.DoesNotExist:
            return JsonResponse({'error': '재고를 찾을 수 없습니다.'}, status=404)
    
    def delete(self, request, pk):
        """재고 삭제"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            inventory = Inventory.objects.get(pk=pk, **get_user_queryset_filter(request))
            inventory.delete()
            return JsonResponse({'message': '재고가 삭제되었습니다.'}, status=204)
        except Inventory.DoesNotExist:
            return JsonResponse({'error': '재고를 찾을 수 없습니다.'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryLogListView(View):
    """재고 로그 목록 조회 - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request, inventory_id=None):
        """재고 로그 목록 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        if inventory_id:
            # 특정 재고에 대한 로그
            # 사용자 범위 내에서 재고 확인
            try:
                inventory = Inventory.objects.get(id=inventory_id, **get_user_queryset_filter(request))
                logs = InventoryLog.objects.filter(
                    inventory_id=inventory_id
                ).select_related('fish_type').order_by('-created_at')
            except Inventory.DoesNotExist:
                return JsonResponse({'error': '재고를 찾을 수 없습니다.'}, status=404)
        else:
            # 전체 로그 (사용자의 모든 재고)
            logs = InventoryLog.objects.filter(
                inventory__user_id=request.user_id
            ).select_related('fish_type', 'inventory').order_by('-created_at')
        
        serializer = InventoryLogSerializer(logs, many=True)
        return JsonResponse(serializer.data, safe=False)


@method_decorator(csrf_exempt, name='dispatch')
class FishTypeListView(View):
    """어종 목록 조회 (재고 추가 시 선택용) - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request):
        """어종 목록 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # 미들웨어에서 설정된 user_id 사용
        fish_types = FishType.objects.filter(**get_user_queryset_filter(request)).order_by('name')
        serializer = FishTypeSerializer(fish_types, many=True)
        return JsonResponse(serializer.data, safe=False)


@method_decorator(csrf_exempt, name='dispatch')
class StockCheckView(View):
    """주문 등록 시 재고 체크 - Django View 기반 JWT 미들웨어 인증"""
    
    def post(self, request):
        """주문 아이템들의 재고 상태 체크"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
        except json.JSONDecodeError as e:
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        order_items = data.get('order_items', [])
        if not order_items:
            return JsonResponse({'error': '주문 아이템이 필요합니다.'}, status=400)
        
        results = []
        warnings = []
        errors = []
        
        for item in order_items:
            fish_type_id = item.get('fish_type_id')
            quantity = item.get('quantity', 0)
            unit = item.get('unit', '')
            
            if not fish_type_id or quantity <= 0:
                continue
                
            try:
                # 단순한 재고수량 조회
                from django.db.models import Sum
                
                # 해당 어종의 재고수량 조회
                total_stock = Inventory.objects.filter(
                    fish_type_id=fish_type_id,
                    **get_user_queryset_filter(request)
                ).aggregate(total=Sum('stock_quantity'))['total'] or 0
                
                # 어종 정보 가져오기
                fish_type = FishType.objects.get(id=fish_type_id, **get_user_queryset_filter(request))
                
                item_result = {
                    'fish_type_id': fish_type_id,
                    'fish_name': fish_type.name,
                    'requested_quantity': quantity,
                    'current_stock': total_stock,
                    'unit': unit,
                    'status': 'ok'
                }
                
                # 재고 부족 체크 (재고수량 기준)
                if quantity > total_stock:
                    shortage = quantity - total_stock
                    item_result['status'] = 'insufficient'
                    item_result['shortage'] = shortage
                    
                    # 소수점 제거를 위한 포맷팅
                    quantity_str = f"{quantity:g}"
                    total_stock_str = f"{total_stock:g}"
                    shortage_str = f"{shortage:g}"
                    
                    warning_msg = f"🚨 {fish_type.name}: {quantity_str}{unit} 주문시 남은재고 {total_stock:g}{unit} (부족: {shortage_str}{unit})"
                    warnings.append(warning_msg)
                    errors.append({
                        'fish_name': fish_type.name,
                        'message': f'🚨 재고 부족! {quantity_str}{unit} 주문시 남은재고 {total_stock:g}{unit}',
                        'shortage': shortage
                    })
                elif total_stock == 0:
                    item_result['status'] = 'out_of_stock'
                    quantity_str = f"{quantity:g}"
                    warning_msg = f"❌ {fish_type.name}: {quantity_str}{unit} 주문시 재고 없음 (품절)"
                    warnings.append(warning_msg)
                    errors.append({
                        'fish_name': fish_type.name,
                        'message': f'❌ 품절! {quantity_str}{unit} 주문 불가 (재고 없음)',
                        'shortage': quantity
                    })
                elif quantity > total_stock * 0.8:  # 재고의 80% 이상 주문 시 경고
                    item_result['status'] = 'warning'
                    quantity_str = f"{quantity:g}"
                    remaining_stock = total_stock - quantity
                    warning_msg = f"⚠️ {fish_type.name}: {quantity_str}{unit} 주문시 남은재고 {remaining_stock:g}{unit} (재고 부족 주의)"
                    warnings.append(warning_msg)
                
                results.append(item_result)
                
            except FishType.DoesNotExist:
                error_msg = f"어종 ID {fish_type_id}를 찾을 수 없습니다"
                errors.append({
                    'fish_type_id': fish_type_id,
                    'message': error_msg
                })
            except Exception as e:
                error_msg = f"어종 ID {fish_type_id} 처리 중 오류: {str(e)}"
                errors.append({
                    'fish_type_id': fish_type_id,
                    'message': error_msg
                })
        
        # 전체 상태 결정
        overall_status = 'ok'
        if errors:
            overall_status = 'error'
        elif any(item['status'] in ['insufficient', 'out_of_stock'] for item in results):
            overall_status = 'insufficient'
        elif any(item['status'] == 'warning' for item in results):
            overall_status = 'warning'
        
        response_data = {
            'status': overall_status,
            'items': results,
            'warnings': warnings,
            'errors': errors,
            'can_proceed': True,  # 재고 부족해도 주문은 항상 등록 가능하도록 변경
            'has_stock_issues': overall_status in ['insufficient', 'out_of_stock', 'warning']  # 재고 이슈 여부만 알림
        }
        
        return JsonResponse(response_data)


# ============================================================================
# AI 이상 탐지 View들 (새로 추가)
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class InventoryAnomalyListView(View):
    """이상 탐지 결과 조회 API - 기존 OrderListView 패턴 재활용"""
    
    def get(self, request):
        """이상 탐지 결과 조회 (페이지네이션 + 필터링 지원)"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # 페이지네이션 파라미터 (OrderListView와 동일한 패턴)
        page = request.GET.get('page', 1)
        page_size = int(request.GET.get('page_size', 10))  # 기본 10개씩
        
        # 기본 쿼리셋 (사용자별 필터링 - inventory__user_id로 연결)
        anomalies_queryset = InventoryAnomaly.objects.select_related(
            'inventory', 'log'
        ).filter(inventory__user_id=request.user_id)
        
        # 필터링 (OrderListView와 동일한 패턴)
        # 1. 이상 유형별 필터링
        anomaly_type_filter = request.GET.get('anomaly_type')
        if anomaly_type_filter and anomaly_type_filter != 'all':
            anomalies_queryset = anomalies_queryset.filter(anomaly_type=anomaly_type_filter)
        
        # 2. 심각도별 필터링
        severity_filter = request.GET.get('severity')
        if severity_filter and severity_filter != 'all':
            anomalies_queryset = anomalies_queryset.filter(severity=severity_filter)
        
        # 3. 어종별 필터링
        fish_type_filter = request.GET.get('fish_type_id')
        if fish_type_filter and fish_type_filter != 'all':
            try:
                fish_type_id = int(fish_type_filter)
                anomalies_queryset = anomalies_queryset.filter(inventory__fish_type_id=fish_type_id)
            except ValueError:
                pass  # 잘못된 fish_type_id는 무시
        
        # 4. 해결 상태별 필터링
        resolved_filter = request.GET.get('resolved')
        if resolved_filter and resolved_filter != 'all':
            if resolved_filter == 'true':
                anomalies_queryset = anomalies_queryset.filter(resolved_at__isnull=False)
            elif resolved_filter == 'false':
                anomalies_queryset = anomalies_queryset.filter(resolved_at__isnull=True)
        
        # 5. 날짜별 필터링 (OrderListView와 동일한 패턴)
        date_filter = request.GET.get('date')
        if date_filter:
            try:
                from datetime import datetime
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                anomalies_queryset = anomalies_queryset.filter(detected_at__date=filter_date)
            except ValueError:
                pass  # 잘못된 날짜 형식은 무시
        
        # 최신순 정렬
        anomalies_queryset = anomalies_queryset.order_by('-detected_at')
        
        # Django Paginator 사용 (OrderListView와 동일한 패턴)
        from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
        paginator = Paginator(anomalies_queryset, page_size)
        
        try:
            anomalies_page = paginator.page(page)
        except PageNotAnInteger:
            # 페이지가 정수가 아니면 첫 번째 페이지 반환
            anomalies_page = paginator.page(1)
        except EmptyPage:
            # 페이지가 범위를 벗어나면 마지막 페이지 반환
            anomalies_page = paginator.page(paginator.num_pages)
        
        # Serializer로 데이터 변환
        serializer = InventoryAnomalySerializer(anomalies_page.object_list, many=True)
        
        # 어종 목록도 함께 제공 (필터링용) - 사용자별 필터링 적용
        fish_types = FishType.objects.filter(
            inventory__user_id=request.user_id
        ).values('id', 'name')
        
        return JsonResponse({
            'data': serializer.data,
            'pagination': {
                'page': anomalies_page.number,
                'page_size': page_size,
                'total_count': paginator.count,
                'total_pages': paginator.num_pages,
                'has_next': anomalies_page.has_next(),
                'has_previous': anomalies_page.has_previous()
            },
            'filters': {
                'fish_types': list(fish_types),
                'anomaly_type_choices': [
                    {'value': 'negative_stock', 'label': '마이너스 재고'},
                    {'value': 'sudden_stock_change', 'label': '급격한 재고 변동'},
                    {'value': 'low_stock', 'label': '재고 부족'},
                    {'value': 'duplicate_log', 'label': '중복 입력'},
                    {'value': 'price_inconsistency', 'label': '단가/금액 정합성'}
                ],
                'severity_choices': [
                    {'value': 'CRITICAL', 'label': '심각'},
                    {'value': 'HIGH', 'label': '높음'},
                    {'value': 'MEDIUM', 'label': '보통'},
                    {'value': 'LOW', 'label': '낮음'}
                ]
            }
        })


@method_decorator(csrf_exempt, name='dispatch')
class AnomalySummaryView(View):
    """이상 탐지 요약 정보 API - 대시보드용"""
    
    def get(self, request):
        """이상 탐지 요약 정보 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # 기간 파라미터 (기본값: 최근 7일)
        days = int(request.GET.get('days', 7))
        
        try:
            # InventoryAnomalyService의 get_anomaly_summary 메서드 활용
            from .services import InventoryAnomalyService
            summary = InventoryAnomalyService.get_anomaly_summary(
                user_id=request.user_id,
                days=days
            )
            
            # Serializer로 데이터 변환
            serializer = AnomalySummarySerializer(summary)
            
            return JsonResponse({
                'data': serializer.data,
                'period_days': days
            })
            
        except Exception as e:
            return JsonResponse({
                'error': f'이상 탐지 요약 정보 조회 중 오류 발생: {str(e)}'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class AnomalyDetailView(View):
    """이상 탐지 상세 정보 API"""
    
    def get(self, request, anomaly_id):
        """이상 탐지 상세 정보 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 이상 탐지 결과 조회 (사용자별 필터링)
            anomaly = InventoryAnomaly.objects.select_related(
                'inventory', 'log'
            ).get(id=anomaly_id, **get_user_queryset_filter(request))
            
            # Serializer로 데이터 변환
            serializer = InventoryAnomalySerializer(anomaly)
            
            return JsonResponse({
                'data': serializer.data
            })
            
        except InventoryAnomaly.DoesNotExist:
            return JsonResponse({'error': '이상 탐지 결과를 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            return JsonResponse({
                'error': f'이상 탐지 상세 정보 조회 중 오류 발생: {str(e)}'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class AnomalyUpdateView(View):
    """이상 탐지 상태 업데이트 및 상세 조회 API"""
    
    def get(self, request, pk):
        """이상 탐지 상세 정보 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 이상 탐지 결과 조회 (사용자별 필터링)
            anomaly = InventoryAnomaly.objects.get(
                id=pk, 
                inventory__user_id=request.user_id
            )
            
            # Serializer로 데이터 반환
            serializer = InventoryAnomalySerializer(anomaly)
            return JsonResponse(serializer.data)
            
        except InventoryAnomaly.DoesNotExist:
            return JsonResponse({'error': '이상 탐지 결과를 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            return JsonResponse({
                'error': f'이상 탐지 상세 조회 중 오류 발생: {str(e)}'
            }, status=500)
    
    def patch(self, request, pk):
        """이상 탐지 상태 업데이트 (해결 처리, 검토 상태 변경 등)"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # Django View에서 JSON 데이터 파싱 (OrderListView와 동일한 패턴)
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
        except json.JSONDecodeError as e:
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        try:
            # 이상 탐지 결과 조회 (사용자별 필터링)
            anomaly = InventoryAnomaly.objects.get(
                id=pk, 
                inventory__user_id=request.user_id
            )
            
            # 업데이트 가능한 필드들
            update_fields = []
            
            # 해결 상태 업데이트
            if 'resolved' in data:
                if data['resolved']:
                    from django.utils import timezone
                    anomaly.resolved_at = timezone.now()
                    # resolved_by 필드가 없으므로 제거
                    update_fields.append('resolved_at')
                else:
                    # 오탐지 처리 시에도 resolved_at을 설정하여 처리 완료 상태로 만듦
                    from django.utils import timezone
                    anomaly.resolved_at = timezone.now()
                    update_fields.append('resolved_at')
            
            # 메모 업데이트 (description 필드 사용)
            if 'memo' in data:
                anomaly.description = data['memo']
                update_fields.append('description')
            
            # 변경사항이 있으면 저장
            if update_fields:
                anomaly.save(update_fields=update_fields)
            
            # Serializer로 업데이트된 데이터 반환
            serializer = InventoryAnomalySerializer(anomaly)
            
            return JsonResponse({
                'message': '이상 탐지 상태가 업데이트되었습니다.',
                'data': serializer.data
            })
            
        except InventoryAnomaly.DoesNotExist:
            return JsonResponse({'error': '이상 탐지 결과를 찾을 수 없습니다.'}, status=404)
        except Exception as e:
            return JsonResponse({
                'error': f'이상 탐지 상태 업데이트 중 오류 발생: {str(e)}'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class InventorySummaryView(View):
    """재고 상태 요약 정보 API - 대시보드용"""
    
    def get(self, request):
        """재고 상태 요약 정보 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 사용자별 재고 상태 요약
            inventories = Inventory.objects.select_related('fish_type').filter(
                **get_user_queryset_filter(request)
            )
            
            total_items = len(inventories)
            low_stock_items = len([i for i in inventories if i.stock_quantity <= 10])
            abnormal_items = len([i for i in inventories if i.status == 'abnormal'])
            
            # 총 재고 가치 계산 (단순화)
            total_value = sum(i.stock_quantity * 1000 for i in inventories)  # 임시 단가 1000원
            
            # 최근 변경사항 (최근 5개)
            recent_changes = InventoryLog.objects.filter(
                inventory__user_id=request.user_id
            ).select_related('fish_type').order_by('-created_at')[:5]
            
            recent_changes_data = InventoryLogSerializer(recent_changes, many=True).data
            
            summary_data = {
                'total_items': total_items,
                'low_stock_items': low_stock_items,
                'abnormal_items': abnormal_items,
                'total_value': total_value,
                'recent_changes': recent_changes_data
            }
            
            return JsonResponse({
                'data': summary_data
            })
            
        except Exception as e:
            return JsonResponse({
                'error': f'재고 상태 요약 정보 조회 중 오류 발생: {str(e)}'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryPatternListView(View):
    """재고 패턴 분석 결과 조회 API (향후 PyOD 확장용)"""
    
    def get(self, request):
        """재고 패턴 분석 결과 조회"""
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 사용자별 패턴 분석 결과 조회
            patterns = InventoryPattern.objects.filter(
                fish_type__inventory__user_id=request.user_id
            ).select_related('fish_type').order_by('-last_updated')
            
            serializer = InventoryPatternSerializer(patterns, many=True)
            
            return JsonResponse({
                'data': serializer.data,
                'total_count': len(serializer.data)
            })
            
        except Exception as e:
            return JsonResponse({
                'error': f'재고 패턴 분석 결과 조회 중 오류 발생: {str(e)}'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryCheckRecordsView(View):
    """실사 내역 조회 API - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request):
        # JWT 인증 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        try:
            # 실사 조정 로그 조회 (type='adjust')
            # 사용자별 필터링 (updated_by_id로 필터링)
            queryset = InventoryLog.objects.filter(
                type='adjust',
                updated_by_id=request.user_id
            ).select_related('inventory', 'fish_type').order_by('-created_at')
            
            # 검색 필터
            search = request.GET.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(fish_type__name__icontains=search) |
                    Q(memo__icontains=search)
                )
            
            # 날짜 필터
            date_filter = request.GET.get('date', '')
            if date_filter:
                queryset = queryset.filter(created_at__date=date_filter)
            
            # 실사자 필터 (현재는 공용으로 고정)
            checker_filter = request.GET.get('checker', '')
            if checker_filter and checker_filter != 'all':
                # 실제로는 updated_by 필드로 실사자 구분 가능
                pass
            
            # 페이지네이션
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 10))
            start = (page - 1) * per_page
            end = start + per_page
            
            total_count = queryset.count()
            records = queryset[start:end]
            
            # 응답 데이터 구성
            check_records = []
            for log in records:
                record = {
                    'id': log.id,
                    'fish_type_name': log.fish_type.name,
                    'before_quantity': log.before_quantity,
                    'difference': log.change,
                    'after_quantity': log.after_quantity,
                    'unit': log.unit,
                    'checker': '공용',  # 현재는 공용으로 고정
                    'check_date': log.created_at.strftime('%Y-%m-%d'),
                    'memo': log.memo,
                    'anomaly_detected': log.is_anomaly,
                    'anomaly_type': log.anomaly_type if log.is_anomaly else None
                }
                check_records.append(record)
            
            return JsonResponse({
                'records': check_records,
                'total_count': total_count,
                'current_page': page,
                'total_pages': (total_count + per_page - 1) // per_page,
                'per_page': per_page
            }, safe=False)
            
        except Exception as e:
            return JsonResponse(
                {'error': f'실사 내역 조회 중 오류가 발생했습니다: {str(e)}'}, 
                status=500
            )


class InventoryAdjustView(View):
    """실사 조정 API - Django View 기반 JWT 미들웨어 인증"""
    
    @method_decorator(csrf_exempt, name='dispatch')
    def post(self, request, inventory_id):
        # JWT 인증 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
        except json.JSONDecodeError as e:
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        try:
            inventory = Inventory.objects.get(id=inventory_id)
            fish_type = inventory.fish_type
            
            # 실사 데이터 받기
            actual_quantity = data.get('actual_quantity')
            quality = data.get('quality', '상')  # 상/중/하
            packaging = data.get('packaging', '정상')  # 정상/훼손
            memo = data.get('memo', '')
            
            if actual_quantity is None:
                return JsonResponse(
                    {'error': '실제 수량은 필수입니다.'}, 
                    status=400
                )
            
            # 시스템 재고와 실제 재고 차이 계산
            system_quantity = inventory.stock_quantity
            difference = actual_quantity - system_quantity
            
            # 실사 로그 생성 (type="adjust")
            inventory_log = InventoryLog.objects.create(
                inventory=inventory,
                fish_type=fish_type,
                type='adjust',
                change=difference,
                before_quantity=system_quantity,
                after_quantity=actual_quantity,
                unit=inventory.unit,
                source_type='manual',
                memo=f"실사 조정 - 품질: {quality}, 포장: {packaging}, 메모: {memo}",
                updated_by_id=request.user_id
            )
            
            # 재고 수량 업데이트
            inventory.stock_quantity = actual_quantity
            inventory.save()
            
            # 실사 차이 이상탐지
            anomaly = InventoryAnomalyService.detect_inventory_check_anomaly(
                inventory, actual_quantity, fish_type
            )
            
            if anomaly:
                # 이상탐지 결과를 InventoryLog에 반영
                inventory_log.is_anomaly = True
                inventory_log.anomaly_type = anomaly['type']
                inventory_log.anomaly_score = anomaly['anomaly_score']
                inventory_log.save()
                
                # InventoryAnomaly 생성
                InventoryAnomaly.objects.create(
                    log=inventory_log,
                    inventory=inventory,
                    anomaly_type=anomaly['type'],
                    severity=anomaly['severity'],
                    confidence_score=anomaly['anomaly_score'],
                    description=anomaly['description'],
                    recommended_action=anomaly['recommended_action'],
                    ai_model_version='v1.0'
                )
            
            return JsonResponse({
                'message': '실사 조정이 완료되었습니다.',
                'inventory_log_id': inventory_log.id,
                'difference': difference,
                'anomaly_detected': anomaly is not None
            }, status=200)
            
        except Inventory.DoesNotExist:
            return JsonResponse(
                {'error': '재고를 찾을 수 없습니다.'}, 
                status=404
            )
        except Exception as e:
            return JsonResponse(
                {'error': f'실사 조정 중 오류가 발생했습니다: {str(e)}'}, 
                status=500
            )


class InventoryChecklistView(APIView):
    """실사 체크리스트 API"""
    
    def get(self, request):
        try:
            today = timezone.now().date()
            current_weekday = today.weekday()  # 0=월요일, 1=화요일, ...
            
            # 어종별 실사 주기 계산
            fish_types = FishType.objects.all()
            checklist = []
            
            for fish_type in fish_types:
                inventory = Inventory.objects.filter(fish_type=fish_type).first()
                if not inventory:
                    continue
                
                # 실사 주기 결정
                check_schedule = self._get_check_schedule(fish_type, current_weekday)
                
                # 마지막 실사 날짜 확인
                last_check = InventoryLog.objects.filter(
                    inventory=inventory,
                    type='adjust'
                ).order_by('-created_at').first()
                
                last_check_date = last_check.created_at.date() if last_check else None
                days_since_last_check = (today - last_check_date).days if last_check_date else 999
                
                # 실사 필요 여부 판단
                needs_check = self._needs_inventory_check(
                    check_schedule, days_since_last_check, inventory
                )
                
                checklist.append({
                    'fish_type_id': fish_type.id,
                    'inventory_id': inventory.id,  # 실제 inventory.id 추가
                    'fish_type_name': fish_type.name,
                    'unit': inventory.unit,
                    'current_stock': inventory.stock_quantity,
                    'check_schedule': check_schedule,
                    'last_check_date': last_check_date,
                    'days_since_last_check': days_since_last_check,
                    'needs_check': needs_check,
                    'priority': self._get_check_priority(fish_type, inventory)
                })
            
            # 우선순위별 정렬
            checklist.sort(key=lambda x: x['priority'])
            
            return Response({
                'checklist': checklist,
                'today': today,
                'current_weekday': current_weekday
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'체크리스트 조회 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_check_schedule(self, fish_type, current_weekday):
        """어종별 실사 주기 결정"""
        # 고가 어종 (전복, 홍합, 대게 등) - 주 2회 (화·금)
        if fish_type.name in ['전복', '홍합', '대게']:
            if current_weekday in [1, 4]:  # 화요일, 금요일
                return 'today'
            else:
                return 'weekly_twice'
        
        # 주요 어종 (고등어, 오징어 등) - 주 1회 (토요일)
        elif fish_type.name in ['고등어', '오징어']:
            if current_weekday == 5:  # 토요일
                return 'today'
            else:
                return 'weekly_once'
        
        # 일반 어종 - 10일 1회
        else:
            return 'ten_days'
    
    def _needs_inventory_check(self, check_schedule, days_since_last_check, inventory):
        """실사 필요 여부 판단"""
        if check_schedule == 'today':
            return True
        
        if check_schedule == 'weekly_twice':
            return days_since_last_check >= 3  # 3일 이상 지났으면 실사 필요
        
        if check_schedule == 'weekly_once':
            return days_since_last_check >= 7  # 7일 이상 지났으면 실사 필요
        
        if check_schedule == 'ten_days':
            return days_since_last_check >= 10  # 10일 이상 지났으면 실사 필요
        
        return False
    
    def _get_check_priority(self, fish_type, inventory):
        """실사 우선순위 계산"""
        priority = 0
        
        # 고가 어종 우선순위 높음
        if fish_type.name in ['전복', '홍합', '대게']:
            priority += 100
        
        # 주요 어종 우선순위 중간
        elif fish_type.name in ['고등어', '오징어']:
            priority += 50
        
        # 재고 부족 시 우선순위 높음
        if inventory.stock_quantity <= 20:
            priority += 30
        
        # 이상탐지 발생 시 우선순위 높음
        if inventory.status == 'abnormal':
            priority += 40
        
        return priority


class InventoryAnomaliesView(APIView):
    """이상탐지 결과 조회 API"""
    
    def get(self, request):
        try:
            # 이상탐지된 로그 조회
            anomalies = InventoryLog.objects.filter(
                is_anomaly=True
            ).select_related('fish_type', 'inventory').order_by('-created_at')
            
            # 필터링
            severity = request.query_params.get('severity')
            if severity:
                anomalies = anomalies.filter(anomaly_type=severity)
            
            # 페이지네이션
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            start = (page - 1) * page_size
            end = start + page_size
            
            total_count = anomalies.count()
            anomalies_page = anomalies[start:end]
            
            # 응답 데이터 구성
            anomaly_data = []
            for log in anomalies_page:
                anomaly_data.append({
                    'id': log.id,
                    'fish_type_name': log.fish_type.name,
                    'type': log.type,
                    'change': log.change,
                    'unit': log.unit,
                    'anomaly_type': log.anomaly_type,
                    'anomaly_score': log.anomaly_score,
                    'created_at': log.created_at,
                    'memo': log.memo
                })
            
            return Response({
                'anomalies': anomaly_data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'이상탐지 결과 조회 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


