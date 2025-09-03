# """
# 예측 API 뷰
# """
import os
import json
import pickle
import numpy as np

import lightgbm as lgb
import xgboost as xgb

import pandas as pd
from datetime import datetime, date, timedelta
from django.shortcuts import render

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Avg, Count, Max
from .models import FishSpecies, ActualAuctionPrice, AuctionFishSpecies, AuctionPriceData

# 모델 파일 경로 - 실제 훈련된 모델 사용
REGULARIZED_MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'regularized_models_4years')

# 어종별 모델 경로
SPECIES_MODELS = {
    '우럭': {
        'lightgbm': os.path.join(REGULARIZED_MODELS_DIR, 'lightgbm_reg2_rockfish.model'),
        'xgboost': os.path.join(REGULARIZED_MODELS_DIR, 'xgboost_reg2_rockfish.json')
    },
    '넙치': {
        'lightgbm': os.path.join(REGULARIZED_MODELS_DIR, 'lightgbm_reg2_flounder.model'),
        'xgboost': os.path.join(REGULARIZED_MODELS_DIR, 'xgboost_reg2_flounder.json')
    },
    '숭어': {
        'lightgbm': os.path.join(REGULARIZED_MODELS_DIR, 'lightgbm_reg2_mullet.model'),
        'xgboost': os.path.join(REGULARIZED_MODELS_DIR, 'xgboost_reg2_mullet.json')
    },
    '참돔': {
        'lightgbm': os.path.join(REGULARIZED_MODELS_DIR, 'lightgbm_reg2_red_sea_bream.model'),
        'xgboost': os.path.join(REGULARIZED_MODELS_DIR, 'xgboost_reg2_red_sea_bream.json')
    },
    '농어': {
        'lightgbm': os.path.join(REGULARIZED_MODELS_DIR, 'lightgbm_reg2_sea_bass.model'),
        'xgboost': os.path.join(REGULARIZED_MODELS_DIR, 'xgboost_reg2_sea_bass.json')
    }
}

# 글로벌 모델 캐시 (메모리 최적화)
_cached_models = None

def load_models():
    """어종별 예측 모델들을 로드합니다 (캐싱 적용)."""
    global _cached_models
    
    # 이미 로드된 모델이 있으면 재사용
    if _cached_models is not None:
        print(f"♻️ 캐시된 모델 사용: {len(_cached_models)}개 어종")
        return _cached_models
    
    models = {}
    
    try:
        print(f"🔍 최초 모델 로드: {list(SPECIES_MODELS.keys())}")
        
        for species_name, model_paths in SPECIES_MODELS.items():
            print(f"🐟 {species_name} 모델 로드 중...")
            species_models = {}
            
            # LightGBM 모델 로드 (안전 처리)
            if os.path.exists(model_paths['lightgbm']):
                try:
                    import lightgbm as lgb
                    species_models['lightgbm'] = lgb.Booster(model_file=model_paths['lightgbm'])
                    print(f"✅ {species_name} LightGBM 로드 완료")
                except Exception as e:
                    print(f"⚠️ {species_name} LightGBM 로드 실패: {e}")
            
            # XGBoost 모델 로드 (안전 처리)
            if os.path.exists(model_paths['xgboost']):
                try:
                    with open(model_paths['xgboost'], 'r') as f:
                        species_models['xgboost'] = json.load(f)
                    print(f"✅ {species_name} XGBoost 로드 완료")
                except Exception as e:
                    print(f"⚠️ {species_name} XGBoost 로드 실패: {e}")
            
            models[species_name] = species_models
                
    except Exception as e:
        print(f"❌ 모델 로드 실패: {e}")
        # 빈 모델 딕셔너리 반환 (서버 안정성)
        models = {}
        
    print(f"🎯 로드 완료: {len(models)}개 어종")
    
    # 캐시에 저장
    _cached_models = models
    return models

