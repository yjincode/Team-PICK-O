from rest_framework import serializers
from .models import Inventory, InventoryLog
from fish_registry.models import FishType


class FishTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishType
        fields = ['id', 'name', 'unit', 'aliases']


class InventorySerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    fish_type_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'fish_type_id', 'fish_type_name', 'stock_quantity', 
            'unit', 'status', 'aquarium_photo_path', 'updated_at'
        ]
        read_only_fields = ['updated_at']

    def create(self, validated_data):
        fish_type_id = validated_data.pop('fish_type_id')
        fish_type = FishType.objects.get(id=fish_type_id)
        inventory = Inventory.objects.create(fish_type=fish_type, **validated_data)
        return inventory

    def update(self, instance, validated_data):
        if 'fish_type_id' in validated_data:
            fish_type_id = validated_data.pop('fish_type_id')
            fish_type = FishType.objects.get(id=fish_type_id)
            instance.fish_type = fish_type
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class InventoryLogSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    inventory_id = serializers.IntegerField(write_only=True)
    fish_type_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = InventoryLog
        fields = [
            'id', 'inventory_id', 'fish_type_id', 'fish_type_name', 'type', 
            'change', 'before_quantity', 'after_quantity', 'unit', 
            'source_type', 'memo', 'created_at'
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        inventory_id = validated_data.pop('inventory_id')
        fish_type_id = validated_data.pop('fish_type_id')
        
        inventory = Inventory.objects.get(id=inventory_id)
        fish_type = FishType.objects.get(id=fish_type_id)
        
        inventory_log = InventoryLog.objects.create(
            inventory=inventory,
            fish_type=fish_type,
            **validated_data
        )
        return inventory_log


class InventoryListSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'fish_type_name', 'stock_quantity', 'unit', 'status', 'updated_at'
        ]


class InventoryCreateSerializer(serializers.ModelSerializer):
    fish_type_id = serializers.IntegerField()
    
    class Meta:
        model = Inventory
        fields = ['fish_type_id', 'stock_quantity', 'unit', 'status', 'aquarium_photo_path']
        
    def validate_fish_type_id(self, value):
        """어종이 존재하는지 확인"""
        try:
            FishType.objects.get(id=value)
        except FishType.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 어종입니다.")
        return value
        
    def validate(self, data):
        """기본 검증만 수행 (중복 어종 검증 제거 - 프론트엔드에서 처리)"""
        return data

    def create(self, validated_data):
        fish_type_id = validated_data.pop('fish_type_id')
        fish_type = FishType.objects.get(id=fish_type_id)
        user_id = validated_data.get('user_id')  # views.py에서 전달
        
        # 같은 어종의 기존 재고가 있는지 확인
        existing_inventory = Inventory.objects.filter(
            fish_type_id=fish_type_id, 
            user_id=user_id
        ).first()
        
        if existing_inventory:
            # 기존 재고가 있으면 수량을 더함
            existing_inventory.stock_quantity += validated_data['stock_quantity']
            existing_inventory.save()
            return existing_inventory
        else:
            # 새로운 재고 생성
            inventory = Inventory.objects.create(fish_type=fish_type, **validated_data)
            return inventory