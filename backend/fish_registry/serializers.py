from rest_framework import serializers
from .models import FishType

class FishTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishType
        fields = [
            'id',
            'name',
            'aliases',
            'scientific_name',
            'unit',
            'notes',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at'] 