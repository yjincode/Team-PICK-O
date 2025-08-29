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