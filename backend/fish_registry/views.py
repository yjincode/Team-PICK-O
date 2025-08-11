from django.shortcuts import render
from rest_framework import viewsets, filters
from .models import FishType
from .serializers import FishTypeSerializer
from core.middleware import get_user_queryset_filter

class FishTypeViewSet(viewsets.ModelViewSet):
    """
    어종 관리 CRUD API
    """
    serializer_class = FishTypeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'aliases']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    permission_classes = []  # 인증 제거 - 어종 데이터는 공개
    
    def get_queryset(self):
        # 미들웨어에서 설정된 user_id 사용
        return FishType.objects.filter(**get_user_queryset_filter(self.request))
    
    def perform_create(self, serializer):
        # 어종 생성 시 사용자 설정
        serializer.save(user_id=self.request.user_id)
