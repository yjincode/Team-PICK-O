from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    fish_type_id = serializers.IntegerField()

    class Meta:
        model = OrderItem
        fields = ['fish_type_id', 'quantity', 'unit_price', 'unit']


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    business_id = serializers.IntegerField()

    class Meta:
        model = Order
        fields = [
            'id',
            'business_id',
            'total_price',
            'order_datetime',
            'delivery_date',
            'source_type',
            'raw_input_path',
            'transcribed_text',
            'memo',
            'status',
            'order_items'
        ]

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items')
        business_id = validated_data.pop('business_id')
        order = Order.objects.create(business_id=business_id, **validated_data)

        for item_data in order_items_data:
            fish_type_id = item_data.pop('fish_type_id')
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
            'order_datetime', 'delivery_date', 'status', 'items_summary'
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
        fields = ['fish_type_name', 'quantity', 'unit_price', 'unit']


class OrderDetailSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.business_name')
    business_phone = serializers.CharField(source='business.phone_number')
    business_address = serializers.CharField(source='business.address')
    items = OrderDetailItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'business_name', 'business_phone', 'business_address',
            'total_price', 'order_datetime', 'delivery_date', 'status',
            'source_type', 'transcribed_text', 'memo', 'items'
        ]


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']
