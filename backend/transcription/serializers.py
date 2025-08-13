from rest_framework import serializers
from .models import AudioTranscription

class OrderSerializer(serializers.ModelSerializer):
    """Serializer for the Order model from the order app"""
    class Meta:
        model = 'order.Order'
        fields = ['id', 'status', 'total_price', 'delivery_date']
        read_only_fields = fields

class AudioTranscriptionSerializer(serializers.ModelSerializer):
    """Serializer for the AudioTranscription model"""
    order = OrderSerializer(read_only=True)
    order_id = serializers.UUIDField(
        write_only=True, 
        required=False,
        help_text="ID of the order to associate with this transcription"
    )
    business_id = serializers.PrimaryKeyRelatedField(
        queryset='order.Business.objects.all()',
        source='business',
        required=False,
        help_text="ID of the business this transcription is for"
    )
    
    class Meta:
        model = AudioTranscription
        fields = [
            'id',
            'user',
            'audio_file',
            'transcription',
            'status',
            'created_at',
            'updated_at',
            'language',
            'confidence',
            'create_order',
            'business_id',
            'business',
            'order',
            'order_id'
        ]
        read_only_fields = [
            'id',
            'user',
            'transcription',
            'status',
            'created_at',
            'updated_at',
            'confidence',
            'order'
        ]
        extra_kwargs = {
            'audio_file': {'write_only': True},
            'business': {'read_only': True}
        }
    
    def create(self, validated_data):
        """Handle creation of a new transcription"""
        # Set the current user as the owner
        validated_data['user'] = self.context['request'].user
        
        # Handle order creation flag
        business = validated_data.pop('business', None)
        if business:
            validated_data['business'] = business
            validated_data['create_order'] = True
        
        return super().create(validated_data)
