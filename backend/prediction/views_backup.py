"""
예측 API 뷰
"""
import os
import pickle
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

import pandas as pd
import numpy as np
import lightgbm as lgb
import xgboost as xgb
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# 모델 import 추가
from .models import FishSpecies, ActualAuctionPrice

# 모델 파일 경로 (최종 정규화 모델)
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'regularized_models_4years')

# 어종 매핑
SPECIES_MAPPING = {
    '(활)우럭': 'rockfish',
    '(활)넙치': 'flounder', 
    '(활)참숭어': 'mullet',
    '(활)참돔': 'red_sea_bream',
    '(활)농어': 'sea_bass',
    # 일반 어종명도 추가
    '우럭': 'rockfish',
    '넙치': 'flounder',
    '광어': 'flounder',  # 광어는 넙치와 동일
    '참숭어': 'mullet',
    '참돔': 'red_sea_bream',
    '농어': 'sea_bass'
}

# 역매핑 (영어 -> 한국어)
SPECIES_REVERSE_MAPPING = {v: k for k, v in SPECIES_MAPPING.items()}

def load_models():
    """학습된 모델들을 로드합니다."""
    models = {}
    
    for korean_name, english_name in SPECIES_MAPPING.items():
        try:
            # LightGBM 모델 로드 (2차 정규화 모델) - .model 확장자로 수정
            lgb_model_path = os.path.join(MODEL_DIR, f'lightgbm_reg2_{english_name}.model')
            if os.path.exists(lgb_model_path):
                lgb_model = lgb.Booster(model_file=lgb_model_path)
                models[f'lgb_{english_name}'] = lgb_model
            
            # XGBoost 모델 로드 (2차 정규화 모델)
            xgb_model_path = os.path.join(MODEL_DIR, f'xgboost_reg2_{english_name}.json')
            if os.path.exists(xgb_model_path):
                xgb_model = xgb.XGBRegressor()
                xgb_model.load_model(xgb_model_path)
                models[f'xgb_{english_name}'] = xgb_model
                
        except Exception as e:
            print(f"모델 로드 실패 {english_name}: {e}")
    
    return models

def create_prediction_features(target_date: str, environmental_data: Dict[str, Any], species_name: str) -> pd.DataFrame:
    """예측에 필요한 피처를 생성합니다. (모델이 기대하는 정확한 피처들)"""
    
    # 날짜 파싱
    date_obj = datetime.strptime(target_date, '%Y-%m-%d')
    
    # 모델이 기대하는 정확한 피처들 (37개)
    features = {
        'year': [date_obj.year],
        'month': [date_obj.month],
        'day': [date_obj.day],
        'day_of_week': [date_obj.weekday()],
        'day_of_year': [date_obj.timetuple().tm_yday],
        'quarter': [date_obj.quarter],
        'is_weekend': [1 if date_obj.weekday() >= 5 else 0],
        'avg_temperature': [environmental_data.get('temperature', 0)],
        'water_temperature': [environmental_data.get('water_temperature', 0)],
        'humidity': [environmental_data.get('humidity', 0)],
        'pressure': [environmental_data.get('pressure', 0)],
        'wind_speed': [environmental_data.get('wind_speed', 0)],
        'rainfall': [environmental_data.get('precipitation', 0)],
        'max_temperature': [environmental_data.get('max_temperature', environmental_data.get('temperature', 0))],
        'min_temperature': [environmental_data.get('min_temperature', environmental_data.get('temperature', 0))],
        'season_encoded': [0],  # 기본값
        'temp_humidity': [environmental_data.get('temperature', 0) * environmental_data.get('humidity', 0)],
        'temp_water_temp': [environmental_data.get('temperature', 0) * environmental_data.get('water_temperature', 0)],
        'month_temp': [date_obj.month * environmental_data.get('temperature', 0)],
        'month_water_temp': [date_obj.month * environmental_data.get('water_temperature', 0)],
        'days_since_2020': [(date_obj - datetime(2020, 1, 1)).days],
        'month_sin': [np.sin(2 * np.pi * date_obj.month / 12)],
        'month_cos': [np.cos(2 * np.pi * date_obj.month / 12)],
        'day_sin': [np.sin(2 * np.pi * date_obj.day / 31)],
        'day_cos': [np.cos(2 * np.pi * date_obj.day / 31)],
        'day_of_year_sin': [np.sin(2 * np.pi * date_obj.timetuple().tm_yday / 365)],
        'day_of_year_cos': [np.cos(2 * np.pi * date_obj.timetuple().tm_yday / 365)],
        'is_rockfish': [1 if species_name == 'rockfish' else 0],
        'seasonal_rockfish': [0],
        'is_flounder': [1 if species_name == 'flounder' else 0],
        'seasonal_flounder': [0],
        'is_mullet': [1 if species_name == 'mullet' else 0],
        'seasonal_mullet': [0],
        'is_red_sea_bream': [1 if species_name == 'red_sea_bream' else 0],
        'seasonal_red_sea_bream': [0],
        'is_sea_bass': [1 if species_name == 'sea_bass' else 0],
        'seasonal_sea_bass': [0],
    }
    
    # 결측값 처리
    for key in features:
        if features[key][0] is None or np.isnan(features[key][0]):
            features[key][0] = 0
    
    return pd.DataFrame(features)