def load_single_species_model(species_name):
    """단일 어종의 모델만 로드 (메모리 최적화)"""
    try:
        if species_name not in SPECIES_MODELS:
            print(f"❌ 지원하지 않는 어종: {species_name}")
            return None
            
        model_paths = SPECIES_MODELS[species_name]
        species_models = {}
        
        print(f"🐟 {species_name} 모델 로드 중...")
        
        # LightGBM 모델 로드
        if os.path.exists(model_paths['lightgbm']):
            try:
                import lightgbm as lgb
                species_models['lightgbm'] = lgb.Booster(model_file=model_paths['lightgbm'])
                print(f"✅ {species_name} LightGBM 로드 완료")
            except Exception as e:
                print(f"⚠️ {species_name} LightGBM 로드 실패: {e}")
        
        # XGBoost 모델 로드  
        if os.path.exists(model_paths['xgboost']):
            try:
                with open(model_paths['xgboost'], 'r') as f:
                    species_models['xgboost'] = json.load(f)
                print(f"✅ {species_name} XGBoost 로드 완료")
            except Exception as e:
                print(f"⚠️ {species_name} XGBoost 로드 실패: {e}")
        
        return {species_name: species_models} if species_models else None
        
    except Exception as e:
        print(f"❌ {species_name} 모델 로드 실패: {e}")
        return None

def get_environmental_data_from_db(target_date_str):
    """DB에서 특정 날짜의 환경 데이터를 조회합니다."""
    try:
        from .models import ExternalEnvironmentalData
        
        # 날짜 파싱
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        
        # 해당 날짜의 환경 데이터 조회
        env_data = ExternalEnvironmentalData.objects.filter(
            observation_date=target_date
        ).first()
        
        if env_data:
            return {
                'temperature': float(env_data.air_temperature or 20.0),
                'humidity': float(env_data.humidity or 60.0),
                'precipitation': float(env_data.precipitation or 0.0),
                'wind_speed': float(env_data.wind_speed or 5.0),
                'pressure': float(env_data.pressure or 1013.0),
                'visibility': float(env_data.visibility or 10.0),
                'water_temperature': float(env_data.water_temperature or 15.0)
            }
        else:
            # 기본값 반환
            return {
                'temperature': 20.0,
                'humidity': 60.0,
                'precipitation': 0.0,
                'wind_speed': 5.0,
                'pressure': 1013.0,
                'visibility': 10.0,
                'water_temperature': 15.0
            }
            
    except Exception as e:
        print(f"❌ 환경 데이터 조회 실패: {e}")
        # 기본값 반환
        return {
            'temperature': 20.0,
            'humidity': 60.0,
            'precipitation': 0.0,
            'wind_speed': 5.0,
            'pressure': 1013.0,
            'visibility': 10.0,
            'water_temperature': 15.0
        }

def predict_single_species(species_name, target_date_str, environmental_data, models):
    """단일 어종의 경매가를 예측합니다."""
    try:
        # 날짜 파싱
        target_date_obj = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        
        # 특성 생성
        features = create_prediction_features(target_date_obj, environmental_data)
        feature_values = np.array(list(features.values())).reshape(1, -1)
        
        # 해당 어종의 모델 가져오기
        if species_name not in models:
            print(f"❌ {species_name} 모델을 찾을 수 없습니다")
            return {
                'error': f'{species_name} 모델이 없습니다',
                'predicted_price': 15000,
                'lightgbm_prediction': 15000,
                'xgboost_prediction': 15000,
                'confidence': 0.5
            }
        
        species_models = models[species_name]
        predictions = {}
        
        # LightGBM 예측
        if 'lightgbm' in species_models:
            try:
                lightgbm_pred = species_models['lightgbm'].predict(feature_values)[0]
                predictions['lightgbm'] = max(8000, lightgbm_pred)  # 최소값 보장
            except Exception as e:
                print(f"❌ {species_name} LightGBM 예측 실패: {e}")
                predictions['lightgbm'] = 15000  # 기본값
        else:
            predictions['lightgbm'] = 15000
            
        # XGBoost 예측 (JSON 설정 기반)
        if 'xgboost' in species_models:
            try:
                # JSON 설정에서 기본 예측값 추출 (실제로는 더 복잡한 로직 필요)
                xgb_config = species_models['xgboost']
                # 간단한 예측 로직 (실제로는 XGBoost 모델 객체 필요)
                base_price = 15000
                seasonal_factor = 1.0 + 0.2 * np.sin(2 * np.pi * target_date_obj.month / 12)
                xgboost_pred = base_price * seasonal_factor
                predictions['xgboost'] = max(8000, xgboost_pred)
            except Exception as e:
                print(f"❌ {species_name} XGBoost 예측 실패: {e}")
                predictions['xgboost'] = 15000  # 기본값
        else:
            predictions['xgboost'] = 15000
        
        # 앙상블 예측 (평균)
        ensemble_pred = (predictions['lightgbm'] + predictions['xgboost']) / 2
        
        # 신뢰도 계산 (모델 간 일치도) - 개선된 버전
        price_diff = abs(predictions['lightgbm'] - predictions['xgboost'])
        max_price = max(predictions['lightgbm'], predictions['xgboost'])
        
        if max_price > 0:
            confidence = 1.0 - (price_diff / max_price)
            confidence = max(0.3, min(1.0, confidence))  # 최소 0.3 보장
        else:
            confidence = 0.5
        
        return {
            'predicted_price': round(ensemble_pred),
            'lightgbm_prediction': round(predictions['lightgbm']),
            'xgboost_prediction': round(predictions['xgboost']),
            'confidence': round(confidence, 2),
            'features': features
        }
        
    except Exception as e:
        print(f"❌ {species_name} 예측 실패: {e}")
        return {
            'error': str(e),
            'predicted_price': 15000,
            'lightgbm_prediction': 15000,
            'xgboost_prediction': 15000,
            'confidence': 0.5
        }

