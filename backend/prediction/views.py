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

# 모델 파일 경로 (최종 정규화 모델)
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'regularized_models_4years')

# 어종 매핑
SPECIES_MAPPING = {
    '(활)우럭': 'rockfish',
    '(활)넙치': 'flounder', 
    '(활)참숭어': 'mullet',
    '(활)참돔': 'red_sea_bream',
    '(활)농어': 'sea_bass'
}

# 역매핑 (영어 -> 한국어)
SPECIES_REVERSE_MAPPING = {v: k for k, v in SPECIES_MAPPING.items()}

def load_models():
    """학습된 모델들을 로드합니다."""
    models = {}
    
    for korean_name, english_name in SPECIES_MAPPING.items():
        try:
            # LightGBM 모델 로드 (2차 정규화 모델)
            lgb_model_path = os.path.join(MODEL_DIR, f'lightgbm_reg2_{english_name}.txt')
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
    """예측에 필요한 피처를 생성합니다."""
    
    # 날짜 파싱
    date_obj = datetime.strptime(target_date, '%Y-%m-%d')
    
    # 기본 피처 생성
    features = {
        'date': [date_obj],
        'year': [date_obj.year],
        'month': [date_obj.month],
        'day': [date_obj.day],
        'day_of_week': [date_obj.weekday()],
        'day_of_year': [date_obj.timetuple().tm_yday],
        'quarter': [(date_obj.month - 1) // 3 + 1],
        'is_weekend': [1 if date_obj.weekday() >= 5 else 0],
        'is_month_start': [1 if date_obj.day == 1 else 0],
        'is_month_end': [1 if date_obj.day in [28, 29, 30, 31] else 0],
    }
    
    # 계절성 피처
    features.update({
        'spring': [1 if date_obj.month in [3, 4, 5] else 0],
        'summer': [1 if date_obj.month in [6, 7, 8] else 0],
        'autumn': [1 if date_obj.month in [9, 10, 11] else 0],
        'winter': [1 if date_obj.month in [12, 1, 2] else 0],
    })
    
    # 어종별 계절성 피처
    for species in SPECIES_MAPPING.values():
        features[f'seasonal_{species}'] = [0]
    
    # 환경 데이터 피처
    features.update({
        'temperature': [environmental_data.get('temperature', 0)],
        'water_temperature': [environmental_data.get('water_temperature', 0)],
        'humidity': [environmental_data.get('humidity', 0)],
        'precipitation': [environmental_data.get('precipitation', 0)],
        'wind_speed': [environmental_data.get('wind_speed', 0)],
        'pressure': [environmental_data.get('pressure', 0)],
    })
    
    # 상호작용 피처
    features.update({
        'temp_humidity': [features['temperature'][0] * features['humidity'][0]],
        'temp_water_temp': [features['temperature'][0] * features['water_temperature'][0]],
        'month_temp': [features['month'][0] * features['temperature'][0]],
        'month_water_temp': [features['month'][0] * features['water_temperature'][0]],
    })
    
    # 시간 기반 피처
    features.update({
        'days_since_2020': [(date_obj - datetime(2020, 1, 1)).days],
        'month_sin': [np.sin(2 * np.pi * date_obj.month / 12)],
        'month_cos': [np.cos(2 * np.pi * date_obj.month / 12)],
        'day_sin': [np.sin(2 * np.pi * date_obj.day / 31)],
        'day_cos': [np.cos(2 * np.pi * date_obj.day / 31)],
        'day_of_year_sin': [np.sin(2 * np.pi * features['day_of_year'][0] / 365)],
        'day_of_year_cos': [np.cos(2 * np.pi * features['day_of_year'][0] / 365)],
    })
    
    # 어종별 특성 피처
    for species in SPECIES_MAPPING.values():
        features[f'is_{species}'] = [1 if species == species_name else 0]
    
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
        lgb_pred = lgb_model.predict(features_df)[0]
        
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
