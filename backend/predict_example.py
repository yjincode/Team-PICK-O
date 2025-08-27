#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
실제 예측 사용 예제
전날의 기온, 수온, 경매가를 입력받아서 다음날 가격을 예측
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import lightgbm as lgb
import xgboost as xgb
from clean_model_final import predict_next_day_price, predict_all_species

def load_trained_models():
    """학습된 모델들 로드"""
    print("📂 학습된 모델 로드 중...")
    
    models = {}
    species_mapping = {
        '(활)우럭': 'rockfish',
        '(활)넙치': 'flounder', 
        '(활)참숭어': 'mullet',
        '(활)참돔': 'red_sea_bream',
        '(활)농어': 'sea_bass'
    }
    
    for korean_name, english_name in species_mapping.items():
        try:
            # LightGBM 모델 로드 (새로운 clean 모델)
            lgb_model = lgb.Booster(model_file=f'final_models/lightgbm_clean_{english_name}.txt')
            models[f'lgb_{english_name}'] = lgb_model
            print(f"  ✅ LightGBM {korean_name} 모델 로드 완료")
        except:
            print(f"  ❌ LightGBM {korean_name} 모델 로드 실패")
        
        try:
            # XGBoost 모델 로드 (새로운 clean 모델)
            xgb_model = xgb.XGBRegressor()
            xgb_model.load_model(f'final_models/xgboost_clean_{english_name}.json')
            models[f'xgb_{english_name}'] = xgb_model
            print(f"  ✅ XGBoost {korean_name} 모델 로드 완료")
        except:
            print(f"  ❌ XGBoost {korean_name} 모델 로드 실패")
    
    return models

def example_prediction():
    """예측 사용 예제"""
    print("🎯 어종 가격 예측 예제")
    print("=" * 60)
    
    # 1. 모델 로드
    models = load_trained_models()
    
    # 2. 예측할 날짜 설정 (내일)
    tomorrow = datetime.now() + timedelta(days=1)
    
    # 3. 전날 환경 데이터 (실제로는 API나 데이터베이스에서 가져옴)
    environmental_data = {
        # 기온 데이터
        'avg_temperature': 18.5,      # 평균 기온
        'max_temperature': 23.0,      # 최고 기온
        'min_temperature': 14.0,      # 최저 기온
        
        # 수온 데이터
        'water_temperature': 16.2,    # 수온
        
        # 기타 환경 데이터
        'humidity': 65.0,             # 습도 (%)
        'pressure': 1013.2,           # 기압 (hPa)
        'wind_speed': 3.5,            # 풍속 (m/s)
        'rainfall': 0.0,              # 강수량 (mm)
        
        # 거래 데이터
        'trade_quantity': 1200.0,     # 거래량 (kg)
        'avg_weight_kg': 1.2,         # 평균 무게 (kg)
        'avg_price': 15000.0          # 전날 평균 경매가 (원/kg)
    }
    
    print(f"📊 입력 환경 데이터:")
    for key, value in environmental_data.items():
        print(f"  {key}: {value}")
    
    print("\n" + "=" * 60)
    
    # 4. 개별 어종 예측
    print("🐟 개별 어종 예측:")
    
    # 우럭 예측
    if 'lgb_우럭' in models and 'xgb_우럭' in models:
        prediction = predict_next_day_price(
            '(활)우럭',
            tomorrow,
            environmental_data,
            models['lgb_우럭'],
            models['xgb_우럭']
        )
        print(f"\n📈 우럭 예측 결과: {prediction['ensemble_prediction']:,.0f}원")
    
    print("\n" + "=" * 60)
    
    # 5. 모든 어종 예측
    print("🚀 모든 어종 예측:")
    all_predictions = predict_all_species(tomorrow, environmental_data, models)
    
    print(f"\n📊 모든 어종 예측 결과 요약:")
    for species, pred in all_predictions.items():
        print(f"  {species}: {pred['ensemble_prediction']:,.0f}원")
    
    return all_predictions

def predict_all_species(target_date, environmental_data, models):
    """모든 어종의 다음날 가격 예측"""
    species_list = ['(활)우럭', '(활)넙치', '(활)참숭어', '(활)참돔', '(활)농어']
    species_mapping = {
        '(활)우럭': 'rockfish',
        '(활)넙치': 'flounder', 
        '(활)참숭어': 'mullet',
        '(활)참돔': 'red_sea_bream',
        '(활)농어': 'sea_bass'
    }
    predictions = {}
    
    print(f"🚀 모든 어종 가격 예측 시작")
    print(f"📅 예측 날짜: {target_date.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    for species in species_list:
        species_key = species_mapping[species]
        
        if f'lgb_{species_key}' in models and f'xgb_{species_key}' in models:
            prediction = predict_next_day_price(
                species, 
                target_date, 
                environmental_data, 
                models[f'lgb_{species_key}'], 
                models[f'xgb_{species_key}']
            )
            predictions[species] = prediction
            print("-" * 40)
    
    return predictions

def predict_with_real_data():
    """실제 데이터로 예측하는 함수"""
    print("🎯 실제 데이터로 예측하기")
    print("=" * 60)
    
    # 사용자 입력 받기
    print("📝 예측에 필요한 데이터를 입력해주세요:")
    
    # 날짜 입력
    date_str = input("예측할 날짜 (YYYY-MM-DD): ")
    target_date = datetime.strptime(date_str, '%Y-%m-%d')
    
    # 환경 데이터 입력
    print("\n🌡️ 환경 데이터 입력:")
    environmental_data = {}
    
    environmental_data['avg_temperature'] = float(input("평균 기온 (°C): "))
    environmental_data['max_temperature'] = float(input("최고 기온 (°C): "))
    environmental_data['min_temperature'] = float(input("최저 기온 (°C): "))
    environmental_data['water_temperature'] = float(input("수온 (°C): "))
    environmental_data['humidity'] = float(input("습도 (%): "))
    environmental_data['pressure'] = float(input("기압 (hPa): "))
    environmental_data['wind_speed'] = float(input("풍속 (m/s): "))
    environmental_data['rainfall'] = float(input("강수량 (mm): "))
    
    print("\n💰 거래 데이터 입력:")
    environmental_data['trade_quantity'] = float(input("거래량 (kg): "))
    environmental_data['avg_weight_kg'] = float(input("평균 무게 (kg): "))
    environmental_data['avg_price'] = float(input("전날 평균 경매가 (원/kg): "))
    
    # 모델 로드
    models = load_trained_models()
    
    # 예측 실행
    print(f"\n🚀 {target_date.strftime('%Y-%m-%d')} 예측 시작...")
    predictions = predict_all_species(target_date, environmental_data, models)
    
    return predictions

if __name__ == "__main__":
    print("🎯 어종 가격 예측 시스템")
    print("=" * 60)
    
    choice = input("1. 예제 예측\n2. 실제 데이터로 예측\n선택 (1 또는 2): ")
    
    if choice == "1":
        example_prediction()
    elif choice == "2":
        predict_with_real_data()
    else:
        print("잘못된 선택입니다.")
