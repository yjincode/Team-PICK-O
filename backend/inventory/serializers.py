from rest_framework import serializers
from .models import Inventory, InventoryLog, InventoryAnomaly, InventoryPattern, StockTransaction
from fish_registry.models import FishType


class FishTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishType
        fields = ['id', 'name', 'unit', 'aliases']


class InventorySerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'user', 'user_username', 'fish_type', 'fish_type_name',
            'stock_quantity', 'ordered_quantity', 'unit', 'status',
            'unit_price', 'total_amount', 'aquarium_photo_path', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class InventoryLogSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    inventory_id = serializers.IntegerField(source='inventory.id', read_only=True)
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = InventoryLog
        fields = [
            'id', 'inventory', 'inventory_id', 'fish_type', 'fish_type_name',
            'type', 'change', 'before_quantity', 'after_quantity', 'unit',
            'unit_price', 'total_amount', 'source_type', 'memo', 
            'updated_by', 'updated_by_username', 'created_at',
            'anomaly_score', 'is_anomaly', 'anomaly_type'
        ]
        read_only_fields = ['created_at']


class InventoryAnomalySerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='inventory.fish_type.name', read_only=True)
    log_id = serializers.IntegerField(source='log.id', read_only=True)
    resolved = serializers.SerializerMethodField()
    
    def get_resolved(self, obj):
        return obj.resolved_at is not None
    
    class Meta:
        model = InventoryAnomaly
        fields = [
            'id', 'log', 'log_id', 'inventory', 'fish_type_name',
            'anomaly_type', 'severity', 'confidence_score',
            'detected_at', 'resolved_at', 'resolved', 'description',
            'ai_model_version', 'features_used', 'prediction_horizon', 'recommended_action'
        ]
        read_only_fields = ['detected_at']


class InventoryPatternSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    
    class Meta:
        model = InventoryPattern
        fields = [
            'id', 'fish_type', 'fish_type_name', 'pattern_type',
            'pattern_data', 'confidence_interval', 'last_updated', 'is_active'
        ]
        read_only_fields = ['last_updated']


class StockTransactionSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = StockTransaction
        fields = [
            'id', 'user', 'user_username', 'fish_type', 'fish_type_name',
            'inventory', 'order', 'transaction_type', 'quantity_change',
            'unit', 'created_at', 'notes'
        ]
        read_only_fields = ['created_at']


# 이상 탐지 결과 요약용 Serializer
class AnomalySummarySerializer(serializers.Serializer):
    total_anomalies = serializers.IntegerField()
    critical_anomalies = serializers.IntegerField()
    high_anomalies = serializers.IntegerField()
    medium_anomalies = serializers.IntegerField()
    low_anomalies = serializers.IntegerField()
    unresolved_anomalies = serializers.IntegerField()
    recent_anomalies = serializers.ListField(child=InventoryAnomalySerializer())


# 재고 상태 요약용 Serializer
class InventorySummarySerializer(serializers.Serializer):
    total_items = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    abnormal_items = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    recent_changes = serializers.ListField(child=InventoryLogSerializer())


class InventoryListSerializer(serializers.ModelSerializer):
    fish_type_name = serializers.CharField(source='fish_type.name', read_only=True)
    fish_type_id = serializers.IntegerField(source='fish_type.id', read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'fish_type_id', 'fish_type_name', 'stock_quantity', 'unit', 'status', 
            'unit_price', 'total_amount', 'safety_stock_quantity', 'reorder_point', 'updated_at'
        ]


class InventoryCreateSerializer(serializers.ModelSerializer):
    fish_type_id = serializers.IntegerField()
    unit_price = serializers.IntegerField(required=False, allow_null=True)
    total_amount = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = Inventory
        fields = ['fish_type_id', 'stock_quantity', 'unit', 'status', 'aquarium_photo_path', 'unit_price', 'total_amount']
        
    def validate_fish_type_id(self, value):
        """어종이 존재하는지 확인"""
        try:
            FishType.objects.get(id=value)
        except FishType.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 어종입니다.")
        return value
        
    def validate(self, data):
        """기본 검증만 수행 (중복 어종 검증 제거 - 프론트엔드에서 처리)"""
        # 단가가 입력되지 않은 경우 어종의 기본 단가 사용
        if 'unit_price' not in data or not data['unit_price']:
            fish_type = FishType.objects.get(id=data['fish_type_id'])
            if fish_type.default_price:
                data['unit_price'] = fish_type.default_price
                # 총액 자동 계산
                if data['stock_quantity'] and data['unit_price']:
                    data['total_amount'] = data['stock_quantity'] * data['unit_price']
        
        # 총액이 입력되지 않은 경우 자동 계산
        if 'total_amount' not in data or not data['total_amount']:
            if data.get('stock_quantity') and data.get('unit_price'):
                data['total_amount'] = data['stock_quantity'] * data['unit_price']
        
        return data

    def create(self, validated_data):
        fish_type_id = validated_data.pop('fish_type_id')
        unit_price = validated_data.pop('unit_price', None)
        total_amount = validated_data.pop('total_amount', None)
        
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