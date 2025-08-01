from rest_framework import serializers
from .models import User, Business, FishType, Inventory, Order, OrderItem, SMSRecommendation, Payment, PriceData


class UserRegistrationSerializer(serializers.ModelSerializer):
    """사용자 등록용 시리얼라이저"""
    
    class Meta:
        model = User
        fields = [
            'firebase_uid',
            'business_name', 
            'owner_name',
            'phone_number',
            'address', 
            'business_registration_number',
            'subscription_plan'
        ]
        
    def validate_firebase_uid(self, value):
        """Firebase UID 중복 체크"""
        if User.objects.filter(firebase_uid=value).exists():
            raise serializers.ValidationError("이미 등록된 Firebase UID입니다.")
        return value
        
    def validate_business_registration_number(self, value):
        """사업자등록번호 중복 체크"""
        if User.objects.filter(business_registration_number=value).exists():
            raise serializers.ValidationError("이미 등록된 사업자등록번호입니다.")
        return value


class UserSerializer(serializers.ModelSerializer):
    """사용자 정보 조회용 시리얼라이저"""
    
    class Meta:
        model = User
        fields = [
            'id',
            'business_name',
            'owner_name', 
            'phone_number',
            'address',
            'business_registration_number',
            'firebase_uid',
            'subscription_plan',
            'status',
            'created_at',
            'approved_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'approved_at']


class BusinessSerializer(serializers.ModelSerializer):
    """거래처 시리얼라이저"""
    
    class Meta:
        model = Business
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class FishTypeSerializer(serializers.ModelSerializer):
    """어종 시리얼라이저"""
    
    class Meta:
        model = FishType
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class InventorySerializer(serializers.ModelSerializer):
    """재고 시리얼라이저"""
    fish_type_name = serializers.CharField(source='fish_type.fish_name', read_only=True)
    
    class Meta:
        model = Inventory
        fields = '__all__'
        read_only_fields = ['id', 'user', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    """주문 아이템 시리얼라이저"""
    fish_type_name = serializers.CharField(source='fish_type.fish_name', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ['id']


class OrderSerializer(serializers.ModelSerializer):
    """주문 시리얼라이저"""
    order_items = OrderItemSerializer(many=True, read_only=True)
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['id', 'user']


class SMSRecommendationSerializer(serializers.ModelSerializer):
    """SMS 추천 시리얼라이저"""
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    
    class Meta:
        model = SMSRecommendation
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    """결제 시리얼라이저"""
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class PriceDataSerializer(serializers.ModelSerializer):
    """시세 데이터 시리얼라이저"""
    
    class Meta:
        model = PriceData
        fields = '__all__'
        read_only_fields = ['id']