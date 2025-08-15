from rest_framework import serializers
from .models import Business

class BusinessSerializer(serializers.ModelSerializer):
    outstanding_balance = serializers.ReadOnlyField()
    
    class Meta:
        model = Business
        fields = ['id', 'business_name', 'phone_number', 'address', 'outstanding_balance']