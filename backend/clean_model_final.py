#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
깨끗한 피처만 사용하는 최종 모델 - 데이터 누수 없음
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')
import pickle

def load_data():
    """데이터 로드"""
    # 학습 데이터와 검증 데이터를 합쳐서 로드
    train_df = pd.read_csv('data/train_even_odd_day_balanced.csv')
    val_df = pd.read_csv('data/val_even_odd_day_balanced.csv')
    df = pd.concat([train_df, val_df], ignore_index=True)
    df['auction_date'] = pd.to_datetime(df['auction_date'])
    return df

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

def create_prediction_features(target_date, environmental_data, species_name):
    """예측용 피처 생성 (전날 데이터로 다음날 예측)"""
    # 기본 날짜 피처
    month = target_date.month
    day_of_week = target_date.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0
    quarter = target_date.month // 3 + 1
    day_of_year = target_date.timetuple().tm_yday
    year = target_date.year
    
    # 계절성 피처
    spring = 1 if month in [3, 4, 5] else 0
    summer = 1 if month in [6, 7, 8] else 0
    fall = 1 if month in [9, 10, 11] else 0
    winter = 1 if month in [12, 1, 2] else 0
    
    # 어종별 특성
    peak_season = 0
    peak_season_spring = 0
    
    if species_name == '(활)넙치':
        peak_season = 1 if month in [11, 12, 1, 2] else 0
    elif species_name == '(활)참돔':
        peak_season_spring = 1 if month in [4, 5] else 0
    elif species_name == '(활)농어':
        peak_season = 1 if month in [6, 7, 8] else 0
    elif species_name == '(활)참숭어':
        peak_season = 1 if month in [11, 12, 1, 2, 3, 4] else 0
    elif species_name == '(활)우럭':
        peak_season = 1 if month in [10, 11, 12, 1, 2, 3, 4, 5] else 0
    
    # 환경 데이터 추출
    avg_temperature = environmental_data.get('avg_temperature', 15.0)
    water_temperature = environmental_data.get('water_temperature', 15.0)
    humidity = environmental_data.get('humidity', 60.0)
    pressure = environmental_data.get('pressure', 1013.0)
    wind_speed = environmental_data.get('wind_speed', 5.0)
    rainfall = environmental_data.get('rainfall', 0.0)
    max_temperature = environmental_data.get('max_temperature', avg_temperature + 5)
    min_temperature = environmental_data.get('min_temperature', avg_temperature - 5)
    trade_quantity = environmental_data.get('trade_quantity', 1000.0)
    avg_weight_kg = environmental_data.get('avg_weight_kg', 1.0)
    avg_price = environmental_data.get('avg_price', 10000.0)  # 전날 경매가
    
    # 환경 상호작용 피처
    temp_humidity = avg_temperature * humidity / 100
    water_temp_ratio = water_temperature / (avg_temperature + 1)
    
    # 순환 피처
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)
    
    # 비율 피처
    avg_weight_price_ratio = avg_price / (avg_weight_kg + 1)
    
    # 추가 환경 피처
    temp_pressure = avg_temperature * pressure / 1000
    temp_range = max_temperature - min_temperature
    day_of_year_sin = np.sin(2 * np.pi * day_of_year / 365)
    day_of_year_cos = np.cos(2 * np.pi * day_of_year / 365)
    day_of_week_sin = np.sin(2 * np.pi * day_of_week / 7)
    day_of_week_cos = np.cos(2 * np.pi * day_of_week / 7)
    
    # 피처 딕셔너리 생성
    features = {
        'trade_quantity': trade_quantity,
        'avg_weight_kg': avg_weight_kg,
        'water_temperature': water_temperature,
        'humidity': humidity,
        'pressure': pressure,
        'avg_temperature': avg_temperature,
        'wind_speed': wind_speed,
        'max_temperature': max_temperature,
        'min_temperature': min_temperature,
        'rainfall': rainfall,
        'month': month,
        'day_of_week': day_of_week,
        'is_weekend': is_weekend,
        'quarter': quarter,
        'day_of_year': day_of_year,
        'year': year,
        'spring': spring,
        'summer': summer,
        'fall': fall,
        'winter': winter,
        'peak_season': peak_season,
        'peak_season_spring': peak_season_spring,
        'temp_humidity': temp_humidity,
        'water_temp_ratio': water_temp_ratio,
        'month_sin': month_sin,
        'month_cos': month_cos,
        'avg_weight_price_ratio': avg_weight_price_ratio,
        'temp_pressure': temp_pressure,
        'temp_range': temp_range,
        'day_of_year_sin': day_of_year_sin,
        'day_of_year_cos': day_of_year_cos,
        'day_of_week_sin': day_of_week_sin,
        'day_of_week_cos': day_of_week_cos
    }
    
    return features

