from rest_framework import serializers
from .models import Order, OrderItem, DocumentRequest


class OrderItemSerializer(serializers.ModelSerializer):
    fish_type_id = serializers.IntegerField()

    class Meta:
        model = OrderItem
        fields = [
            'fish_type_id', 'quantity', 'unit_price', 'unit', 'remarks'
        ]
        extra_kwargs = {
            'item_name_snapshot': {'required': False},
            'unit_price_snapshot': {'required': False},
            'remarks': {'required': False},
            'unit': {'required': False}
        }


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    business_id = serializers.IntegerField(write_only=True)  # 입력용
    user_id = serializers.IntegerField(required=False)  # user_id 필드 명시적 추가

    class Meta:
        model = Order
        fields = [
            'id',
            'business_id',  # write_only이므로 입력에만 사용
            'business',     # ForeignKey 관계 출력용
            'user_id',      # user_id 필드 추가
            'total_price',
            'delivery_datetime',
            'ship_out_datetime',
            'source_type',
            'raw_input_path',
            'transcribed_text',
            'memo',
            'order_status',
            'cancel_reason',
            'cancel_reason_detail',
            'refund_reason',
            'refund_reason_detail',
            'is_urgent',
            'last_updated_at',
            'order_items'
        ]
        extra_kwargs = {
            'user_id': {'required': False},  # user_id는 내부적으로 설정됨
            'delivery_datetime': {'required': False},
            'ship_out_datetime': {'required': False},
            'raw_input_path': {'required': False},
            'transcribed_text': {'required': False},
            'memo': {'required': False},
            'cancel_reason': {'required': False},
            'cancel_reason_detail': {'required': False},
            'refund_reason': {'required': False},
            'refund_reason_detail': {'required': False},
            'is_urgent': {'required': False},
            'last_updated_at': {'required': False}
        }

    def create(self, validated_data):
        print(f"🏗️ OrderSerializer.create() 호출됨 - 새 버전 5.0 (직접 재고 차감)")
        print(f"📦 validated_data keys: {list(validated_data.keys())}")
        
        order_items_data = validated_data.pop('order_items')
        business_id = validated_data.pop('business_id')
        
        print(f"🏢 추출된 business_id: {business_id}")
        
        # 재고 체크 및 재고 이슈 플래그 설정
        has_stock_issues = False
        
        from inventory.models import Inventory, StockTransaction
        from fish_registry.models import FishType
        from django.db.models import Sum, F
        from business.models import User
        from django.db import transaction
        
        user = User.objects.get(id=validated_data.get('user_id'))
        
        # 1단계: 재고 사전 체크
        print(f"📋 1단계: 재고 사전 체크")
        inventory_updates = []  # 재고 업데이트 정보 저장
        
        for item_data in order_items_data:
            fish_type_id = item_data.get('fish_type_id')
            quantity = item_data.get('quantity', 0)
            
            if fish_type_id and quantity > 0:
                print(f"🔍 재고 체크: 어종 ID {fish_type_id}, 수량 {quantity}")
                
                # 해당 어종의 모든 재고 조회 (가용 재고 순으로 정렬)
                inventories = Inventory.objects.filter(
                    fish_type_id=fish_type_id,
                    user=user,
                    stock_quantity__gt=0
                ).order_by('-stock_quantity')
                
                total_available = sum(inv.stock_quantity for inv in inventories)
                
                print(f"📦 재고 상세: 어종 ID {fish_type_id}")
                print(f"   - 총 가용 재고: {total_available}")
                print(f"   - 주문 수량: {quantity}")
                
                # 재고 부족 체크
                if total_available <= 0:
                    has_stock_issues = True
                    print(f"🚫 재고 없음: 어종 ID {fish_type_id}")
                elif quantity > total_available:
                    has_stock_issues = True
                    print(f"❗ 재고 부족: 어종 ID {fish_type_id} (요청: {quantity}, 가용: {total_available})")
                else:
                    print(f"✅ 재고 충분: 어종 ID {fish_type_id}")
                
                # 재고 할당 계획 수립 (FIFO - 먼저 들어온 재고부터 차감)
                remaining_quantity = quantity
                item_inventory_updates = []
                
                for inventory in inventories:
                    if remaining_quantity <= 0:
                        break
                    
                    deduct_amount = min(remaining_quantity, inventory.stock_quantity)
                    item_inventory_updates.append({
                        'inventory_id': inventory.id,
                        'deduct_amount': deduct_amount,
                        'new_stock': inventory.stock_quantity - deduct_amount
                    })
                    remaining_quantity -= deduct_amount
                    print(f"   📝 재고 할당: Inventory ID {inventory.id} - {deduct_amount} 차감 예정")
                
                inventory_updates.append({
                    'fish_type_id': fish_type_id,
                    'quantity': quantity,
                    'unit': item_data.get('unit', ''),
                    'updates': item_inventory_updates
                })
        
        # 2단계: 트랜잭션으로 주문 생성 및 재고 차감
        print(f"📋 2단계: 주문 생성 및 재고 차감")
        with transaction.atomic():
            # 주문 생성
            order = Order.objects.create(
                business_id=business_id,
                has_stock_issues=has_stock_issues,
                **validated_data
            )
            
            print(f"🎯 생성된 주문 ID: {order.id}, user_id: {order.user_id}, 재고이슈: {has_stock_issues}")
            print(f"🏪 생성된 주문 거래처: {order.business.business_name}")

            # 주문 항목 생성 및 실제 재고 차감
            for i, item_data in enumerate(order_items_data):
                fish_type_id = item_data.pop('fish_type_id')
                quantity = item_data.get('quantity', 0)
                unit = item_data.get('unit', '')
                
                # 주문 항목 생성
                order_item = OrderItem.objects.create(order=order, fish_type_id=fish_type_id, **item_data)
                
                # 실제 재고 차감
                if quantity > 0 and i < len(inventory_updates):
                    update_plan = inventory_updates[i]
                    
                    for update in update_plan['updates']:
                        inventory_obj = Inventory.objects.get(id=update['inventory_id'])
                        old_stock = inventory_obj.stock_quantity
                        inventory_obj.stock_quantity = update['new_stock']
                        inventory_obj.save()
                        
                        print(f"✅ 재고 차감 완료: Inventory ID {update['inventory_id']} - {old_stock} → {update['new_stock']}")
                    
                    # 로그용 StockTransaction 기록 (선택사항)
                    StockTransaction.objects.create(
                        user=user,
                        fish_type_id=fish_type_id,
                        order=order,
                        transaction_type='order',
                        quantity_change=-quantity,
                        unit=unit,
                        notes=f"주문 #{order.id}로 인한 직접 재고 차감"
                    )
                    print(f"📝 재고 로그 기록: {fish_type_id} - {quantity} {unit} 차감")

        return order


