# %%
# ===================================================================
# 셀 1: 기본 설정 및 데이터 로딩
# ===================================================================
import os
import django
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

print("Setting up Django environment...")
# Django 환경 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')
django.setup()
print("Django environment set up successfully.")

# Django 모델 임포트
from prediction.models import ActualAuctionPrice, ActualCatchVolume, ExternalEnvironmentalData, FishSpecies

print("Loading data from database...")
# DB에서 데이터 불러오기 (메모리 효율성을 위해 필요한 컬럼만 선택)
price_df = pd.DataFrame(list(ActualAuctionPrice.objects.select_related('fish_species', 'market').values(
    'id', 'trade_date', 'auction_price', 'unit_weight_kg', 'fish_species__item_small_category_name_kr',
    'market__market_name_kr', 'origin_place_code__code_name_kr'
)))

catch_df = pd.DataFrame(list(ActualCatchVolume.objects.select_related('fish_species').values(
    'data_period', 'catch_volume', 'catch_amount', 'fish_species__item_small_category_name_kr'
)))

env_df = pd.DataFrame(list(ExternalEnvironmentalData.objects.values(
    'data_timestamp', 'data_type', 'value', 'unit', 'location_identifier'
)))

print(f"Data loaded successfully:")
print(f"  - Auction prices: {len(price_df)} rows")
print(f"  - Catch volumes: {len(catch_df)} rows")
print(f"  - Environmental data: {len(env_df)} rows")


# %%
# ===================================================================
# 셀 2: 데이터 병합을 위한 전처리
# ===================================================================
print("\nPreprocessing data for merging...")

# --- 1. 날짜 타입 변환 및 기본 정리 ---
price_df['date'] = pd.to_datetime(price_df['trade_date'])
catch_df['date'] = pd.to_datetime(catch_df['data_period'])
env_df['date'] = pd.to_datetime(env_df['data_timestamp']).dt.date
env_df['date'] = pd.to_datetime(env_df['date'])

# 어종명으로 통일 (fish_species_id 대신 어종명 사용)
price_df['fish_species'] = price_df['fish_species__item_small_category_name_kr']
catch_df['fish_species'] = catch_df['fish_species__item_small_category_name_kr']

# 불필요한 컬럼 제거
price_df = price_df.drop(columns=['fish_species__item_small_category_name_kr'])
catch_df = catch_df.drop(columns=['fish_species__item_small_category_name_kr'])

# --- 2. 환경 데이터 피벗 (Pivot) ---
# 'long' 포맷의 환경 데이터를 'wide' 포맷으로 변경하여 각 환경 요소를 컬럼으로 만듭니다.
env_df['value'] = pd.to_numeric(env_df['value'], errors='coerce')

# 지역별로 그룹화하여 평균값 계산
env_pivot = env_df.groupby(['date', 'data_type'])['value'].mean().reset_index()

env_pivot = env_pivot.pivot_table(
    index='date', 
    columns='data_type', 
    values='value',
    aggfunc='mean' # 같은 날, 같은 타입의 데이터가 여러 지역에 있으면 평균값 사용
).reset_index()

# 컬럼명 변경
column_mapping = {
    'PCP': 'rainfall', 
    'TMP': 'temperature', 
    'WSD': 'wind_speed', 
    's_temp': 'water_temp'
}
env_pivot.rename(columns=column_mapping, inplace=True)
print("Environmental data pivoted successfully.")

# --- 3. 어종 이름과 날짜로 데이터 병합 (Merge) ---
# 가격 데이터를 기준으로 모든 데이터를 병합합니다.
df = pd.merge(price_df, env_pivot, on='date', how='left')

# 월별 어획량 데이터는 '연도-월'을 기준으로 병합합니다.
catch_df['year_month'] = catch_df['date'].dt.to_period('M')
df['year_month'] = df['date'].dt.to_period('M')
df = pd.merge(df, catch_df[['year_month', 'fish_species', 'catch_volume', 'catch_amount']], 
              on=['year_month', 'fish_species'], how='left')

# 필요 없는 컬럼 정리
df = df.drop(columns=['id', 'trade_date', 'year_month'])

# 어종별, 날짜별로 정렬
df = df.sort_values(by=['fish_species', 'date']).reset_index(drop=True)
print("All data merged into a single DataFrame.")
print("Initial DataFrame shape:", df.shape)


# %%
# ===================================================================
# 셀 3: 피처 엔지니어링 (Feature Engineering)
# ===================================================================
print("\nStarting feature engineering...")

# --- 1. 결측치 처리 ---
# 환경 데이터는 바로 앞의 값으로 채우기
env_cols = ['rainfall', 'temperature', 'wind_speed', 'water_temp']
for col in env_cols:
    if col in df.columns:
        df[col] = df.groupby('fish_species')[col].transform(lambda x: x.ffill().bfill())