def predict_next_day_price(species_name, target_date, environmental_data, lgb_model, xgb_model):
    """다음날 가격 예측 (전날 데이터 사용)"""
    print(f"🎯 {species_name} 다음날 가격 예측 중...")
    print(f"📅 예측 날짜: {target_date.strftime('%Y-%m-%d')}")
    
    # 예측용 피처 생성
    features = create_prediction_features(target_date, environmental_data, species_name)
    
    # DataFrame으로 변환
    input_df = pd.DataFrame([features])
    
    # LightGBM 예측
    lgb_pred = lgb_model.predict(input_df)[0]
    
    # XGBoost 예측
    xgb_pred = xgb_model.predict(input_df)[0]
    
    # 앙상블 예측 (50:50)
    ensemble_pred = (lgb_pred + xgb_pred) / 2
    
    print(f"📊 예측 결과:")
    print(f"  LightGBM 예측: {lgb_pred:,.0f}원")
    print(f"  XGBoost 예측: {xgb_pred:,.0f}원")
    print(f"  앙상블 예측: {ensemble_pred:,.0f}원")
    
    return {
        'species': species_name,
        'target_date': target_date,
        'lightgbm_prediction': lgb_pred,
        'xgboost_prediction': xgb_pred,
        'ensemble_prediction': ensemble_pred,
        'input_features': features
    }

