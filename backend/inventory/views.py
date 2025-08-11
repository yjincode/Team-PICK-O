from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from core.middleware import get_user_queryset_filter
from .models import Inventory, InventoryLog
from .serializers import (
    InventorySerializer, InventoryLogSerializer, InventoryListSerializer,
    InventoryCreateSerializer, FishTypeSerializer
)
from fish_registry.models import FishType


class InventoryListCreateView(generics.ListCreateAPIView):
    """재고 목록 조회 및 생성"""
    permission_classes = []  # 인증 제거
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InventoryCreateSerializer
        return InventoryListSerializer
    
    def get_queryset(self):
        # 미들웨어에서 설정된 user_id 사용
        queryset = Inventory.objects.select_related('fish_type').filter(**get_user_queryset_filter(self.request))
        
        # 검색 기능
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(fish_type__name__icontains=search) |
                Q(status__icontains=search)
            )
        
        # 상태 필터
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset.order_by('-updated_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            inventory = serializer.save(user_id=request.user_id)
            
            # 재고 생성 로그 기록
            InventoryLog.objects.create(
                inventory=inventory,
                fish_type=inventory.fish_type,
                type='in',
                change=inventory.stock_quantity,
                before_quantity=0,
                after_quantity=inventory.stock_quantity,
                unit=inventory.unit,
                source_type='manual',
                memo='초기 재고 등록',
                updated_by=request.user
            )
            
            return Response(
                InventoryListSerializer(inventory).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """재고 상세 조회, 수정, 삭제"""
    serializer_class = InventorySerializer
    permission_classes = []
    
    def get_queryset(self):
        # 미들웨어에서 설정된 user_id 사용
        return Inventory.objects.select_related('fish_type').filter(**get_user_queryset_filter(self.request))
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_quantity = instance.stock_quantity
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            inventory = serializer.save()
            
            # 수량이 변경된 경우 로그 기록
            new_quantity = inventory.stock_quantity
            if old_quantity != new_quantity:
                change = new_quantity - old_quantity
                log_type = 'in' if change > 0 else 'out'
                
                InventoryLog.objects.create(
                    inventory=inventory,
                    fish_type=inventory.fish_type,
                    type=log_type,
                    change=abs(change),
                    before_quantity=old_quantity,
                    after_quantity=new_quantity,
                    unit=inventory.unit,
                    source_type='manual',
                    memo='재고 수량 수정',
                    updated_by=request.user
                )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InventoryLogListView(generics.ListAPIView):
    """재고 로그 목록 조회"""
    serializer_class = InventoryLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        inventory_id = self.kwargs.get('inventory_id')
        if inventory_id:
            return InventoryLog.objects.filter(
                inventory_id=inventory_id
            ).select_related('fish_type').order_by('-created_at')
        
        return InventoryLog.objects.select_related(
            'fish_type', 'inventory'
        ).order_by('-created_at')


class FishTypeListView(generics.ListAPIView):
    """어종 목록 조회 (재고 추가 시 선택용)"""
    serializer_class = FishTypeSerializer
    permission_classes = []  # 인증 제거 - 어종 목록은 공개
    
    def get_queryset(self):
        # 미들웨어에서 설정된 user_id 사용
        return FishType.objects.filter(**get_user_queryset_filter(self.request)).order_by('name')