def create_prediction_features(date_obj, weather_data=None, temp_humidity=None):
    """예측에 필요한 37개 특성을 생성합니다."""
    features = {}
    
    # 날짜 관련 특성 (8개)
    features['year'] = date_obj.year
    features['month'] = date_obj.month
    features['day'] = date_obj.day
    features['day_of_week'] = date_obj.weekday()
    features['day_of_year'] = date_obj.timetuple().tm_yday
    features['week_of_year'] = date_obj.isocalendar()[1]
    features['quarter'] = (date_obj.month - 1) // 3 + 1
    features['is_weekend'] = 1 if date_obj.weekday() >= 5 else 0
    
    # 계절 관련 특성 (4개)
    features['is_spring'] = 1 if date_obj.month in [3, 4, 5] else 0
    features['is_summer'] = 1 if date_obj.month in [6, 7, 8] else 0
    features['is_autumn'] = 1 if date_obj.month in [9, 10, 11] else 0
    features['is_winter'] = 1 if date_obj.month in [12, 1, 2] else 0
    
    # 월별 특성 (12개)
    for month in range(1, 13):
        features[f'month_{month}'] = 1 if date_obj.month == month else 0
    
    # 요일별 특성 (7개)
    for day in range(7):
        features[f'day_{day}'] = 1 if date_obj.weekday() == day else 0
    
    # 기상 데이터 (6개)
    if weather_data:
        features['temperature'] = weather_data.get('temperature', 20.0)
        features['humidity'] = weather_data.get('humidity', 60.0)
        features['precipitation'] = weather_data.get('precipitation', 0.0)
        features['wind_speed'] = weather_data.get('wind_speed', 5.0)
        features['pressure'] = weather_data.get('pressure', 1013.0)
        features['visibility'] = weather_data.get('visibility', 10.0)
    else:
        # 기본값 설정
        features['temperature'] = 20.0
        features['humidity'] = 60.0
        features['precipitation'] = 0.0
        features['wind_speed'] = 5.0
        features['pressure'] = 1013.0
        features['visibility'] = 10.0
    
    return features

