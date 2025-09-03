
/**
 * 경매 예측 관련 타입 정의
 */

// 경매가 데이터 (실제 + 예측)
export interface AuctionPriceData {
  date: string;
  price: number;
  isPrediction: boolean; // 예측 데이터 여부
  confidence?: number; // 예측 신뢰도 (예측 데이터인 경우만)
  isDashedLine?: boolean; // 점선으로 표시할지 여부 (예측 데이터 구분용)
}

// API 응답 타입
export interface AuctionPredictionResponse {
  success: boolean;
  data: SpeciesPrediction[];
  message?: string;
}

// API 요청 파라미터
export interface AuctionPredictionParams {
  species?: string; // 특정 어종만 조회 (없으면 전체)
  days?: number; // 조회할 일수 (기본값: 8일 = 7일 실제 + 1일 예측)
}

// 경매 관련 추가 타입 정의
export interface AuctionPrice {
  id: string;
  fishType: string;
  price: number;
  date: string;
  market: string;
  weight?: number;
  grade?: string;
}

export interface AuctionData {
  dates: string[];
  prices: number[];
  averagePrice: number;
  marketName: string;
  fishTypeName: string;
}

export interface MarketInfo {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface FishTypeInfo {
  id: string;
  name: string;
  category: string;
  defaultPrice?: number;
}

export interface PriceHistory {
  date: string;
  price: number;
  volume: number;
  market: string;
}

export interface AuctionPrediction {
  fishType: string;
  predictedPrice: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

// 확장된 FishSpecies와 SpeciesPrediction (더 많은 속성 포함)
export interface FishSpecies {
  id: string;
  name: string;
  category?: string;
  koreanName?: string;
  unit?: string;
  icon?: string;
}

export interface SpeciesPrediction {
  species: FishSpecies;
  currentPrice: number;
  predictedPrice: number;
  change: number;
  changePercent: number;
  priceChange: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  data: {
    date: string;
    actual: number;
    predicted?: number;
  }[];
  priceHistory: {
    date: string;
    price: number;
    isPrediction: boolean;
    confidence?: number;
    isDashedLine?: boolean; // 점선으로 표시할지 여부
  }[];
  factors: string[];
}

