
/**
 * 경매 예측 관련 타입 정의
 */

// 어종 정보
export interface FishSpecies {
  id: string;
  name: string;
  koreanName: string;
  unit: string;
}

// 경매가 데이터 (실제 + 예측)
export interface AuctionPriceData {
  date: string;
  price: number;
  isPrediction: boolean; // 예측 데이터 여부
  confidence?: number; // 예측 신뢰도 (예측 데이터인 경우만)
}

// 어종별 경매 예측 정보
export interface SpeciesPrediction {
  species: FishSpecies;
  currentPrice: number; // 현재 가격
  predictedPrice: number; // 예측 가격
  confidence: number; // 예측 신뢰도
  priceChange: number; // 전일 대비 변동률
  priceHistory: AuctionPriceData[]; // 최근 7일 + 예측 1일
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
=======
// 경매 관련 타입 정의

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
  }[];
  factors: string[];
}