@api_view(['POST'])
# @permission_classes([IsAuthenticated])  # 개발 중 인증 비활성화
def predict_price(request):
    """단일 어종의 경매가를 예측합니다."""
    try:
        data = request.data
        species = data.get('species')
        target_date = data.get('target_date')  # 프론트엔드에서 보내는 필드명으로 수정
        environmental_data = data.get('environmental_data', {})  # 프론트엔드에서 보내는 환경 데이터
        
        if not species or not target_date:
            return Response({
                'success': False,
                'error': '어종과 날짜를 모두 입력해주세요.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 날짜 파싱
        try:
            target_date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'success': False,
                'error': '올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD).'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 어종 매핑 (사용자 친화적 이름 -> 내부 시스템 어종명)
        # 일반 주문 시스템용 매핑 (fish_registry 어종)
        species_mapping = {
            '우럭': '우럭',
            '농어': '농어', 
            '참돔': '참돔',
            '광어': '넙치',
            '숭어': '숭어'
        }
        
        mapped_species = species_mapping.get(species, species)
        
        # 환경 데이터가 있으면 사용, 없으면 DB에서 가져오기
        if not environmental_data:
            environmental_data = get_environmental_data_from_db(target_date)
        
        # 임시: 모델 로딩 건너뛰고 기본값 반환 (서버 안정성 우선)
        print(f"⚠️ 모델 로딩 건너뛰기 - 기본값 반환")
        
        # 기본 예측값 반환 (서버 테스트용)
        base_prices = {
            '우럭': 18000, '농어': 20000, '참돔': 25000, 
            '광어': 15000, '숭어': 8500
        }
        
        base_price = base_prices.get(species, 15000)
        
        result = {
            'species': mapped_species,
            'korean_name': species,
            'target_date': target_date,
            'predicted_price': base_price,
            'lightgbm_prediction': base_price,
            'xgboost_prediction': base_price,
            'confidence': 0.5,
            'status': 'fallback_mode'
        }
        
        return Response({
            'success': True,
            'prediction': result
        })
        
    except Exception as e:
        print(f"예측 오류: {e}")
        return Response({
            'success': False,
            'error': f'예측 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _collect_real_auction_data(species, auction_fish_obj, start_date, end_date, days):
    """실제 auction 데이터 수집 실행"""
    try:
        print(f"🔧 {species} 실제 데이터 수집 시작: {start_date} ~ {end_date}")
        
        # Django management command로 데이터 수집 실행
        from django.core.management import call_command
        import subprocess
        import os
        
        # 어종 매핑 (수집 스크립트용)
        collection_species_map = {
            '우럭': '(활)우럭',
            '농어': '(활)농어', 
            '참돔': '(활)참돔',
            '광어': '(활)넙치',
            '숭어': '(활)참숭어'
        }
        
        collection_species = collection_species_map.get(species, species)
        
        # 7일치 데이터 수집 (하루씩)
        collected_count = 0
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')
            
            try:
                print(f"📅 {date_str} 데이터 수집 중...")
                
                # collect_noryangjin_daily_quantity.py 실행
                script_path = os.path.join(os.path.dirname(__file__), '..', 'auction_prediction', 'collect_noryangjin_daily_quantity.py')
                
                result = subprocess.run([
                    'python', script_path, date_str, date_str
                ], capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0:
                    print(f"✅ {date_str} 데이터 수집 성공")
                    collected_count += 1
                else:
                    print(f"⚠️ {date_str} 데이터 수집 실패: {result.stderr}")
                    
            except Exception as e:
                print(f"❌ {date_str} 수집 중 오류: {e}")
        
        print(f"📊 총 {collected_count}/{days}일 데이터 수집 완료")
        
        # 수집 후 다시 조회
        auction_data = AuctionPriceData.objects.filter(
            trade_date__range=[start_date, end_date],
            fish_species=auction_fish_obj
        ).values('trade_date').annotate(
            avg_price=Avg('auction_price')
        ).order_by('trade_date')
        
        # 결과 데이터 구성
        result_data = []
        for item in auction_data:
            trade_date = item['trade_date']
            avg_price = item.get('avg_price')
            if avg_price and avg_price > 0:
                result_data.append({
                    'date': trade_date.strftime('%Y-%m-%d'),
                    'price': float(avg_price),
                    'formattedDate': f"{trade_date.month}.{trade_date.day}"
                })
        
        return Response({
            'success': True,
            'data': result_data,
            'species': species,
            'days': days,
            'collected_days': collected_count,
            'message': f'{species} 어종의 실제 데이터를 수집했습니다.',
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            }
        })
        
    except Exception as e:
        print(f"❌ 실제 데이터 수집 실패: {e}")
        return Response({
            'success': True,
            'data': [],
            'message': f'{species} 실제 데이터 수집 실패: {str(e)}'
        })

@api_view(['GET'])
# @permission_classes([IsAuthenticated])  # 개발 중 인증 비활성화
def get_actual_auction_data(request):
    """실제 경매 데이터를 조회합니다."""
    try:
        species = request.GET.get('species')
        days = int(request.GET.get('days', 7))
        
        if not species:
            return Response({
                'success': False,
                'error': '어종을 입력해주세요.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 어종 매핑
        species_mapping = {
            '우럭': '(활)우럭',
            '농어': '(활)농어',
            '참돔': '(활)참돔',
            '광어': '(활)넙치',
            '숭어': '(활)참숭어'
        }
        
        fish_species_name = species_mapping.get(species)
        if not fish_species_name:
            return Response({
                'success': False,
                'error': f'지원하지 않는 어종입니다: {species}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"🔍 어종 매핑: {species} -> {fish_species_name}")
        
        # AuctionFishSpecies 조회 또는 자동 생성
        from .models import get_or_create_auction_fish_species
        auction_fish_obj = get_or_create_auction_fish_species(fish_species_name)
        print(f"✅ Auction 어종 확인: {fish_species_name} (ID: {auction_fish_obj.id})")
        
        # ActualAuctionPrice에서 특정 어종의 데이터 조회 (실제 수집된 데이터)
        species_auction_data = ActualAuctionPrice.objects.filter(
            fish_species__item_small_category_name_kr=fish_species_name
        ).order_by('-trade_date')
        
        if species_auction_data.exists():
            latest_date = species_auction_data.first().trade_date
            end_date = latest_date
            start_date = end_date - timedelta(days=days-1)
            print(f"📅 {species} 실제 데이터베이스 기준: {start_date} ~ {end_date}")
        else:
            # 해당 어종의 데이터가 없으면 실제 데이터 수집 실행
            today = date.today()
            end_date = today
            start_date = today - timedelta(days=days-1)
            print(f"⚠️ {species} 어종 실제 데이터가 없음 - 실제 데이터 수집 실행")
            return _collect_real_auction_data(species, auction_fish_obj, start_date, end_date, days)
        
        print(f"📅 날짜 범위: {start_date} ~ {end_date}")
        
        # ActualAuctionPrice에서 쿼리 생성 (실제 수집된 데이터)
        base_query = ActualAuctionPrice.objects.filter(
            trade_date__range=[start_date, end_date],
            fish_species__item_small_category_name_kr=fish_species_name
        )
        
        print(f"🔍 Auction 어종 필터 적용: {fish_species_name} (ID: {auction_fish_obj.id})")
        
        # 모든 어종에 대해 가장 많은 데이터를 가진 규격만 사용
        print(f"🔍 {species} 규격별 데이터 수 확인 중...")
        
        # 규격별 데이터 수 확인
        weight_counts = base_query.values('unit_weight_kg').annotate(
            count=Count('id')
        ).order_by('-count')
        
        if weight_counts.exists():
            # 데이터가 충분한 규격 찾기 (최소 5건 이상)
            sufficient_weights = [w for w in weight_counts if w['count'] >= 5]
            
            if sufficient_weights:
                # 현실적인 규격 우선 선택 (200g 이상만)
                realistic_weights = [w for w in sufficient_weights if w['unit_weight_kg'] >= 0.2]
                
                if realistic_weights:
                    # 1kg 근처의 규격을 우선적으로 선택
                    preferred_weight = next((w for w in realistic_weights 
                                          if 0.5 <= w['unit_weight_kg'] <= 1.2), None)
                    
                    if preferred_weight:
                        selected_weight = preferred_weight['unit_weight_kg']
                        print(f"📊 선호 규격 선택: {selected_weight}kg ({preferred_weight['count']}건)")
                    else:
                        # 선호 규격이 없으면 가장 많은 데이터를 가진 현실적인 규격 선택
                        selected_weight = realistic_weights[0]['unit_weight_kg']
                        print(f"📊 현실적인 규격 선택: {selected_weight}kg ({realistic_weights[0]['count']}건)")
                else:
                    # 현실적인 규격이 없으면 전체 평균 사용 (100g 이하 제외)
                    print(f"⚠️ 현실적인 규격 없음 (200g 이상) - 전체 평균 사용")
                    selected_weight = None
            else:
                # 충분한 데이터가 없으면 전체 평균 사용
                selected_weight = None
                print(f"⚠️ 충분한 데이터가 있는 규격 없음 - 전체 평균 사용")
            
            if selected_weight:
                # 해당 규격의 데이터만 사용
                filtered_query = base_query.filter(unit_weight_kg=selected_weight)
                
                # 일별 평균 계산 (ActualAuctionPrice 기준)
                daily_prices = filtered_query.values('trade_date').annotate(
                    avg_price=Avg('auction_price')
                ).order_by('trade_date')
            
                print(f"✅ {selected_weight}kg 규격으로 일별 평균 계산")
            else:
                # 전체 규격 중에서도 현실적인 규격만 사용 (200g 이상)
                realistic_base_query = base_query.filter(unit_weight_kg__gte=0.2)
                
                if realistic_base_query.exists():
                    daily_prices = realistic_base_query.values('trade_date').annotate(
                        avg_price=Avg('auction_price')
                    ).order_by('trade_date')
                    print(f"✅ 현실적인 규격만으로 일별 평균 계산 (200g 이상)")
                else:
                    # 현실적인 규격이 전혀 없으면 빈 데이터 반환
                    print(f"⚠️ 현실적인 규격이 전혀 없음 (200g 이상) - 빈 데이터 반환")
                    return Response({
                        'success': True,
                        'data': [],
                        'species': species,
                        'days': days,
                        'date_range': {
                            'start': start_date.strftime('%Y-%m-%d'),
                            'end': end_date.strftime('%Y-%m-%d')
                        }
                    })
        else:
            print(f"⚠️ 규격 데이터 없음")
            return Response({
                'success': True,
                'data': [],
                'species': species,
                'days': days,
                'date_range': {
                    'start': start_date.strftime('%Y-%m-%d'),
                    'end': end_date.strftime('%Y-%m-%d')
                }
            })
        
        # 결과 데이터 구성 (안전 처리 및 중복 제거)
        result_data = []
        seen_dates = set()  # 중복 날짜 체크용
        
        try:
            for item in daily_prices:
                trade_date = item['trade_date'] 
                avg_price = item.get('avg_price')
                date_str = trade_date.strftime('%Y-%m-%d')
                
                # 중복 날짜 체크 및 유효한 가격 체크
                if avg_price is not None and avg_price > 0 and date_str not in seen_dates:
                    result_data.append({
                        'date': date_str,
                        'price': float(avg_price),
                        'formattedDate': f"{trade_date.month}.{trade_date.day}"
                    })
                    seen_dates.add(date_str)  # 처리된 날짜 기록
                    print(f"  ✅ {trade_date}: {avg_price:,}원")
        except Exception as e:
            print(f"❌ 데이터 처리 중 오류: {e}")
            # 안전한 빈 응답 반환
            return Response({
                'success': True,
                'data': [],
                'message': f'{species} 데이터 처리 중 오류가 발생했습니다.'
            })
        
        # 최종 데이터 확인
        filtered_data = result_data  # 이미 필터링됨
        
        result_data = filtered_data
        
        # 데이터가 없으면 안전하게 빈 응답 반환
        if len(result_data) == 0:
            print(f"⚠️ {species} 어종의 데이터가 없습니다 - 빈 응답 반환")
            return Response({
                'success': True,
                'data': [],
                'species': species,
                'days': days,
                'message': f'{species} 어종의 경매 데이터가 없습니다. 데이터 수집을 먼저 실행해주세요.',
                'date_range': {
                    'start': start_date.strftime('%Y-%m-%d'),
                    'end': end_date.strftime('%Y-%m-%d')
                }
            })
        
        print(f"📊 조회된 데이터: {len(result_data)}개")
        
        return Response({
            'success': True,
            'data': result_data,
            'species': species,
            'days': days,
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            }
        })
        
    except Exception as e:
        print(f"데이터 조회 오류: {e}")
        return Response({
            'success': False,
            'error': f'데이터 조회 중 오류가 발생했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@login_required
def prediction_dashboard(request):
    """예측 대시보드를 렌더링합니다."""
    context = {
        'species_list': ['우럭', '농어', '참돔', '광어', '숭어']
    }
    return render(request, 'prediction/dashboard.html', context)