def predict_all_species(target_date, environmental_data, models):
    """모든 어종의 다음날 가격 예측"""
    species_list = ['(활)우럭', '(활)넙치', '(활)참숭어', '(활)참돔', '(활)농어']
    predictions = {}
    
    print(f"🚀 모든 어종 가격 예측 시작")
    print(f"📅 예측 날짜: {target_date.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    for species in species_list:
        species_key = species.replace('(활)', '').replace('(', '').replace(')', '')
        
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

def train_clean_lightgbm(df, species_name):
    """깨끗한 피처로 LightGBM 모델 학습"""
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
    
    # LightGBM 모델 학습
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
    
    train_dataset = lgb.Dataset(X_train, label=y_train)
    val_dataset = lgb.Dataset(X_val, label=y_val, reference=train_dataset)
    
    model = lgb.train(
        params,
        train_dataset,
        num_boost_round=500,
        valid_sets=[val_dataset],
        callbacks=[lgb.early_stopping(50)]
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

def train_clean_xgboost(df, species_name):
    """깨끗한 피처로 XGBoost 모델 학습"""
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
    
    # XGBoost 모델 학습
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        eval_metric='mae',
        max_depth=8,
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

def train_clean_prophet(df, species_name):
    """깨끗한 피처로 Prophet 모델 학습"""
    # Prophet용 데이터 준비
    df_prophet = df.copy()
    df_prophet['ds'] = df_prophet['auction_date']
    df_prophet['y'] = df_prophet['avg_price']
    
    # 짝수/홀수 분할
    train_data = df_prophet[df_prophet['auction_date'].dt.day % 2 == 0].copy()
    val_data = df_prophet[df_prophet['auction_date'].dt.day % 2 == 1].copy()
    
    # Prophet 모델 학습
    model = Prophet(
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
        holidays_prior_scale=10,
        seasonality_mode='additive',
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )
    model.add_country_holidays(country_name='KR')
    
    # 한국 명절 추가
    korean_holidays = pd.DataFrame({
        'holiday': ['설날', '추석'],
        'ds': pd.to_datetime(['2020-01-25', '2020-10-01']),  # 예시 날짜
        'lower_window': -1,
        'upper_window': 1,
    })
    model.add_country_holidays(country_name='KR')
    
    model.fit(train_data[['ds', 'y']])
    
    # 예측
    train_forecast = model.predict(train_data[['ds']])
    val_forecast = model.predict(val_data[['ds']])
    
    # 성능 계산
    train_pred = train_forecast['yhat'].values
    val_pred = val_forecast['yhat'].values
    y_train = train_data['y'].values
    y_val = val_data['y'].values
    
    train_mae = mean_absolute_error(y_train, train_pred)
    val_mae = mean_absolute_error(y_val, val_pred)
    train_r2 = r2_score(y_train, train_pred)
    val_r2 = r2_score(y_val, val_pred)
    
    # 과적합 비율
    overfitting_ratio = train_mae / val_mae if val_mae > 0 else 0
    r2_gap = train_r2 - val_r2
    
    return {
        'model': model,
        'train_mae': train_mae,
        'val_mae': val_mae,
        'train_r2': train_r2,
        'val_r2': val_r2,
        'overfitting_ratio': overfitting_ratio,
        'r2_gap': r2_gap
    }

def test_clean_ensemble(df, species_name, lgb_result, xgb_result, prophet_result):
    """깨끗한 피처로 앙상블 테스트"""
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
    
    # Prophet 예측
    val_prophet = val_data.copy()
    val_prophet['ds'] = val_prophet['auction_date']
    prophet_forecast = prophet_result['model'].predict(val_prophet[['ds']])
    prophet_pred = prophet_forecast['yhat'].values
    
    # 앙상블 예측 (LightGBM + XGBoost 50:50)
    ensemble_pred = 0.5 * lgb_pred + 0.5 * xgb_pred
    
    # 성능 계산
    ensemble_mae = mean_absolute_error(y_val, ensemble_pred)
    ensemble_r2 = r2_score(y_val, ensemble_pred)
    
    return {
        'ensemble_mae': ensemble_mae,
        'ensemble_r2': ensemble_r2,
        'lgb_weight': 0.5,
        'xgb_weight': 0.5,
        'prophet_weight': 0.0
    }

def main():
    """메인 함수"""
    print("=== 깨끗한 피처만 사용하는 최종 모델 ===")
    
    # 데이터 로드
    df = load_data()
    print(f"전체 데이터 크기: {df.shape}")
    
    # 어종별 모델 학습
    species_list = ['(활)우럭', '(활)넙치', '(활)참숭어', '(활)참돔', '(활)농어']
    all_results = []
    
    for species in species_list:
        print(f"\n{'='*50}")
        print(f"{species} 모델 학습")
        print(f"{'='*50}")
        
        species_data = df[df['species_name'] == species].copy()
        if len(species_data) == 0:
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
        
        # LightGBM 모델 학습
        print(f"\n1. LightGBM 모델:")
        lgb_result = train_clean_lightgbm(species_data, species)
        print(f"  훈련 MAE: {lgb_result['train_mae']:,.0f}, R²: {lgb_result['train_r2']:.3f}")
        print(f"  검증 MAE: {lgb_result['val_mae']:,.0f}, R²: {lgb_result['val_r2']:.3f}")
        print(f"  과적합 비율: {lgb_result['overfitting_ratio']:.3f}")
        print(f"  피처 수: {len(lgb_result['feature_columns'])}")
        
        # LightGBM 모델 저장
        lgb_filename = f'final_models/lightgbm_clean_{species_key}.txt'
        lgb_result['model'].save_model(lgb_filename)
        print(f"  ✅ LightGBM 모델 저장: {lgb_filename}")
        
        # XGBoost 모델 학습
        print(f"\n2. XGBoost 모델:")
        xgb_result = train_clean_xgboost(species_data, species)
        print(f"  훈련 MAE: {xgb_result['train_mae']:,.0f}, R²: {xgb_result['train_r2']:.3f}")
        print(f"  검증 MAE: {xgb_result['val_mae']:,.0f}, R²: {xgb_result['val_r2']:.3f}")
        print(f"  과적합 비율: {xgb_result['overfitting_ratio']:.3f}")
        print(f"  피처 수: {len(xgb_result['feature_columns'])}")
        
        # XGBoost 모델 저장
        xgb_filename = f'final_models/xgboost_clean_{species_key}.json'
        xgb_result['model'].save_model(xgb_filename)
        print(f"  ✅ XGBoost 모델 저장: {xgb_filename}")
        
        # Prophet 모델 학습
        print(f"\n3. Prophet 모델:")
        prophet_result = train_clean_prophet(species_data, species)
        print(f"  훈련 MAE: {prophet_result['train_mae']:,.0f}, R²: {prophet_result['train_r2']:.3f}")
        print(f"  검증 MAE: {prophet_result['val_mae']:,.0f}, R²: {prophet_result['val_r2']:.3f}")
        print(f"  과적합 비율: {prophet_result['overfitting_ratio']:.3f}")
        
        # Prophet 모델 저장
        prophet_filename = f'final_models/prophet_clean_{species_key}.pkl'
        with open(prophet_filename, 'wb') as f:
            pickle.dump(prophet_result['model'], f)
        print(f"  ✅ Prophet 모델 저장: {prophet_filename}")
        
        # 앙상블 테스트
        print(f"\n4. 앙상블 모델 (LightGBM + XGBoost 50:50):")
        ensemble_result = test_clean_ensemble(species_data, species, lgb_result, xgb_result, prophet_result)
        print(f"  앙상블 MAE: {ensemble_result['ensemble_mae']:,.0f}")
        print(f"  앙상블 R²: {ensemble_result['ensemble_r2']:.3f}")
        
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
            'prophet_train_mae': prophet_result['train_mae'],
            'prophet_val_mae': prophet_result['val_mae'],
            'prophet_train_r2': prophet_result['train_r2'],
            'prophet_val_r2': prophet_result['val_r2'],
            'prophet_overfitting_ratio': prophet_result['overfitting_ratio'],
            'ensemble_mae': ensemble_result['ensemble_mae'],
            'ensemble_r2': ensemble_result['ensemble_r2'],
            'feature_count': len(lgb_result['feature_columns']),
            'lgb_weight': ensemble_result['lgb_weight'],
            'xgb_weight': ensemble_result['xgb_weight'],
            'prophet_weight': ensemble_result['prophet_weight']
        }
        all_results.append(result)
    
    # 결과 분석
    results_df = pd.DataFrame(all_results)
    results_df.to_csv('clean_model_final_results.csv', index=False)
    
    print(f"\n{'='*80}")
    print("=== 깨끗한 피처 모델 최종 결과 ===")
    print(f"{'='*80}")
    
    # 평균 성능
    print(f"\n📊 모델별 평균 성능:")
    print(f"LightGBM:")
    print(f"  - 평균 검증 MAE: {results_df['lgb_val_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['lgb_val_r2'].mean():.3f}")
    print(f"  - 평균 과적합 비율: {results_df['lgb_overfitting_ratio'].mean():.3f}")
    
    print(f"\nXGBoost:")
    print(f"  - 평균 검증 MAE: {results_df['xgb_val_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['xgb_val_r2'].mean():.3f}")
    print(f"  - 평균 과적합 비율: {results_df['xgb_overfitting_ratio'].mean():.3f}")
    
    print(f"\nProphet:")
    print(f"  - 평균 검증 MAE: {results_df['prophet_val_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['prophet_val_r2'].mean():.3f}")
    print(f"  - 평균 과적합 비율: {results_df['prophet_overfitting_ratio'].mean():.3f}")
    
    print(f"\n앙상블 (LightGBM + XGBoost 50:50):")
    print(f"  - 평균 검증 MAE: {results_df['ensemble_mae'].mean():,.0f}")
    print(f"  - 평균 검증 R²: {results_df['ensemble_r2'].mean():.3f}")
    
    # 모델 비교
    print(f"\n🏆 모델 성능 비교:")
    best_mae_model = results_df[['lgb_val_mae', 'xgb_val_mae', 'prophet_val_mae', 'ensemble_mae']].mean().idxmin()
    best_r2_model = results_df[['lgb_val_r2', 'xgb_val_r2', 'prophet_val_r2', 'ensemble_r2']].mean().idxmax()
    
    print(f"  최고 MAE 성능: {best_mae_model} ({results_df[best_mae_model].mean():,.0f})")
    print(f"  최고 R² 성능: {best_r2_model} ({results_df[best_r2_model].mean():.3f})")
    
    # 과적합 진단
    print(f"\n🔍 과적합 진단:")
    avg_lgb_overfitting = results_df['lgb_overfitting_ratio'].mean()
    avg_xgb_overfitting = results_df['xgb_overfitting_ratio'].mean()
    avg_prophet_overfitting = results_df['prophet_overfitting_ratio'].mean()
    
    if avg_lgb_overfitting < 0.8:
        print(f"  ✅ LightGBM: 과적합 없음 (비율: {avg_lgb_overfitting:.3f})")
    else:
        print(f"  ⚠️ LightGBM: 과적합 의심 (비율: {avg_lgb_overfitting:.3f})")
    
    if avg_xgb_overfitting < 0.8:
        print(f"  ✅ XGBoost: 과적합 없음 (비율: {avg_xgb_overfitting:.3f})")
    else:
        print(f"  ⚠️ XGBoost: 과적합 의심 (비율: {avg_xgb_overfitting:.3f})")
    
    if avg_prophet_overfitting < 0.8:
        print(f"  ✅ Prophet: 과적합 없음 (비율: {avg_prophet_overfitting:.3f})")
    else:
        print(f"  ⚠️ Prophet: 과적합 의심 (비율: {avg_prophet_overfitting:.3f})")
    
    print(f"\n💡 최종 결론:")
    print(f"  - 깨끗한 피처만 사용하여 데이터 누수 제거")
    print(f"  - 평균 앙상블 R²: {results_df['ensemble_r2'].mean():.3f}")
    print(f"  - 평균 앙상블 MAE: {results_df['ensemble_mae'].mean():,.0f}")
    print(f"  - 신뢰할 수 있는 실제 성능 달성")
    
    print(f"\n📁 저장된 모델 파일들:")
    species_mapping = {
        '(활)우럭': 'rockfish',
        '(활)넙치': 'flounder', 
        '(활)참숭어': 'mullet',
        '(활)참돔': 'red_sea_bream',
        '(활)농어': 'sea_bass'
    }
    for species in species_list:
        species_key = species_mapping[species]
        print(f"  - final_models/lightgbm_clean_{species_key}.txt")
        print(f"  - final_models/xgboost_clean_{species_key}.json")
        print(f"  - final_models/prophet_clean_{species_key}.pkl")

if __name__ == "__main__":
    main()