# 월별 어획량은 해당 월 내내 같은 값이므로 Forward-Fill
df['catch_volume'] = df.groupby('fish_species')['catch_volume'].transform(lambda x: x.ffill())
df['catch_amount'] = df.groupby('fish_species')['catch_amount'].transform(lambda x: x.ffill())
print("Missing values handled.")

# --- 2. 날짜 피처 생성 ---
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day'] = df['date'].dt.day
df['day_of_week'] = df['date'].dt.dayofweek # 0:월, 1:화, ...
df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
df['quarter'] = df['date'].dt.quarter
df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)

# 계절성 피처
df['is_spring'] = df['month'].isin([3, 4, 5]).astype(int)
df['is_summer'] = df['month'].isin([6, 7, 8]).astype(int)
df['is_autumn'] = df['month'].isin([9, 10, 11]).astype(int)
df['is_winter'] = df['month'].isin([12, 1, 2]).astype(int)
print("Date features created.")

# --- 3. 시계열 피처 (가격) ---
grouped = df.groupby('fish_species')['auction_price']
df['price_lag_1'] = grouped.shift(1)
df['price_lag_7'] = grouped.shift(7)
df['price_lag_30'] = grouped.shift(30)

# Moving averages
df['price_ma_7'] = grouped.transform(lambda x: x.rolling(window=7, min_periods=1).mean())
df['price_ma_28'] = grouped.transform(lambda x: x.rolling(window=28, min_periods=1).mean())
df['price_ma_90'] = grouped.transform(lambda x: x.rolling(window=90, min_periods=1).mean())

# Volatility features
df['price_std_7'] = grouped.transform(lambda x: x.rolling(window=7, min_periods=1).std())
df['price_std_28'] = grouped.transform(lambda x: x.rolling(window=28, min_periods=1).std())

# Price change features
df['price_change_1d'] = grouped.pct_change(1)
df['price_change_7d'] = grouped.pct_change(7)
df['price_change_30d'] = grouped.pct_change(30)
print("Time-series features for price created.")

# --- 4. 어종별 피처 ---
# 어종별 평균 가격
species_avg_price = df.groupby('fish_species')['auction_price'].transform('mean')
df['price_vs_species_avg'] = df['auction_price'] / species_avg_price

# 어종별 가격 변동성
species_price_std = df.groupby('fish_species')['auction_price'].transform('std')
df['price_vs_species_std'] = (df['auction_price'] - species_avg_price) / species_price_std
print("Species-specific features created.")

# --- 5. 환경 데이터 피처 ---
# 환경 데이터 변화율
for col in env_cols:
    if col in df.columns:
        df[f'{col}_change_1d'] = df.groupby('fish_species')[col].pct_change(1)
        df[f'{col}_ma_7'] = df.groupby('fish_species')[col].transform(lambda x: x.rolling(window=7, min_periods=1).mean())

# 어획량 관련 피처
if 'catch_volume' in df.columns:
    df['catch_volume_ma_3'] = df.groupby('fish_species')['catch_volume'].transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    df['catch_volume_change'] = df.groupby('fish_species')['catch_volume'].pct_change(1)

if 'catch_amount' in df.columns:
    df['catch_amount_ma_3'] = df.groupby('fish_species')['catch_amount'].transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    df['catch_amount_change'] = df.groupby('fish_species')['catch_amount'].pct_change(1)
print("Environmental and catch volume features created.")

# --- 6. 최종 정리 ---
# 피처 생성 과정에서 발생한 맨 앞의 결측치들 제거
final_df = df.dropna().reset_index(drop=True)

# 수치형 컬럼만 선택 (카테고리형은 제외)
numeric_columns = final_df.select_dtypes(include=[np.number]).columns.tolist()
final_df = final_df[numeric_columns + ['date', 'fish_species']]

print("Feature engineering complete.")
print("Final DataFrame shape:", final_df.shape)
print("\nFinal DataFrame columns:", final_df.columns.tolist())
print("\n--- Sample of Final DataFrame ---")
print(final_df.head())

# 데이터 품질 확인
print(f"\n--- Data Quality Check ---")
print(f"Missing values: {final_df.isnull().sum().sum()}")
print(f"Duplicate rows: {final_df.duplicated().sum()}")
print(f"Memory usage: {final_df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")


# %%
# ===================================================================
# 셀 4: 결과 저장 (선택)
# ===================================================================
print("\nSaving the final DataFrame...")

# 나중에 모델 학습 시 빠르게 불러올 수 있도록 Parquet 포맷으로 저장
output_path = "analysis/feature_engineered_data.parquet"
final_df.to_parquet(output_path, index=False)

print(f"Successfully saved to {output_path}")
print(f"File size: {os.path.getsize(output_path) / 1024**2:.2f} MB")