class OrderListSerializer(serializers.ModelSerializer):
    business = serializers.SerializerMethodField()
    items_summary = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()

    
    class Meta:
        model = Order
        fields = [
            'id', 'business', 'total_price', 
            'order_datetime', 'delivery_datetime', 'order_status', 'is_urgent', 'items_summary',
            'memo', 'source_type', 'transcribed_text', 'last_updated_at', 'has_stock_issues', 'payment'
        ]
    
    def get_business(self, obj):
        # ForeignKey 관계를 직접 사용
        if obj.business:
            return {
                'id': obj.business.id,
                'business_name': obj.business.business_name,
                'phone_number': obj.business.phone_number
            }
        else:
            return {
                'id': None,
                'business_name': '거래처명 없음',
                'phone_number': '연락처 없음'
            }
    
    def get_items_summary(self, obj):
        items = obj.items.all()
        if not items:
            return "주문 항목 없음"
        
        item_names = []
        for item in items:
            quantity = item.quantity
            unit = item.unit or "개"
            
            # kg 단위일 때만 소수점 표시, 나머지는 정수로 표시
            if unit.lower() in ['kg', '킬로그램']:
                quantity_str = f"{quantity:.1f}" if quantity % 1 != 0 else f"{int(quantity)}"
            else:
                quantity_str = str(int(quantity))
            
            # 간단한 재고 상태 체크 (새로운 방식)
            stock_issue_indicator = ""
            try:
                from django.db.models import Sum
                from inventory.models import Inventory
                
                # 사용자 ID 가져오기 (context에서)
                request = self.context.get('request')
                if request and hasattr(request, 'user_id'):
                    fish_type_obj = item.fish_type
                    fish_type_id = fish_type_obj.id
                    
                    # 현재 가용 재고 합계 (단순 조회)
                    current_stock = Inventory.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=request.user_id
                    ).aggregate(total=Sum('stock_quantity'))['total'] or 0
                    
                    # 재고 상태 판정 (단순화)
                    if current_stock <= 0:
                        stock_issue_indicator = "🚫"  # 재고 없음
                    elif current_stock <= 10:
                        stock_issue_indicator = "❗"  # 재고 부족
                    elif current_stock <= 20:
                        stock_issue_indicator = "⚠️"  # 재고 주의
                    # 재고가 충분하면 표시 없음
                        
            except Exception as e:
                print(f"❌ 재고 체크 오류 (어종 {item.fish_type.name}): {e}")
                # 재고 체크 실패 시에도 주문 목록은 표시되어야 함
            
            item_names.append(f"{stock_issue_indicator}{item.fish_type.name} {quantity_str}{unit}")
        
        # 줄바꿈으로 구분하여 반환 (프론트엔드에서 처리)
        return "\n".join(item_names)
    
    def get_payment(self, obj):
        """주문의 결제 정보를 반환합니다"""
        try:
            # 주문과 연결된 가장 최근 결제 정보 조회
            payment = obj.payment_set.order_by('-created_at').first()
            if payment:
                return {
                    'id': payment.id,
                    'payment_status': payment.payment_status,
                    'amount': payment.amount,
                    'method': payment.method,
                    'paid_at': payment.paid_at.isoformat() if payment.paid_at else None
                }
        except Exception as e:
            print(f"결제 정보 조회 중 오류: {e}")
        
        return None

class OrderDetailItemSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name')
    
    class Meta:
        model = OrderItem
        fields = [
            'fish_type_name', 'item_name_snapshot', 'quantity', 
            'unit_price', 'unit_price_snapshot', 'unit', 'remarks'
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    business_name = serializers.SerializerMethodField()
    business_phone = serializers.SerializerMethodField()
    business_address = serializers.SerializerMethodField()
    items = OrderDetailItemSerializer(many=True, read_only=True)
    
    # 결제 정보 필드 추가
    payment_method = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_amount = serializers.SerializerMethodField()
    paid_at = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'business_name', 'business_phone', 'business_address',
            'total_price', 'order_datetime', 'delivery_datetime', 'ship_out_datetime',
            'order_status', 'cancel_reason', 'is_urgent', 'source_type', 
            'transcribed_text', 'memo', 'items',
            # 결제 정보 필드 추가
            'payment_method', 'payment_status', 'payment_amount', 'paid_at', 'receipt_url'
        ]
    
    def get_business_name(self, obj):
        from business.models import Business
        try:
            business = Business.objects.get(id=obj.business_id)
            return business.business_name
        except Business.DoesNotExist:
            return '거래처명 없음'
    
    def get_business_phone(self, obj):
        from business.models import Business
        try:
            business = Business.objects.get(id=obj.business_id)
            return business.phone_number
        except Business.DoesNotExist:
            return '연락처 없음'
    
    def get_business_address(self, obj):
        from business.models import Business
        try:
            business = Business.objects.get(id=obj.business_id)
            return business.address
        except Business.DoesNotExist:
            return '주소 없음'
    
    def get_payment_method(self, obj):
        """결제 수단 반환"""
        try:
            if obj.payment:
                return obj.payment.method
            return None
        except:
            return None
    
    def get_payment_status(self, obj):
        """결제 상태 반환"""
        try:
            if obj.payment:
                return obj.payment.payment_status
            return None
        except:
            return None
    
    def get_payment_amount(self, obj):
        """결제 금액 반환"""
        try:
            if obj.payment:
                return obj.payment.amount
            return None
        except:
            return None
    
    def get_paid_at(self, obj):
        """결제 완료 시각 반환"""
        try:
            if obj.payment and obj.payment.paid_at:
                return obj.payment.paid_at
            return None
        except:
            return None
    
    def get_receipt_url(self, obj):
        """영수증 URL 반환"""
        try:
            if obj.payment and obj.payment.receipt_url:
                return obj.payment.receipt_url
            return None
        except:
            return None


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['order_status']


class OrderUpdateSerializer(serializers.ModelSerializer):
    """주문 수정을 위한 Serializer"""
    order_items = OrderItemSerializer(many=True)
    
    class Meta:
        model = Order
        fields = [
            'business_id', 'delivery_datetime', 'memo', 
            'is_urgent', 'order_items'
        ]
        extra_kwargs = {
            'business_id': {'required': True},
            'delivery_datetime': {'required': False},
            'memo': {'required': False},
            'is_urgent': {'required': False},
            'order_items': {'required': True}
        }
    
    def validate(self, data):
        """주문 수정 가능 여부 검증"""
        order = self.instance
        
        # 결제 완료된 주문은 수정 불가
        if order.payment and order.payment.payment_status == 'paid':
            raise serializers.ValidationError("결제가 완료된 주문은 수정할 수 없습니다.")
        
        # 취소된 주문은 수정 불가
        if order.order_status == 'cancelled':
            raise serializers.ValidationError("취소된 주문은 수정할 수 없습니다.")
        
        return data
    
    def update(self, instance, validated_data):
        """주문 정보 및 항목 수정"""
        order_items_data = validated_data.pop('order_items', [])
        
        # 주문 기본 정보 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # 총액 재계산을 위해 임시 저장
        instance.save()
        
        # 기존 주문 항목 삭제
        instance.items.all().delete()
        
        # 새로운 주문 항목 생성
        for item_data in order_items_data:
            fish_type_id = item_data.pop('fish_type_id')
            OrderItem.objects.create(order=instance, fish_type_id=fish_type_id, **item_data)
        
        # 총액 재계산
        total_price = sum(
            item.quantity * item.unit_price 
            for item in instance.items.all()
        )
        instance.total_price = total_price
        instance.save()
        
        return instance


class DocumentRequestSerializer(serializers.ModelSerializer):
    """문서 발급 요청 시리얼라이저"""
    
    class Meta:
        model = DocumentRequest
        fields = [
            'id',
            'order',
            'user',
            'document_type',
            'receipt_type',
            'identifier',
            'special_request',
            'status',
            'created_at',
            'completed_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'completed_at']
    
    def create(self, validated_data):
        # 현재 로그인한 사용자 정보 추가
        request = self.context.get('request')
        if request and hasattr(request, 'user_id'):
            validated_data['user_id'] = request.user_id
        
        return super().create(validated_data)