def predict_price(species_name: str, target_date: str, environmental_data: Dict[str, Any], models: Dict) -> Dict[str, Any]:
    """단일 어종의 가격을 예측합니다."""
    
    try:
        # 피처 생성
        features_df = create_prediction_features(target_date, environmental_data, species_name)
        
        # 모델 예측
        lgb_model = models.get(f'lgb_{species_name}')
        xgb_model = models.get(f'xgb_{species_name}')
        
        if not lgb_model or not xgb_model:
            return {
                'error': f'모델을 찾을 수 없습니다: {species_name}',
                'species': species_name,
                'target_date': target_date
            }
        
        # LightGBM 예측
        lgb_pred = lgb_model.predict(features_df, predict_disable_shape_check=True)[0]
        
        # XGBoost 예측
        xgb_pred = xgb_model.predict(features_df)[0]
        
        # 앙상블 예측 (50:50)
        ensemble_pred = (lgb_pred + xgb_pred) / 2
        
        return {
            'species': species_name,
            'korean_name': SPECIES_REVERSE_MAPPING.get(species_name, species_name),
            'target_date': target_date,
            'predicted_price': round(ensemble_pred, 2),
            'lightgbm_prediction': round(lgb_pred, 2),
            'xgboost_prediction': round(xgb_pred, 2),
            'confidence': 'high' if abs(lgb_pred - xgb_pred) < 1000 else 'medium'
        }
        
    except Exception as e:
        return {
            'error': f'예측 중 오류 발생: {str(e)}',
            'species': species_name,
            'target_date': target_date
        }

# 전역 모델 변수
_models = None

