from django.shortcuts import render
from rest_framework import viewsets, filters
from .models import FishType
from .serializers import FishTypeSerializer

class FishTypeViewSet(viewsets.ModelViewSet):
    """
    어종 관리 CRUD API
    """
    queryset = FishType.objects.all()
    serializer_class = FishTypeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'aliases', 'scientific_name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    permission_classes = []  # 인증 제거 - 어종 데이터는 공개
