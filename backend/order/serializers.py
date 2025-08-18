from rest_framework import serializers
from .models import Order, OrderItem


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
            'is_urgent': {'required': False},
            'last_updated_at': {'required': False}
        }

    def create(self, validated_data):
        print(f"🏗️ OrderSerializer.create() 호출됨 - 새 버전 4.0 (재고 추적 포함)")
        print(f"📦 validated_data keys: {list(validated_data.keys())}")
        
        order_items_data = validated_data.pop('order_items')
        business_id = validated_data.pop('business_id')
        
        print(f"🏢 추출된 business_id: {business_id}")
        
        # 재고 체크 및 재고 이슈 플래그 설정
        has_stock_issues = False
        
        # inventoryApi.checkStock과 동일한 로직으로 재고 체크
        from inventory.models import Inventory, StockTransaction
        from fish_registry.models import FishType
        from django.db.models import Sum
        from business.models import User
        
        user = User.objects.get(id=validated_data.get('user_id'))
        
        for item_data in order_items_data:
            fish_type_id = item_data.get('fish_type_id')
            quantity = item_data.get('quantity', 0)
            
            if fish_type_id and quantity > 0:
                print(f"🔍 주문 생성 시 재고 체크: 어종 ID {fish_type_id}, 수량 {quantity}")
                
                # 현재 등록된 실제 재고량 (재고 관리에서 등록된 재고)
                total_registered_stock = Inventory.objects.filter(
                    fish_type_id=fish_type_id,
                    user=user
                ).aggregate(total=Sum('stock_quantity'))['total'] or 0
                
                # 기존 주문들로 인해 차감된 재고량 (StockTransaction 추적)
                total_ordered = StockTransaction.objects.filter(
                    fish_type_id=fish_type_id,
                    user=user,
                    transaction_type='order'
                ).aggregate(total=Sum('quantity_change'))['total'] or 0
                
                # 실제 가용 재고 = 등록된 재고 + 차감량 (quantity_change는 음수로 저장됨)
                available_stock = total_registered_stock + total_ordered
                
                print(f"📦 재고 상세: 어종 ID {fish_type_id}")
                print(f"   - 등록된 재고: {total_registered_stock}")
                print(f"   - 기존 주문 차감: {total_ordered}")
                print(f"   - 가용 재고: {available_stock}")
                print(f"   - 이번 주문 수량: {quantity}")
                
                # 재고 부족 여부 확인
                if available_stock <= 0:
                    has_stock_issues = True
                    print(f"🚫 재고 없음: 어종 ID {fish_type_id}")
                elif quantity > available_stock:
                    has_stock_issues = True
                    print(f"❗ 재고 부족: 어종 ID {fish_type_id} (요청: {quantity}, 가용: {available_stock})")
                else:
                    print(f"✅ 재고 충분: 어종 ID {fish_type_id}")
        
        # 주문 생성
        order = Order.objects.create(
            business_id=business_id,
            has_stock_issues=has_stock_issues,  # 재고 이슈 플래그 설정
            **validated_data
        )
        
        print(f"🎯 생성된 주문 ID: {order.id}, user_id: {order.user_id}, 재고이슈: {has_stock_issues}")
        print(f"🏪 생성된 주문 거래처: {order.business.business_name}")

        # 주문 항목 생성 및 재고 차감 기록
        for item_data in order_items_data:
            fish_type_id = item_data.pop('fish_type_id')
            quantity = item_data.get('quantity', 0)
            unit = item_data.get('unit', '')
            
            # 주문 항목 생성
            order_item = OrderItem.objects.create(order=order, fish_type_id=fish_type_id, **item_data)
            
            # 재고 거래 기록 생성 (주문으로 인한 차감)
            if quantity > 0:
                StockTransaction.objects.create(
                    user=user,
                    fish_type_id=fish_type_id,
                    order=order,
                    transaction_type='order',
                    quantity_change=-quantity,  # 음수로 저장 (차감)
                    unit=unit,
                    notes=f"주문 #{order.id}로 인한 재고 차감"
                )
                print(f"📝 재고 거래 기록: {fish_type_id} - {quantity} {unit} 차감")

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
            
            # 실시간 재고 부족 체크 (실제 재고 관리와 매칭)
            stock_issue_indicator = ""
            try:
                from django.db.models import Sum
                from inventory.models import Inventory, StockTransaction
                
                # 사용자 ID 가져오기 (context에서)
                request = self.context.get('request')
                if request and hasattr(request, 'user_id'):
                    
                    # 실제 어종 ID 확인 - fish_type ForeignKey를 통해 정확한 ID 가져오기
                    fish_type_obj = item.fish_type
                    fish_type_id = fish_type_obj.id
                    fish_name = fish_type_obj.name
                    
                    # ========== 실제 재고 관리 시스템과 실시간 연동 ==========
                    
                    # 1. 재고 관리에서 등록된 모든 재고 항목 조회
                    inventory_items = Inventory.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=request.user_id
                    )
                    
                    # 등록된 총 재고량
                    total_registered_stock = inventory_items.aggregate(
                        total=Sum('stock_quantity')
                    )['total'] or 0
                    
                    # 2. StockTransaction에서 모든 주문으로 인한 차감 기록 조회
                    stock_transactions = StockTransaction.objects.filter(
                        fish_type_id=fish_type_id,
                        user_id=request.user_id,
                        transaction_type='order'
                    )
                    
                    # 주문으로 차감된 총량 (음수로 저장됨)
                    total_ordered_deduction = stock_transactions.aggregate(
                        total=Sum('quantity_change')
                    )['total'] or 0
                    
                    # 3. 현재 가용 재고 = 등록된 재고 - 주문 차감량
                    # (total_ordered_deduction이 음수이므로 덧셈이 실질적으로 뺄셈)
                    available_stock = total_registered_stock + total_ordered_deduction
                    
                    print(f"🔗 실시간 재고-주문 연동 체크")
                    print(f"   📋 주문: #{obj.id}, 어종: {fish_type_obj.name}({fish_type_id})")
                    print(f"   📦 재고관리 등록 항목: {inventory_items.count()}개")
                    print(f"   📊 총 등록 재고: {total_registered_stock} {unit}")
                    print(f"   📉 주문 차감 기록: {stock_transactions.count()}건")
                    print(f"   ➖ 총 차감량: {abs(total_ordered_deduction)} {unit}")
                    print(f"   ✅ 현재 가용량: {available_stock} {unit}")
                    print(f"   📝 이번 주문: {quantity} {unit}")
                    
                    # 4. 재고 연동 상태 및 문제점 진단
                    inventory_exists = inventory_items.exists()
                    print(f"   🔗 재고시스템 연동: {'✅ 연결됨' if inventory_exists else '❌ 미연결'}")
                    
                    # 5. 실시간 재고 상태 판정
                    if not inventory_exists:
                        stock_issue_indicator = "⚫"  # 재고 관리에 미등록
                        print(f"   ⚫ 재고 관리 시스템에 미등록")
                    elif total_registered_stock <= 0:
                        stock_issue_indicator = "⚫"  # 등록된 재고가 0
                        print(f"   ⚫ 등록된 재고량이 0")
                    elif available_stock <= 0:
                        stock_issue_indicator = "🚫"  # 재고 완전 소진
                        print(f"   🚫 재고 완전 소진")
                    elif quantity > available_stock:
                        stock_issue_indicator = "❗"  # 주문량 > 가용재고
                        shortage = quantity - available_stock
                        print(f"   ❗ 재고 부족 (부족량: {shortage} {unit})")
                    elif available_stock <= total_registered_stock * 0.2:
                        stock_issue_indicator = "⚠️"  # 20% 이하 경고
                        print(f"   ⚠️ 재고 부족 위험 (20% 이하)")
                    else:
                        print(f"   ✅ 재고 충분")
                    
                    # 6. 재고 무결성 검증
                    if available_stock < 0:
                        print(f"   🚨 재고 무결성 오류: 가용재고가 음수 ({available_stock})")
                    if total_ordered_deduction > 0:
                        print(f"   🚨 차감 기록 오류: 차감량이 양수 ({total_ordered_deduction})")
                        
            except Exception as e:
                print(f"❌ 재고 체크 오류 (어종 {item.fish_type.name}): {e}")
                import traceback
                traceback.print_exc()
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
    
    class Meta:
        model = Order
        fields = [
            'id', 'business_name', 'business_phone', 'business_address',
            'total_price', 'order_datetime', 'delivery_datetime', 'ship_out_datetime',
            'order_status', 'cancel_reason', 'is_urgent', 'source_type', 
            'transcribed_text', 'memo', 'items'
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
        if order.payment_set.filter(payment_status='paid').exists():
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
