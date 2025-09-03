/**
 * 경매 예측 목업 데이터
 * 실제 API 연동 시 이 파일의 데이터를 실제 API 응답으로 교체하면 됩니다.
 */

import { FishSpecies, SpeciesPrediction } from '../types/auction';

// 지원하는 어종 목록
export const SUPPORTED_SPECIES: FishSpecies[] = [
  {
    id: 'flounder',
    name: 'Flounder',
    koreanName: '광어',
    unit: 'kg'
  },
  {
    id: 'rockfish',
    name: 'Rockfish',
    koreanName: '우럭',
    unit: 'kg'
  },
  {
    id: 'sea_bass',
    name: 'Sea Bass',
    koreanName: '농어',
    unit: 'kg'
  },
  {
    id: 'red_sea_bream',
    name: 'Red Sea Bream',
    koreanName: '참돔',
    unit: 'kg'
  },
  {
    id: 'mullet',
    name: 'Mullet',
    koreanName: '숭어',
    unit: 'kg'
  }
];

// 최근 7일간의 실제 경매가 + 1일 예측 데이터 생성 함수
const generatePriceHistory = (
  basePrice: number,
  volatility: number = 0.1,
  trend: number = 0.02
): Array<{ date: string; price: number; isPrediction: boolean; confidence?: number }> => {
  const today = new Date();
  const history = [];
  
  // 최근 7일간의 실제 데이터
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // 가격 변동 (기본 가격 + 트렌드 + 랜덤 변동)
    const trendEffect = basePrice * trend * (6 - i);
    const randomChange = basePrice * volatility * (Math.random() - 0.5);
    const price = Math.max(1000, Math.round(basePrice + trendEffect + randomChange));
    
    history.push({
      date: date.toISOString().split('T')[0],
      price,
      isPrediction: false
    });
  }
  
  // 9월 4일 예측 데이터 (빨간 점선으로 표시)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const predictedPrice = Math.max(1000, Math.round(basePrice + basePrice * trend * 7 + basePrice * volatility * (Math.random() - 0.5)));
  
  history.push({
    date: tomorrow.toISOString().split('T')[0],
    price: predictedPrice,
    isPrediction: true,
    confidence: Math.floor(Math.random() * 20) + 75, // 75-95% 신뢰도
    isDashedLine: true // 빨간 점선으로 표시할 플래그
  });
  
  return history;
};

// 어종별 예측 데이터 생성
export const mockAuctionPredictions: SpeciesPrediction[] = [
  {
    species: SUPPORTED_SPECIES[0], // 광어
    currentPrice: 12500,
    predictedPrice: 13200,
    change: 700,
    changePercent: 5.6,
    priceChange: 5.6,
    trend: 'up' as const,
    confidence: 87,
    data: [],
    factors: ['수온 상승', '어획량 감소', '수요 증가'],
    priceHistory: generatePriceHistory(12500, 0.08, 0.015)
  },
  {
    species: SUPPORTED_SPECIES[1], // 우럭
    currentPrice: 8900,
    predictedPrice: 9200,
    change: 300,
    changePercent: 3.4,
    priceChange: 3.4,
    trend: 'up' as const,
    confidence: 82,
    data: [],
    factors: ['계절적 수요', '양식장 공급 안정'],
    priceHistory: generatePriceHistory(8900, 0.12, 0.02)
  },
  {
    species: SUPPORTED_SPECIES[2], // 농어
    currentPrice: 15600,
    predictedPrice: 16200,
    change: 600,
    changePercent: 3.8,
    priceChange: 3.8,
    trend: 'up' as const,
    confidence: 91,
    data: [],
    factors: ['고급어종 선호도 증가', '안정적 공급'],
    priceHistory: generatePriceHistory(15600, 0.06, 0.025)
  },
  {
    species: SUPPORTED_SPECIES[3], // 참돔
    currentPrice: 18900,
    predictedPrice: 19500,
    change: 600,
    changePercent: 3.2,
    priceChange: 3.2,
    trend: 'up' as const,
    confidence: 85,
    data: [],
    factors: ['명절 수요 증가', '프리미엄 시장 확대'],
    priceHistory: generatePriceHistory(18900, 0.09, 0.018)
  },
  {
    species: SUPPORTED_SPECIES[4], // 숭어
    currentPrice: 7200,
    predictedPrice: 7500,
    change: 300,
    changePercent: 4.2,
    priceChange: 4.2,
    trend: 'up' as const,
    confidence: 78,
    data: [],
    factors: ['계절적 어획량 변동', '지역 특산품 인기'],
    priceHistory: generatePriceHistory(7200, 0.15, 0.022)
  }
];
