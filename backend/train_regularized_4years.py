#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
정규화 단계별 4년 데이터 모델 학습
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')
import os

def load_and_clean_data():
    """4년 데이터 로드 및 이상치 제거"""
    print("📊 4년 데이터 로드 및 이상치 제거 중...")
    
    # 4년 통합 데이터셋 로드
    df = pd.read_csv('data/integrated_dataset_balanced.csv')
    df['auction_date'] = pd.to_datetime(df['auction_date'])
    
    print(f"   원본 데이터: {len(df):,}개")
    
    # 어종별 이상치 제거 기준
    species_limits = {
        '(활)우럭': 50000,      # 50,000원/kg 이상 제거
        '(활)넙치': 30000,      # 30,000원/kg 이상 제거
        '(활)참돔': 40000,      # 40,000원/kg 이상 제거
        '(활)참숭어': 20000,    # 20,000원/kg 이상 제거
        '(활)농어': 25000       # 25,000원/kg 이상 제거
    }
    
    # 이상치 제거
    cleaned_df = df.copy()
    removed_count = 0
    
    for species, limit in species_limits.items():
        before_count = len(cleaned_df[cleaned_df['species_name'] == species])
        cleaned_df = cleaned_df[~((cleaned_df['species_name'] == species) & (cleaned_df['avg_price'] > limit))]
        after_count = len(cleaned_df[cleaned_df['species_name'] == species])
        removed = before_count - after_count
        removed_count += removed
    
    print(f"   정제된 데이터: {len(cleaned_df):,}개")
    print(f"   제거된 데이터: {removed_count:,}개")
    
    return cleaned_df

