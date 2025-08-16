import json
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Q
from core.middleware import get_user_queryset_filter
from .models import Inventory, InventoryLog
from .serializers import (
    InventorySerializer, InventoryLogSerializer, InventoryListSerializer,
    InventoryCreateSerializer, FishTypeSerializer
)
from fish_registry.models import FishType


@method_decorator(csrf_exempt, name='dispatch')
class InventoryListCreateView(View):
    """재고 목록 조회 및 생성 - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request):
        """재고 목록 조회"""
        print(f"📦 재고 목록 조회 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
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
        
        serializer = InventoryListSerializer(queryset, many=True)
        return JsonResponse(serializer.data, safe=False)
    
    def post(self, request):
        """재고 생성"""
        print(f"📦 재고 생성 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            print(f"📝 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
        
        serializer = InventoryCreateSerializer(data=data)
        if serializer.is_valid():
            inventory = serializer.save(user_id=request.user_id)
            
            # 재고 생성 로그 기록
            from business.models import User
            user = User.objects.get(id=request.user_id)
            
            InventoryLog.objects.create(
                inventory=inventory,
                fish_type=inventory.fish_type,
                type='in',
                change=inventory.stock_quantity,
                before_quantity=0,
                after_quantity=inventory.stock_quantity,
                unit=inventory.unit,
                source_type='manual',
                memo='초기 재고 등록',
                updated_by=user
            )
            
            return JsonResponse(
                InventoryListSerializer(inventory).data,
                status=201
            )
        return JsonResponse(serializer.errors, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class InventoryDetailView(View):
    """재고 상세 조회, 수정, 삭제 - Django View 기반 JWT 미들웨어 인증"""
    
    def get(self, request, pk):
        """재고 상세 조회"""
        print(f"🗓️ 재고 상세 조회 요청: pk={pk}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        try:
            inventory = Inventory.objects.select_related('fish_type').get(pk=pk, **get_user_queryset_filter(request))
            serializer = InventorySerializer(inventory)
            return JsonResponse(serializer.data)
        except Inventory.DoesNotExist:
            return JsonResponse({'error': '재고를 찾을 수 없습니다.'}, status=404)
    
    def put(self, request, pk):
        """재고 수정"""
        print(f"🔄 재고 수정 요청: pk={pk}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
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
                    
                    InventoryLog.objects.create(
                        inventory=inventory,
                        fish_type=inventory.fish_type,
                        type=log_type,
                        change=abs(change),
                        before_quantity=old_quantity,
                        after_quantity=new_quantity,
                        unit=inventory.unit,
                        source_type='manual',
                        memo='재고 수량 수정',
                        updated_by=user
                    )
                
                return JsonResponse(serializer.data)
            return JsonResponse(serializer.errors, status=400)
        except Inventory.DoesNotExist:
            return JsonResponse({'error': '재고를 찾을 수 없습니다.'}, status=404)
    
    def delete(self, request, pk):
        """재고 삭제"""
        print(f"❌ 재고 삭제 요청: pk={pk}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
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
        print(f"📜 재고 로그 목록 조회 요청: inventory_id={inventory_id}")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
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
        print(f"🐠 어종 목록 조회 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # 미들웨어에서 설정된 user_id 사용
        fish_types = FishType.objects.filter(**get_user_queryset_filter(request)).order_by('name')
        serializer = FishTypeSerializer(fish_types, many=True)
        return JsonResponse(serializer.data, safe=False)


@method_decorator(csrf_exempt, name='dispatch')
class StockCheckView(View):
    """주문 등록 시 재고 체크 - Django View 기반 JWT 미들웨어 인증"""
    
    def post(self, request):
        """주문 아이템들의 재고 상태 체크"""
        print(f"📦 재고 체크 요청")
        print(f"🆔 request.user_id: {getattr(request, 'user_id', 'NOT SET')}")
        
        # 미들웨어에서 설정된 사용자 정보 확인
        if not hasattr(request, 'user_id') or not request.user_id:
            print(f"❌ 사용자 인증 정보 없음")
            return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
        
        print(f"✅ 사용자 인증 확인: user_id={request.user_id}")
        
        # Django View에서 JSON 데이터 파싱
        try:
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            print(f"📝 파싱된 데이터: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
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
                # 어종별 실시간 재고량 계산 (등록된 재고 - 주문으로 차감된 재고)
                from django.db.models import Sum
                from .models import StockTransaction
                
                # 등록된 총 재고량
                total_registered_stock = Inventory.objects.filter(
                    fish_type_id=fish_type_id,
                    **get_user_queryset_filter(request)
                ).aggregate(total=Sum('stock_quantity'))['total'] or 0
                
                # 주문으로 차감된 재고량 (quantity_change는 음수)
                total_ordered = StockTransaction.objects.filter(
                    fish_type_id=fish_type_id,
                    user_id=request.user_id,
                    transaction_type='order'
                ).aggregate(total=Sum('quantity_change'))['total'] or 0
                
                # 실제 가용 재고 = 등록된 재고 + 차감된 재고 (음수이므로 실질적으로 빼기)
                total_stock = total_registered_stock + total_ordered
                
                # 어종 정보 가져오기
                fish_type = FishType.objects.get(id=fish_type_id, **get_user_queryset_filter(request))
                
                item_result = {
                    'fish_type_id': fish_type_id,
                    'fish_name': fish_type.name,
                    'requested_quantity': quantity,
                    'available_stock': total_stock,
                    'unit': unit,
                    'status': 'ok'
                }
                
                # 재고 부족 체크
                if quantity > total_stock:
                    shortage = quantity - total_stock
                    item_result['status'] = 'insufficient'
                    item_result['shortage'] = shortage
                    
                    # 소수점 제거를 위한 포맷팅
                    quantity_str = f"{quantity:g}"
                    total_stock_str = f"{total_stock:g}"
                    shortage_str = f"{shortage:g}"
                    remaining_stock = total_stock
                    
                    warning_msg = f"🚨 {fish_type.name}: {quantity_str}{unit} 주문시 남은재고 {remaining_stock:g}{unit} (부족: {shortage_str}{unit})"
                    warnings.append(warning_msg)
                    errors.append({
                        'fish_name': fish_type.name,
                        'message': f'🚨 재고 부족! {quantity_str}{unit} 주문시 남은재고 {remaining_stock:g}{unit}',
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
        
        print(f"📦 재고 체크 결과: {response_data}")
        return JsonResponse(response_data)