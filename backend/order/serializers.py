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