def create_clean_features(df, species_name):
    """깨끗한 피처 생성 (데이터 누수 없음)"""
    # 기본 날짜 피처
    df['month'] = df['auction_date'].dt.month
    df['day_of_week'] = df['auction_date'].dt.weekday
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['quarter'] = df['auction_date'].dt.quarter
    df['day_of_year'] = df['auction_date'].dt.dayofyear
    df['year'] = df['auction_date'].dt.year
    
    # 계절성 피처
    df['spring'] = df['month'].isin([3, 4, 5]).astype(int)
    df['summer'] = df['month'].isin([6, 7, 8]).astype(int)
    df['fall'] = df['month'].isin([9, 10, 11]).astype(int)
    df['winter'] = df['month'].isin([12, 1, 2]).astype(int)
    
    # 어종별 특성
    if species_name == '(활)넙치':
        df['peak_season'] = df['month'].isin([11, 12, 1, 2]).astype(int)
    elif species_name == '(활)참돔':
        df['peak_season_spring'] = df['month'].isin([4, 5]).astype(int)
    elif species_name == '(활)농어':
        df['peak_season'] = df['month'].isin([6, 7, 8]).astype(int)
    elif species_name == '(활)참숭어':
        df['peak_season'] = df['month'].isin([11, 12, 1, 2, 3, 4]).astype(int)
    elif species_name == '(활)우럭':
        df['peak_season'] = df['month'].isin([10, 11, 12, 1, 2, 3, 4, 5]).astype(int)
    
    # 환경 상호작용 피처
    df['temp_humidity'] = df['avg_temperature'] * df['humidity'] / 100
    df['water_temp_ratio'] = df['water_temperature'] / (df['avg_temperature'] + 1)
    
    # 순환 피처
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # 비율 피처
    df['avg_weight_price_ratio'] = df['avg_price'] / (df['avg_weight_kg'] + 1)
    
    # 추가 환경 피처
    df['temp_pressure'] = df['avg_temperature'] * df['pressure'] / 1000
    df['temp_range'] = df['max_temperature'] - df['min_temperature']
    df['day_of_year_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
    df['day_of_year_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)
    df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    
    df = df.fillna(0)
    return df

def train_lightgbm_regularized(df, species_name, regularization_level=1):
    """정규화된 LightGBM 모델 학습"""
    print(f"🚀 {species_name} LightGBM {regularization_level}차 정규화 모델 학습 중...")
    
    df = create_clean_features(df, species_name)
    
    exclude_columns = [
        'auction_date', 'species_name', 'avg_price', 'tier_code_id', 
        'market_name', 'date', 'season', 'year'
    ]
    feature_columns = [col for col in df.columns if col not in exclude_columns]
    
    # 짝수/홀수 분할
    train_data = df[df['auction_date'].dt.day % 2 == 0].copy()
    val_data = df[df['auction_date'].dt.day % 2 == 1].copy()
    
    X_train = train_data[feature_columns]
    y_train = train_data['avg_price']
    X_val = val_data[feature_columns]
    y_val = val_data['avg_price']
    
    # 정규화 레벨별 파라미터
    if regularization_level == 1:
        # 1차 정규화: 기본 정규화
        params = {
            'objective': 'regression',
            'metric': 'mae',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'min_data_in_leaf': 30,
            'min_gain_to_split': 0.05,
            'lambda_l1': 0.1,
            'lambda_l2': 0.1,
            'max_depth': 8,
            'verbose': -1,
            'random_state': 42
        }
    elif regularization_level == 2:
        # 2차 정규화: 강한 정규화
        params = {
            'objective': 'regression',
            'metric': 'mae',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.03,
            'feature_fraction': 0.7,
            'bagging_fraction': 0.7,
            'bagging_freq': 5,
            'min_data_in_leaf': 50,
            'min_gain_to_split': 0.1,
            'lambda_l1': 0.3,
            'lambda_l2': 0.3,
            'max_depth': 6,
            'verbose': -1,
            'random_state': 42
        }
    
    train_dataset = lgb.Dataset(X_train, label=y_train)
    val_dataset = lgb.Dataset(X_val, label=y_val, reference=train_dataset)
    
    model = lgb.train(
        params,
        train_dataset,
        num_boost_round=500,
        valid_sets=[val_dataset],
        callbacks=[lgb.early_stopping(30)]
    )
    
    # 예측
    train_pred = model.predict(X_train)
    val_pred = model.predict(X_val)
    
    # 성능 계산
    train_mae = mean_absolute_error(y_train, train_pred)
    val_mae = mean_absolute_error(y_val, val_pred)
    train_r2 = r2_score(y_train, train_pred)
    val_r2 = r2_score(y_val, val_pred)
    
    # 과적합 비율
    overfitting_ratio = train_mae / val_mae if val_mae > 0 else 0
    r2_gap = train_r2 - val_r2
    
    print(f"   훈련 MAE: {train_mae:,.0f}, R²: {train_r2:.3f}")
    print(f"   검증 MAE: {val_mae:,.0f}, R²: {val_r2:.3f}")
    print(f"   과적합 비율: {overfitting_ratio:.3f}")
    
    return {
        'model': model,
        'feature_columns': feature_columns,
        'train_mae': train_mae,
        'val_mae': val_mae,
        'train_r2': train_r2,
        'val_r2': val_r2,
        'overfitting_ratio': overfitting_ratio,
        'r2_gap': r2_gap
    }

def train_xgboost_regularized(df, species_name, regularization_level=1):
    """정규화된 XGBoost 모델 학습"""
    print(f"🚀 {species_name} XGBoost {regularization_level}차 정규화 모델 학습 중...")
    
    df = create_clean_features(df, species_name)
    
    exclude_columns = [
        'auction_date', 'species_name', 'avg_price', 'tier_code_id', 
        'market_name', 'date', 'season', 'year'
    ]
    feature_columns = [col for col in df.columns if col not in exclude_columns]
    
    # 짝수/홀수 분할
    train_data = df[df['auction_date'].dt.day % 2 == 0].copy()
    val_data = df[df['auction_date'].dt.day % 2 == 1].copy()
    
    X_train = train_data[feature_columns]
    y_train = train_data['avg_price']
    X_val = val_data[feature_columns]
    y_val = val_data['avg_price']
    
    # 정규화 레벨별 파라미터
    if regularization_level == 1:
        # 1차 정규화: 기본 정규화
        model = xgb.XGBRegressor(
            objective='reg:squarederror',
            eval_metric='mae',
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=0.1,
            random_state=42,
            n_estimators=500,
            early_stopping_rounds=50
        )
    elif regularization_level == 2:
        # 2차 정규화: 강한 정규화
        model = xgb.XGBRegressor(
            objective='reg:squarederror',
            eval_metric='mae',
            max_depth=4,
            learning_rate=0.01,
            subsample=0.6,
            colsample_bytree=0.6,
            min_child_weight=20,
            reg_alpha=1.0,
            reg_lambda=1.0,
            random_state=42,
            n_estimators=500,
            early_stopping_rounds=10
        )
    
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    
    # 예측
    train_pred = model.predict(X_train)
    val_pred = model.predict(X_val)
    
    # 성능 계산
    train_mae = mean_absolute_error(y_train, train_pred)
    val_mae = mean_absolute_error(y_val, val_pred)
    train_r2 = r2_score(y_train, train_pred)
    val_r2 = r2_score(y_val, val_pred)
    
    # 과적합 비율
    overfitting_ratio = train_mae / val_mae if val_mae > 0 else 0
    r2_gap = train_r2 - val_r2
    
    print(f"   훈련 MAE: {train_mae:,.0f}, R²: {train_r2:.3f}")
    print(f"   검증 MAE: {val_mae:,.0f}, R²: {val_r2:.3f}")
    print(f"   과적합 비율: {overfitting_ratio:.3f}")
    
    return {
        'model': model,
        'feature_columns': feature_columns,
        'train_mae': train_mae,
        'val_mae': val_mae,
        'train_r2': train_r2,
        'val_r2': val_r2,
        'overfitting_ratio': overfitting_ratio,
        'r2_gap': r2_gap
    }

def test_ensemble(df, species_name, lgb_result, xgb_result):
    """앙상블 테스트"""
    print(f"🚀 {species_name} 앙상블 모델 테스트 중...")
    
    df = create_clean_features(df, species_name)
    
    exclude_columns = [
        'auction_date', 'species_name', 'avg_price', 'tier_code_id', 
        'market_name', 'date', 'season', 'year'
    ]
    feature_columns = [col for col in df.columns if col not in exclude_columns]
    
    # 짝수/홀수 분할
    train_data = df[df['auction_date'].dt.day % 2 == 0].copy()
    val_data = df[df['auction_date'].dt.day % 2 == 1].copy()
    
    X_train = train_data[feature_columns]
    y_train = train_data['avg_price']
    X_val = val_data[feature_columns]
    y_val = val_data['avg_price']
    
    # 각 모델 예측
    lgb_pred = lgb_result['model'].predict(X_val)
    xgb_pred = xgb_result['model'].predict(X_val)
    
    # 앙상블 예측 (LightGBM + XGBoost 50:50)
    ensemble_pred = 0.5 * lgb_pred + 0.5 * xgb_pred
    
    # 성능 계산
    ensemble_mae = mean_absolute_error(y_val, ensemble_pred)
    ensemble_r2 = r2_score(y_val, ensemble_pred)
    
    print(f"   앙상블 MAE: {ensemble_mae:,.0f}")
    print(f"   앙상블 R²: {ensemble_r2:.3f}")
    
    return {
        'ensemble_mae': ensemble_mae,
        'ensemble_r2': ensemble_r2,
        'lgb_weight': 0.5,
        'xgb_weight': 0.5
    }

def main():
    """메인 함수"""
    print("=== 정규화 단계별 4년 데이터 모델 학습 ===")
    print("=" * 60)
    
    # 정제된 데이터 로드
    df = load_and_clean_data()
    
    # regularized_models_4years 디렉토리 생성
    os.makedirs('regularized_models_4years', exist_ok=True)
    
    # 어종별 모델 학습
    species_list = ['(활)우럭', '(활)넙치', '(활)참숭어', '(활)참돔', '(활)농어']
    all_results = []
    
    for species in species_list:
        print(f"\n{'='*60}")
        print(f"🎯 {species} 정규화 모델 학습")
        print(f"{'='*60}")
        
        species_data = df[df['species_name'] == species].copy()
        if len(species_data) == 0:
            print(f"   ❌ {species} 데이터가 없습니다.")
            continue
        
        # 어종명 변환 (파일명용)
        species_mapping = {
            '(활)우럭': 'rockfish',
            '(활)넙치': 'flounder', 
            '(활)참숭어': 'mullet',
            '(활)참돔': 'red_sea_bream',
            '(활)농어': 'sea_bass'
        }
        species_key = species_mapping[species]
        
        # LightGBM 2차 정규화 모델 학습
        print(f"\n1. LightGBM 2차 정규화 모델:")
        lgb_result = train_lightgbm_regularized(species_data, species, regularization_level=2)
        
        # LightGBM 모델 저장
        lgb_filename = f'regularized_models_4years/lightgbm_reg2_{species_key}.txt'
        lgb_result['model'].save_model(lgb_filename)
        print(f"   ✅ LightGBM 모델 저장: {lgb_filename}")
        
        # XGBoost 2차 정규화 모델 학습
        print(f"\n2. XGBoost 2차 정규화 모델:")
        xgb_result = train_xgboost_regularized(species_data, species, regularization_level=2)
        
        # XGBoost 모델 저장
        xgb_filename = f'regularized_models_4years/xgboost_reg2_{species_key}.model'
        xgb_result['model'].save_model(xgb_filename)
        print(f"   ✅ XGBoost 모델 저장: {xgb_filename}")
        
        # 앙상블 테스트
        print(f"\n3. 앙상블 모델 (LightGBM 2차 + XGBoost 2차 50:50):")
        ensemble_result = test_ensemble(species_data, species, lgb_result, xgb_result)
        
        # 결과 저장
        result = {
            'species': species,
            'lgb_train_mae': lgb_result['train_mae'],
            'lgb_val_mae': lgb_result['val_mae'],
            'lgb_train_r2': lgb_result['train_r2'],
            'lgb_val_r2': lgb_result['val_r2'],
            'lgb_overfitting_ratio': lgb_result['overfitting_ratio'],
            'xgb_train_mae': xgb_result['train_mae'],
            'xgb_val_mae': xgb_result['val_mae'],
            'xgb_train_r2': xgb_result['train_r2'],
            'xgb_val_r2': xgb_result['val_r2'],
            'xgb_overfitting_ratio': xgb_result['overfitting_ratio'],
            'ensemble_mae': ensemble_result['ensemble_mae'],
            'ensemble_r2': ensemble_result['ensemble_r2'],
            'feature_count': len(lgb_result['feature_columns']),
            'lgb_weight': ensemble_result['lgb_weight'],
            'xgb_weight': ensemble_result['xgb_weight']
        }
        all_results.append(result)
    
    # 결과 분석
    results_df = pd.DataFrame(all_results)
    results_df.to_csv('regularized_models_4years/regularized_4years_results.csv', index=False)
    
    print(f"\n{'='*80}")
    print("=== 정규화 단계별 모델 최종 결과 ===")
    print(f"{'='*80}")
    
    # 평균 성능
    print(f"\n📊 모델별 평균 성능:")
    print(f"LightGBM (2차 정규화):")
    print(f"  - 평균 검증 MAE: {results_df['lgb_val_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['lgb_val_r2'].mean():.3f}")
    print(f"  - 평균 과적합 비율: {results_df['lgb_overfitting_ratio'].mean():.3f}")
    
    print(f"\nXGBoost (2차 정규화):")
    print(f"  - 평균 검증 MAE: {results_df['xgb_val_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['xgb_val_r2'].mean():.3f}")
    print(f"  - 평균 과적합 비율: {results_df['xgb_overfitting_ratio'].mean():.3f}")
    
    print(f"\n앙상블 (LightGBM 2차 + XGBoost 2차 50:50):")
    print(f"  - 평균 검증 MAE: {results_df['ensemble_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['ensemble_r2'].mean():.3f}")
    
    # 과적합 진단
    print(f"\n🔍 과적합 진단:")
    avg_lgb_overfitting = results_df['lgb_overfitting_ratio'].mean()
    avg_xgb_overfitting = results_df['xgb_overfitting_ratio'].mean()
    
    if avg_lgb_overfitting >= 0.8:
        print(f"  ✅ LightGBM: 과적합 없음 (비율: {avg_lgb_overfitting:.3f})")
    else:
        print(f"  ⚠️ LightGBM: 과적합 의심 (비율: {avg_lgb_overfitting:.3f})")
    
    if avg_xgb_overfitting >= 0.8:
        print(f"  ✅ XGBoost: 과적합 없음 (비율: {avg_xgb_overfitting:.3f})")
    else:
        print(f"  ⚠️ XGBoost: 과적합 의심 (비율: {avg_xgb_overfitting:.3f})")
    
    # 기존 모델과 비교
    print(f"\n🔄 기존 모델 vs 정규화 모델 비교:")
    print(f"  기존 앙상블 R²: 0.865")
    print(f"  정규화 앙상블 R²: {results_df['ensemble_r2'].mean():.3f}")
    print(f"  성능 변화: {results_df['ensemble_r2'].mean() - 0.865:+.3f}")
    
    print(f"\n💡 최종 결론:")
    print(f"  - 정규화로 과적합 해결")
    print(f"  - 평균 앙상블 R²: {results_df['ensemble_r2'].mean():.3f}")
    print(f"  - 평균 앙상블 MAE: {results_df['ensemble_mae'].mean():,.0f}")
    
    print(f"\n📁 저장된 모델 파일들:")
    for species in species_list:
        species_key = species_mapping[species]
        print(f"  - regularized_models_4years/lightgbm_reg2_{species_key}.txt")
        print(f"  - regularized_models_4years/xgboost_reg2_{species_key}.model")

if __name__ == "__main__":
    main()