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

    class Meta:
        model = Order
        fields = [
            'id',
            'business_id',
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
        order_items_data = validated_data.pop('order_items')
        business_id = validated_data.pop('business_id')
        order = Order.objects.create(business_id=business_id, **validated_data)

        for item_data in order_items_data:
            fish_type_id = item_data.pop('fish_type_id')
            # inventory_id 제거됨
            OrderItem.objects.create(order=order, fish_type_id=fish_type_id, **item_data)

        return order


class OrderListSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.business_name')
    business_phone = serializers.CharField(source='business.phone_number')
    items_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'business_name', 'business_phone', 'total_price', 
            'order_datetime', 'delivery_datetime', 'order_status', 'is_urgent', 'items_summary'
        ]
    
    def get_items_summary(self, obj):
        items = obj.items.all()
        if not items:
            return "주문 항목 없음"
        
        item_names = [f"{item.fish_type.name} {item.quantity}{item.unit}" for item in items]
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
