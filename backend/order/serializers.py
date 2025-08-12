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
    business_id = serializers.IntegerField()
    user_id = serializers.IntegerField(required=False)  # user_id 필드 명시적 추가

    class Meta:
        model = Order
        fields = [
            'id',
            'business_id',
            'user_id',  # user_id 필드 추가
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
        print(f"🏗️ OrderSerializer.create() 호출됨 - 새 버전 3.0")
        print(f"📦 validated_data keys: {list(validated_data.keys())}")
        
        order_items_data = validated_data.pop('order_items')
        business_id = validated_data.pop('business_id')
        
        print(f"🏢 추출된 business_id: {business_id}")
        
        # user_id는 save() 메서드에서 전달받음
        order = Order.objects.create(
            business_id=business_id, 
            **validated_data
        )
        
        print(f"🎯 생성된 주문 ID: {order.id}, user_id: {order.user_id}")
        print(f"🏪 생성된 주문 business_id: {order.business_id}")

        for item_data in order_items_data:
            fish_type_id = item_data.pop('fish_type_id')
            # inventory_id 제거됨
            OrderItem.objects.create(order=order, fish_type_id=fish_type_id, **item_data)

        return order


class OrderListSerializer(serializers.ModelSerializer):
    business = serializers.SerializerMethodField()
    items_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'business', 'total_price', 
            'order_datetime', 'delivery_datetime', 'order_status', 'is_urgent', 'items_summary'
        ]
    
    def get_business(self, obj):
        if obj.business:
            return {
                'id': obj.business.id,
                'business_name': obj.business.business_name,
                'phone_number': obj.business.phone_number
            }
        return {
            'id': obj.business_id,
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
            
            item_names.append(f"{item.fish_type.name} {quantity_str}{unit}")
        
        return ", ".join(item_names[:3]) + ("..." if len(item_names) > 3 else "")


class OrderDetailItemSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name')
    
    class Meta:
        model = OrderItem
        fields = [
            'fish_type_name', 'item_name_snapshot', 'quantity', 
            'unit_price', 'unit_price_snapshot', 'unit', 'remarks'
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.business_name')
    business_phone = serializers.CharField(source='business.phone_number')
    business_address = serializers.CharField(source='business.address')
    items = OrderDetailItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'business_name', 'business_phone', 'business_address',
            'total_price', 'order_datetime', 'delivery_datetime', 'ship_out_datetime',
            'order_status', 'cancel_reason', 'is_urgent', 'source_type', 
            'transcribed_text', 'memo', 'items'
        ]


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['order_status']