def get_models():
    """모델을 로드하고 캐시합니다."""
    global _models
    if _models is None:
        _models = load_models()
    return _models

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def predict_single_species(request):
    """단일 어종 가격 예측 API"""
    
    try:
        data = request.data
        
        # 필수 필드 검증
        required_fields = ['species', 'target_date', 'environmental_data']
        for field in required_fields:
            if field not in data:
                return Response({
                    'error': f'필수 필드가 누락되었습니다: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        species = data['species']
        target_date = data['target_date']
        environmental_data = data['environmental_data']
        
        # 어종명 변환
        if species in SPECIES_MAPPING:
            species_english = SPECIES_MAPPING[species]
        elif species in SPECIES_REVERSE_MAPPING:
            species_english = species
        else:
            return Response({
                'error': f'지원하지 않는 어종입니다: {species}',
                'supported_species': list(SPECIES_MAPPING.keys())
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 모델 로드
        models = get_models()
        
        # 예측 수행
        result = predict_price(species_english, target_date, environmental_data, models)
        
        if 'error' in result:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'prediction': result
        })
        
    except Exception as e:
        return Response({
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def predict_all_species(request):
    """모든 어종 가격 예측 API"""
    
    try:
        data = request.data
        
        # 필수 필드 검증
        required_fields = ['target_date', 'environmental_data']
        for field in required_fields:
            if field not in data:
                return Response({
                    'error': f'필수 필드가 누락되었습니다: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        target_date = data['target_date']
        environmental_data = data['environmental_data']
        
        # 모델 로드
        models = get_models()
        
        # 모든 어종 예측
        predictions = []
        for korean_name, english_name in SPECIES_MAPPING.items():
            result = predict_price(english_name, target_date, environmental_data, models)
            if 'error' not in result:
                predictions.append(result)
        
        return Response({
            'success': True,
            'target_date': target_date,
            'predictions': predictions,
            'total_species': len(predictions)
        })
        
    except Exception as e:
        return Response({
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_supported_species(request):
    """지원하는 어종 목록 조회 API"""
    
    return Response({
        'success': True,
        'supported_species': [
            {
                'korean_name': korean_name,
                'english_name': english_name
            }
            for korean_name, english_name in SPECIES_MAPPING.items()
        ]
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def get_actual_auction_data(request):
    """실제 경매가 데이터 조회 API - 일주일치 데이터"""
    try:
        from datetime import datetime, timedelta
        from django.db.models import Avg
        
        # 쿼리 파라미터
        species = request.GET.get('species', '')
        days = int(request.GET.get('days', 7))  # 기본 7일
        
        # 날짜 범위 계산 (현재 날짜 기준 일주일 전)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        # 어종 필터링 - korean_name으로 변경
        fish_species = None
        if species:
            # (활) 접두사가 있는 경우
            if species in SPECIES_MAPPING:
                korean_name = species
                fish_species = FishSpecies.objects.filter(item_small_category_name_kr=korean_name).first()
            # (활) 접두사가 없는 경우 - 직접 매핑
            else:
                species_mapping_no_prefix = {
                    '우럭': '(활)우럭',
                    '넙치': '(활)넙치',  # 광어 -> 넙치
                    '참숭어': '(활)참숭어',
                    '참돔': '(활)참돔',
                    '농어': '(활)농어'
                }
                if species in species_mapping_no_prefix:
                    korean_name = species_mapping_no_prefix[species]
                    fish_species = FishSpecies.objects.filter(item_small_category_name_kr=korean_name).first()
        
        # 실제 경매가 데이터 조회 (FWT_M: 1kg/마리 = 1미 규격)
        query = ActualAuctionPrice.objects.filter(
            trade_date__range=[start_date, end_date],
            unit_weight_kg=1.00  # FWT_M: 1미 규격 (1kg/마리)
        )
        
        # 어종 필터링을 먼저 적용
        if fish_species:
            base_query = base_query.filter(fish_species=fish_species)
            print(f"🔍 어종 필터 적용: {fish_species}")
        
        # 우럭은 작은 생선이므로 더 작은 규격도 허용
        if species == '우럭':
            # 0.5kg 이상의 작은 규격 데이터 사용
            unit_weight_query = base_query.filter(unit_weight_kg__gte=0.5)
            print(f" 우럭 특별 처리: 0.5kg 이상 규격 사용")
        else:
            # 다른 어종은 1kg/마리만 사용
            unit_weight_query = base_query.filter(unit_weight_kg=1.00)
        
        if unit_weight_query.count() == 0:
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
        
        print(f"✅ 규격 데이터 사용 ({unit_weight_query.count()}개)")
        base_query = unit_weight_query
        
        # 어종별 + 일별 평균 가격 계산
        if species and fish_species:
            # 특정 어종만 조회
            daily_prices = base_query.values('trade_date').annotate(
                avg_price=Avg('auction_price')
            ).order_by('trade_date')
        else:
            # 모든 어종의 일별 평균 (어종 구분 없이)
            daily_prices = base_query.values('trade_date').annotate(
                avg_price=Avg('auction_price')
            ).order_by('trade_date')
        
        # 데이터 포맷팅
        formatted_data = []
        for item in daily_prices:
            formatted_data.append({
                'date': item['trade_date'].strftime('%Y-%m-%d'),
                'price': float(item['avg_price']) if item['avg_price'] else 0
            })
        
        return Response({
            'success': True,
            'data': formatted_data,
            'species': species,
            'days': days,
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            }
        })
        
    except Exception as e:
        return Response({
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """예측 모델 헬스 체크 API"""
    
    try:
        models = get_models()
        loaded_species = []
        
        for korean_name, english_name in SPECIES_MAPPING.items():
            lgb_model = models.get(f'lgb_{english_name}')
            xgb_model = models.get(f'xgb_{english_name}')
            
            if lgb_model and xgb_model:
                loaded_species.append(korean_name)
        
        return Response({
            'success': True,
            'status': 'healthy',
            'loaded_species': loaded_species,
            'total_species': len(SPECIES_MAPPING),
            'model_directory': MODEL_DIR
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def dashboard_view(request):
    """대시보드 뷰"""
    from django.shortcuts import render
    
    # 최근 7일간 예측 데이터 생성
    today = datetime.now().date()
    dates = [(today - timedelta(days=i)) for i in range(7)]
    
    # 모델 로드
    models = load_models()
    
    # 어종별 데이터
    species_mapping = {
        'rockfish': '우럭',
        'flounder': '넙치', 
        'mullet': '숭어',
        'red_sea_bream': '참돔',
        'sea_bass': '광어'
    }
    
    chart_data = {
        'dates': [],
        'species_data': {korean_name: [] for korean_name in species_mapping.values()},
        'environmental_data': {
            'water_temperature': [],
            'temperature': []
        }
    }
    
    for target_date in reversed(dates):  # 오래된 날짜부터
        target_date_str = target_date.strftime('%Y-%m-%d')
        chart_data['dates'].append(target_date_str)
        
        try:
            # 환경 데이터 조회
            environmental_data = get_environmental_data_from_db(target_date_str)
            
            chart_data['environmental_data']['water_temperature'].append(
                environmental_data.get('water_temperature', 0)
            )
            chart_data['environmental_data']['temperature'].append(
                environmental_data.get('temperature', 0)
            )
            
            # 각 어종별 예측
            for species_name, korean_name in species_mapping.items():
                result = predict_price(species_name, target_date_str, environmental_data, models)
                
                if result and 'error' not in result:
                    chart_data['species_data'][korean_name].append(result['predicted_price'])
                else:
                    chart_data['species_data'][korean_name].append(0)
                    
        except Exception as e:
            # 데이터가 없는 경우 0으로 채움
            chart_data['environmental_data']['water_temperature'].append(0)
            chart_data['environmental_data']['temperature'].append(0)
            for korean_name in species_mapping.values():
                chart_data['species_data'][korean_name].append(0)
    
    context = {
        'chart_data': json.dumps(chart_data),
        'species_list': json.dumps(list(species_mapping.values()))
    }
    
    return render(request, 'prediction/dashboard.html', context)
