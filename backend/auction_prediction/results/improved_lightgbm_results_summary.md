
# 개선된 LightGBM 경매가 예측 모델 결과

## 모델 성능
- **RMSE**: 10,091원
- **MAE**: 7,002원  
- **R²**: 0.297

## 교차 검증 결과
- **RMSE 평균**: 12,340원 (±2,142원)
- **R² 평균**: 0.035 (±0.662)

## 개선 사항
- 데이터 누수 특성 제거 (min_price, max_price)
- 모델 복잡도 감소 (num_leaves: 31 → 15)
- 학습률 감소 (0.05 → 0.03)
- 정규화 강화 (L1, L2 정규화 추가)
- 최소 데이터 수 증가 (min_data_in_leaf: 20)

## 생성 일시
2025년 08월 15일 19:57:54

## 특성 정보
- **특성 수**: 9개
- **주요 특성**: year, month, day, day_of_week, target_species_encoded...

## 저장된 파일
- 모델: `auction_prediction/models/improved_lightgbm_auction_model.pkl`
- 시각화: `auction_prediction/results/improved_lightgbm_results.png`
