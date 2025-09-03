#!/usr/bin/env python
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from prediction.views import load_models, get_environmental_data_from_db, predict_single_species

print('=== 예측 시스템 테스트 ===')

# 1. 모델 로드 테스트
print('\n1. 모델 로드 테스트')
print('='*40)
models = load_models()
print(f"로드된 모델: {list(models.keys())}")

# 2. 환경 데이터 조회 테스트
print('\n2. 환경 데이터 조회 테스트')
print('='*40)
target_date = "2025-09-02"
env_data = get_environmental_data_from_db(target_date)
print(f"환경 데이터: {env_data}")

# 3. 예측 실행 테스트
print('\n3. 예측 실행 테스트')
print('='*40)

species_list = ['우럭', '넙치', '숭어', '참돔', '농어']

for species in species_list:
    print(f"\n🐟 {species} 예측 중...")
    
    result = predict_single_species(species, target_date, env_data, models)
    
    if 'error' not in result:
        print(f"  ✅ 예측 가격: {result['predicted_price']:,.0f}원")
        print(f"  📊 RandomForest: {result['lightgbm_prediction']:,.0f}원")
        print(f"  📊 LinearRegression: {result['xgboost_prediction']:,.0f}원")
        print(f"  🎯 신뢰도: {result['confidence']}")
    else:
        print(f"  ❌ 예측 실패: {result['error']}")

print('\n🎉 예측 시스템 테스트 완료!')
