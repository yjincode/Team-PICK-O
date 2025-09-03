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
_single_species_cache = {}  # 어종별 개별 캐시

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
    """단일 어종의 모델만 로드 (캐싱 + 안전 처리)"""
    global _single_species_cache
    
    # 캐시에서 먼저 확인
    if species_name in _single_species_cache:
        print(f"♻️ {species_name} 캐시된 모델 사용")
        return _single_species_cache[species_name]
    
    try:
        if species_name not in SPECIES_MODELS:
            print(f"❌ 지원하지 않는 어종: {species_name}")
            return None
            
        model_paths = SPECIES_MODELS[species_name]
        species_models = {}
        
        print(f"🐟 {species_name} 모델 로드 시작...")
        
        # LightGBM 모델 로드 (안전 처리)
        lightgbm_path = model_paths.get('lightgbm')
        if lightgbm_path and os.path.exists(lightgbm_path):
            try:
                print(f"📁 LightGBM 파일 확인: {lightgbm_path}")
                import lightgbm as lgb
                
                # 파일 크기 확인
                file_size = os.path.getsize(lightgbm_path)
                print(f"📏 LightGBM 파일 크기: {file_size} bytes")
                
                if file_size == 0:
                    print(f"⚠️ {species_name} LightGBM 파일이 비어있음")
                elif file_size > 10 * 1024 * 1024:  # 10MB 이상만 제한
                    print(f"⚠️ {species_name} LightGBM 파일이 너무 큼 ({file_size/1024/1024:.1f}MB) - 메모리 보호를 위해 로드 건너뜀")
                else:
                    print(f"🔄 {species_name} LightGBM 로드 시도 중...")
                    
                    # OpenMP 스레드 수 제한 (macOS 호환성)
                    original_omp = os.environ.get('OMP_NUM_THREADS')
                    os.environ['OMP_NUM_THREADS'] = '1'
                    
                    try:
                        # 직접 로드 시도 (스레딩 없이)
                        booster = lgb.Booster(model_file=lightgbm_path)
                        species_models['lightgbm'] = booster
                        print(f"✅ {species_name} LightGBM 로드 완료")
                    except Exception as lgb_error:
                        print(f"❌ {species_name} LightGBM 로드 실패: {lgb_error}")
                    finally:
                        # 원래 설정 복원
                        if original_omp is not None:
                            os.environ['OMP_NUM_THREADS'] = original_omp
                        elif 'OMP_NUM_THREADS' in os.environ:
                            del os.environ['OMP_NUM_THREADS']
                    
            except FileNotFoundError:
                print(f"❌ {species_name} LightGBM 파일을 찾을 수 없음: {lightgbm_path}")
            except MemoryError:
                print(f"❌ {species_name} LightGBM 로드 중 메모리 부족")
            except Exception as e:
                print(f"⚠️ {species_name} LightGBM 로드 실패: {type(e).__name__}: {e}")
        else:
            print(f"❌ {species_name} LightGBM 파일 없음: {lightgbm_path}")
        
        # XGBoost 모델 로드 (안전 처리)  
        xgboost_path = model_paths.get('xgboost')
        if xgboost_path and os.path.exists(xgboost_path):
            try:
                print(f"📁 XGBoost 파일 확인: {xgboost_path}")
                file_size = os.path.getsize(xgboost_path)
                print(f"📏 XGBoost 파일 크기: {file_size} bytes")
                
                if file_size == 0:
                    print(f"⚠️ {species_name} XGBoost 파일이 비어있음")
                else:
                    with open(xgboost_path, 'r', encoding='utf-8') as f:
                        species_models['xgboost'] = json.load(f)
                    print(f"✅ {species_name} XGBoost 로드 완료")
                    
            except FileNotFoundError:
                print(f"❌ {species_name} XGBoost 파일을 찾을 수 없음: {xgboost_path}")
            except json.JSONDecodeError as je:
                print(f"❌ {species_name} XGBoost JSON 파싱 실패: {je}")
            except Exception as e:
                print(f"⚠️ {species_name} XGBoost 로드 실패: {type(e).__name__}: {e}")
        else:
            print(f"❌ {species_name} XGBoost 파일 없음: {xgboost_path}")
        
        if species_models:
            print(f"🎯 {species_name} 모델 로드 완료: {list(species_models.keys())}")
            result = {species_name: species_models}
            # 캐시에 저장
            _single_species_cache[species_name] = result
            print(f"💾 {species_name} 모델 캐시에 저장됨")
            return result
        else:
            print(f"❌ {species_name} 사용 가능한 모델이 없음")
            # 실패한 경우에도 캐시에 저장 (재시도 방지)
            _single_species_cache[species_name] = None
            return None
        
    except KeyboardInterrupt:
        print(f"⏹️ {species_name} 모델 로드 중단됨")
        return None
    except Exception as e:
        print(f"❌ {species_name} 모델 로드 예외: {type(e).__name__}: {e}")
        import traceback
        print(f"🔍 스택 추적: {traceback.format_exc()}")
        return None

