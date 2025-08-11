from django.shortcuts import render
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import FishType
from .serializers import FishTypeSerializer
from core.middleware import get_user_queryset_filter
import json

User = get_user_model()

@method_decorator(csrf_exempt, name='dispatch')
class FishTypeView(View):
    """
    어종 관리 CRUD API - Django View 사용
    JWT 토큰 기반 인증 및 사용자별 데이터 조회
    """
    
    def get(self, request, fish_type_id=None):
        """어종 목록 조회 또는 단일 어종 조회"""
        try:
            # 미들웨어에서 설정된 사용자 정보 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
            
            print(f"🐟 어종 조회 요청: user_id={request.user_id}, fish_type_id={fish_type_id}")
            
            if fish_type_id:
                # 단일 어종 조회
                try:
                    fish_type = FishType.objects.get(id=fish_type_id, user_id=request.user_id)
                    serializer = FishTypeSerializer(fish_type)
                    return JsonResponse(serializer.data, status=200)
                except FishType.DoesNotExist:
                    return JsonResponse({'error': '어종을 찾을 수 없습니다.'}, status=404)
            else:
                # 어종 목록 조회 (사용자별)
                fish_types = FishType.objects.filter(user_id=request.user_id).order_by('name')
                serializer = FishTypeSerializer(fish_types, many=True)
                return JsonResponse(serializer.data, safe=False, status=200)
                
        except Exception as e:
            print(f"❌ 어종 조회 오류: {e}")
            return JsonResponse({'error': '어종 조회 중 오류가 발생했습니다.'}, status=500)
    
    def post(self, request):
        """새 어종 생성"""
        try:
            # 미들웨어에서 설정된 사용자 정보 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
            
            print(f"🐟 어종 생성 요청: user_id={request.user_id}")
            
            # JSON 데이터 파싱
            try:
                data = json.loads(request.body)
                print(f"📋 생성 데이터: {data}")
            except json.JSONDecodeError as e:
                return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
            
            # Serializer 검증
            serializer = FishTypeSerializer(data=data)
            if serializer.is_valid():
                # 사용자 ID 설정하여 저장
                fish_type = serializer.save(user_id=request.user_id)
                print(f"✅ 어종 생성 성공: {fish_type.id}")
                return JsonResponse(serializer.data, status=201)
            else:
                print(f"❌ Serializer 검증 실패: {serializer.errors}")
                return JsonResponse(serializer.errors, status=400)
                
        except Exception as e:
            print(f"❌ 어종 생성 오류: {e}")
            return JsonResponse({'error': '어종 생성 중 오류가 발생했습니다.'}, status=500)
    
    def put(self, request, fish_type_id):
        """어종 정보 수정"""
        try:
            # 미들웨어에서 설정된 사용자 정보 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
            
            print(f"🐟 어종 수정 요청: user_id={request.user_id}, fish_type_id={fish_type_id}")
            
            # 기존 어종 조회
            try:
                fish_type = FishType.objects.get(id=fish_type_id, user_id=request.user_id)
            except FishType.DoesNotExist:
                return JsonResponse({'error': '어종을 찾을 수 없습니다.'}, status=404)
            
            # JSON 데이터 파싱
            try:
                data = json.loads(request.body)
                print(f"📋 수정 데이터: {data}")
            except json.JSONDecodeError as e:
                return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
            
            # Serializer 검증 및 저장
            serializer = FishTypeSerializer(fish_type, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                print(f"✅ 어종 수정 성공: {fish_type_id}")
                return JsonResponse(serializer.data, status=200)
            else:
                print(f"❌ Serializer 검증 실패: {serializer.errors}")
                return JsonResponse(serializer.errors, status=400)
                
        except Exception as e:
            print(f"❌ 어종 수정 오류: {e}")
            return JsonResponse({'error': '어종 수정 중 오류가 발생했습니다.'}, status=500)
    
    def delete(self, request, fish_type_id):
        """어종 삭제"""
        try:
            # 미들웨어에서 설정된 사용자 정보 확인
            if not hasattr(request, 'user_id') or not request.user_id:
                return JsonResponse({'error': '사용자 인증이 필요합니다.'}, status=401)
            
            print(f"🐟 어종 삭제 요청: user_id={request.user_id}, fish_type_id={fish_type_id}")
            
            # 기존 어종 조회 및 삭제
            try:
                fish_type = FishType.objects.get(id=fish_type_id, user_id=request.user_id)
                fish_type.delete()
                print(f"✅ 어종 삭제 성공: {fish_type_id}")
                return JsonResponse({'message': '어종이 삭제되었습니다.'}, status=200)
            except FishType.DoesNotExist:
                return JsonResponse({'error': '어종을 찾을 수 없습니다.'}, status=404)
                
        except Exception as e:
            print(f"❌ 어종 삭제 오류: {e}")
            return JsonResponse({'error': '어종 삭제 중 오류가 발생했습니다.'}, status=500)
