from rest_framework import serializers
from .models import Business

class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'business_name', 'phone_number', 'address']