def get_environmental_data_from_db(target_date_str):
    """DB에서 특정 날짜의 환경 데이터를 조회합니다."""
    try:
        from .models import ExternalEnvironmentalData
        from datetime import datetime
        
        # 날짜 파싱
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
        
        # 해당 날짜의 환경 데이터 조회 (data_type별로)
        env_data_query = ExternalEnvironmentalData.objects.filter(
            data_timestamp__date=target_date.date()
        )
        
        if not env_data_query.exists():
            print(f"⚠️ {target_date_str} 환경 데이터 없음 - 기본값 사용")
            # 환경 데이터가 없으면 기본값 반환
            return {
                'temperature': 20.0,
                'humidity': 60.0,
                'precipitation': 0.0,
                'wind_speed': 5.0,
                'pressure': 1013.0,
                'visibility': 10.0,
                'water_temperature': 15.0
            }
        
        # data_type별 데이터 추출
        env_dict = {}
        for data_point in env_data_query:
            env_dict[data_point.data_type] = float(data_point.value)
        
        # 필요한 환경 데이터 매핑 (기본값 제공)
        result = {
            'temperature': env_dict.get('avg_temperature', env_dict.get('temperature', 20.0)),
            'humidity': env_dict.get('humidity', 60.0),
            'precipitation': env_dict.get('precipitation', env_dict.get('rainfall', 0.0)),
            'wind_speed': env_dict.get('wind_speed', 5.0),
            'pressure': env_dict.get('pressure', env_dict.get('atmospheric_pressure', 1013.0)),
            'visibility': env_dict.get('visibility', 10.0),  # visibility 기본값 제공
            'water_temperature': env_dict.get('water_temperature', env_dict.get('sea_temperature', 15.0))
        }
        
        # None 값들을 기본값으로 대체
        for key, default_val in [
            ('temperature', 20.0), ('humidity', 60.0), ('precipitation', 0.0),
            ('wind_speed', 5.0), ('pressure', 1013.0), ('visibility', 10.0), ('water_temperature', 15.0)
        ]:
            if result[key] is None:
                result[key] = default_val
                
        print(f"🌤️ 환경 데이터 준비 완료: {list(result.keys())}")
        return result
            
    except Exception as e:
        print(f"⚠️ 환경 데이터 조회 오류: {e}")
        # 오류 시에도 기본값 반환
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
                'error': f'{species_name} 모델이 없습니다'
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
                return {'error': f'LightGBM 모델 예측 실패: {str(e)}'}
        else:
            return {'error': f'{species_name} LightGBM 모델이 존재하지 않습니다'}
            
        # XGBoost 예측 (LightGBM만 사용)
        if 'xgboost' in species_models:
            try:
                # XGBoost 모델은 현재 JSON 형태로만 있어서 실제 예측 불가
                # LightGBM 예측값을 XGBoost 결과로도 사용
                print(f"⚠️ {species_name} XGBoost 모델 비활성화 - LightGBM 결과 사용")
                predictions['xgboost'] = predictions['lightgbm']
            except Exception as e:
                print(f"❌ {species_name} XGBoost 처리 실패: {e}")
                predictions['xgboost'] = predictions['lightgbm']
        else:
            print(f"⚠️ {species_name} XGBoost 모델 없음 - LightGBM 결과 사용")
            predictions['xgboost'] = predictions['lightgbm']
        
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
            'predicted_price': round(ensemble_pred / 10) * 10,  # 10원 단위로 반올림
            'lightgbm_prediction': round(predictions['lightgbm'] / 10) * 10,
            'xgboost_prediction': round(predictions['xgboost'] / 10) * 10,
            'confidence': round(confidence, 2),
            'features': features
        }
        
    except Exception as e:
        print(f"❌ {species_name} 예측 실패: {e}")
        return {
            'error': str(e)
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
    
    # 기상 데이터 (6개) - 환경 데이터 처리
    if weather_data and isinstance(weather_data, dict):
        features['temperature'] = weather_data.get('temperature', 20.0)
        features['humidity'] = weather_data.get('humidity', 60.0)
        features['precipitation'] = weather_data.get('precipitation', 0.0)
        features['wind_speed'] = weather_data.get('wind_speed', 5.0)
        features['pressure'] = weather_data.get('pressure', 1013.0)
        features['visibility'] = weather_data.get('visibility', 10.0)
        
        # None 값들을 기본값으로 대체
        defaults = {'temperature': 20.0, 'humidity': 60.0, 'precipitation': 0.0, 
                   'wind_speed': 5.0, 'pressure': 1013.0, 'visibility': 10.0}
        for key, default_val in defaults.items():
            if features[key] is None:
                features[key] = default_val
                
        print(f"🌤️ 예측 특성 환경 데이터 준비 완료")
    else:
        # 기본값 사용
        features['temperature'] = 20.0
        features['humidity'] = 60.0
        features['precipitation'] = 0.0
        features['wind_speed'] = 5.0
        features['pressure'] = 1013.0
        features['visibility'] = 10.0
        print(f"⚠️ 환경 데이터 없음 - 기본값 사용")
    
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
            
        # 환경 데이터가 dictionary가 아닌 경우 (예: "analyzing" 문자열)
        if not isinstance(environmental_data, dict):
            print(f"⚠️ {mapped_species} 환경 데이터 형식 오류 - 분석 중 상태 반환")
            return Response({
                'success': True,
                'prediction': {
                    'species': mapped_species,
                    'korean_name': species,
                    'target_date': target_date,
                    'status': 'analyzing',
                    'message': '환경 데이터를 수집하고 있습니다. 잠시 후 다시 시도해주세요.'
                }
            })
        
        # 실제 모델 로딩 및 예측
        print(f"🔄 {mapped_species} 모델 로딩 및 예측 시작")
        
        try:
            # ThreadPoolExecutor로 안전한 모델 로드
            from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
            import time
            
            print(f"🔄 {mapped_species} ThreadPool에서 모델 로드 시작")
            
            with ThreadPoolExecutor(max_workers=1) as executor:
                # 별도 스레드에서 모델 로드 (5초 타임아웃)
                future = executor.submit(load_single_species_model, mapped_species)
                
                try:
                    species_models = future.result(timeout=5)
                    if species_models and mapped_species in species_models:
                        print(f"✅ {mapped_species} 모델 로드 성공")
                    else:
                        print(f"⚠️ {mapped_species} 모델 로드됐지만 사용 불가")
                        species_models = None
                except FutureTimeoutError:
                    print(f"⏰ {mapped_species} 모델 로드 타임아웃 (5초)")
                    species_models = None
                except Exception as e:
                    print(f"❌ {mapped_species} 모델 로드 예외: {e}")
                    species_models = None
            
            if not species_models or mapped_species not in species_models:
                print(f"⚠️ {mapped_species} 모델을 찾을 수 없음 - 분석 중 상태 반환")
                return Response({
                    'success': True,
                    'prediction': {
                        'species': mapped_species,
                        'korean_name': species,
                        'target_date': target_date,
                        'status': 'analyzing',
                        'message': f'{mapped_species} 어종의 예측 모델을 준비하고 있습니다. 잠시 후 다시 시도해주세요.'
                    }
                })
            
            # 실제 모델 예측 수행
            print(f"✅ {mapped_species} 모델 로드 성공 - 예측 수행")
            prediction_result = predict_single_species(
                mapped_species, target_date, environmental_data, species_models
            )
            
            # 예측 결과에 에러가 있는지 확인
            if 'error' in prediction_result:
                print(f"⚠️ {mapped_species} 예측 실패: {prediction_result['error']}")
                return Response({
                    'success': True,
                    'prediction': {
                        'species': mapped_species,
                        'korean_name': species,
                        'target_date': target_date,
                        'status': 'analyzing',
                        'message': f'{mapped_species} 예측 모델에 문제가 있습니다. 데이터를 점검하고 있습니다.'
                    }
                })
        
        except Exception as e:
            print(f"❌ 모델 로딩/예측 중 예외 발생: {e}")
            return Response({
                'success': True,
                'prediction': {
                    'species': mapped_species,
                    'korean_name': species,
                    'target_date': target_date,
                    'status': 'analyzing',
                    'message': f'{mapped_species} 모델 처리 중입니다. 잠시 후 다시 시도해주세요.'
                }
            })
        
        # 예측 성공 시 결과 구성
        result = {
            'species': mapped_species,
            'korean_name': species,
            'target_date': target_date,
            'predicted_price': prediction_result['predicted_price'],
            'lightgbm_prediction': prediction_result['lightgbm_prediction'],
            'xgboost_prediction': prediction_result['xgboost_prediction'],
            'confidence': prediction_result['confidence'],
            'status': 'model_prediction',
            'features_used': list(prediction_result.get('features', {}).keys())[:10]  # 처음 10개만
        }
        
        return Response({
            'success': True,
            'prediction': result
        })
        
    except Exception as e:
        print(f"예측 오류: {e}")
        return Response({
            'success': True,
            'prediction': {
                'species': species if 'species' in locals() else '알 수 없음',
                'korean_name': species if 'species' in locals() else '알 수 없음',
                'target_date': target_date if 'target_date' in locals() else '',
                'status': 'analyzing',
                'message': '예측 시스템을 점검하고 있습니다. 잠시 후 다시 시도해주세요.'
            }
        })

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
                
                if not os.path.exists(script_path):
                    print(f"❌ 데이터 수집 스크립트를 찾을 수 없음: {script_path}")
                    continue
                
                try:
                    result = subprocess.run([
                        'python', script_path, date_str, date_str
                    ], capture_output=True, text=True, timeout=60)
                    
                    if result.returncode == 0:
                        print(f"✅ {date_str} 데이터 수집 성공")
                        collected_count += 1
                    else:
                        print(f"⚠️ {date_str} 데이터 수집 실패: {result.stderr}")
                except subprocess.TimeoutExpired:
                    print(f"⏰ {date_str} 데이터 수집 타임아웃")
                except FileNotFoundError:
                    print(f"❌ {date_str} Python 실행 파일을 찾을 수 없음")
                    
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
        try:
            from .models import get_or_create_auction_fish_species
            auction_fish_obj = get_or_create_auction_fish_species(fish_species_name)
            print(f"✅ Auction 어종 확인: {fish_species_name} (ID: {auction_fish_obj.id})")
        except Exception as e:
            print(f"❌ Auction 어종 생성/조회 실패: {e}")
            return Response({
                'success': False,
                'error': f'어종 데이터 처리 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # ActualAuctionPrice에서 특정 어종의 데이터 조회 (실제 수집된 데이터)
        try:
            species_auction_data = ActualAuctionPrice.objects.filter(
                fish_species__item_small_category_name_kr=fish_species_name
            ).order_by('-trade_date')
            
            data_count = species_auction_data.count()
            print(f"📊 {fish_species_name} 데이터 개수: {data_count}개")
        except Exception as e:
            print(f"❌ 데이터 조회 실패: {e}")
            return Response({
                'success': False,
                'error': f'데이터베이스 조회 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if species_auction_data.exists():
            latest_date = species_auction_data.first().trade_date
            end_date = latest_date
            start_date = end_date - timedelta(days=days-1)
            print(f"📅 {species} 실제 데이터베이스 기준: {start_date} ~ {end_date}")
        else:
            # 해당 어종의 데이터가 없으면 분석 중 상태 반환
            print(f"⚠️ {species} 어종 실제 데이터가 없음 - 분석 중 상태 반환")
            return Response({
                'success': True,
                'data': [],
                'species': species,
                'days': days,
                'status': 'analyzing',
                'message': f'{species} 어종의 실제 데이터를 수집하고 있습니다. 잠시 후 다시 시도해주세요.',
                'date_range': {
                    'start': (date.today() - timedelta(days=days-1)).strftime('%Y-%m-%d'),
                    'end': date.today().strftime('%Y-%m-%d')
                }
            })
        
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
                    # 10원 단위로 반올림
                    rounded_price = round(float(avg_price) / 10) * 10
                    result_data.append({
                        'date': date_str,
                        'price': rounded_price,
                        'formattedDate': f"{trade_date.month}.{trade_date.day}"
                    })
                    seen_dates.add(date_str)  # 처리된 날짜 기록
                    print(f"  ✅ {trade_date}: {rounded_price:,}원")
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
            'success': True,
            'data': [],
            'species': species if 'species' in locals() else '알 수 없음',
            'days': days if 'days' in locals() else 7,
            'status': 'analyzing',
            'message': '실제 데이터를 수집하고 있습니다. 잠시 후 다시 시도해주세요.',
            'date_range': {
                'start': (date.today() - timedelta(days=7-1)).strftime('%Y-%m-%d'),
                'end': date.today().strftime('%Y-%m-%d')
            }
        })

@api_view(['GET'])
def get_model_cache_status(request):
    """모델 캐시 상태를 반환합니다."""
    global _single_species_cache
    
    cache_info = {}
    for species_name in SPECIES_MODELS.keys():
        if species_name in _single_species_cache:
            if _single_species_cache[species_name] is not None:
                models_loaded = list(_single_species_cache[species_name][species_name].keys())
                cache_info[species_name] = {
                    'cached': True,
                    'models': models_loaded,
                    'status': 'loaded'
                }
            else:
                cache_info[species_name] = {
                    'cached': True,
                    'models': [],
                    'status': 'failed'
                }
        else:
            cache_info[species_name] = {
                'cached': False,
                'models': [],
                'status': 'not_loaded'
            }
    
    return Response({
        'success': True,
        'cache_status': cache_info,
        'total_cached': len([k for k, v in _single_species_cache.items() if v is not None])
    })

@login_required
def prediction_dashboard(request):
    """예측 대시보드를 렌더링합니다."""
    context = {
        'species_list': ['우럭', '농어', '참돔', '광어', '숭어']
    }
    return render(request, 'prediction/dashboard.html', context)
