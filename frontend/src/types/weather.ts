// 기본 날씨 데이터 타입
export interface WeatherData {
  current: {
    temperature: number;        // 현재 온도
    weatherIcon: string;       // 날씨 아이콘
    humidity: number;          // 습도 (%)
    precipitationProb: number; // 강수 확률 (%)
  };
  daily: {
    maxTemp: number;           // 최고 기온
    minTemp: number;           // 최저 기온
    precipitationProb: number; // 강수 확률
  };
  location: {
    name: string;              // 지역명
    lat: number;              // 위도
    lon: number;              // 경도
  };
}

// 경보 레벨별 스타일 정의
export type WarningLevel = '주의보' | '경보' | '심각';

// 경보 타입별 스타일 정의
export type WarningType = '폭염' | '태풍' | '대설' | '강풍' | '호우' | '건조' | '황사' | '한파' | '기타';

// 경보 스타일 정보
export interface WarningStyle {
  bgColor: string;      // 배경색
  borderColor: string;  // 테두리색
  textColor: string;    // 텍스트색
  icon: string;         // 아이콘 (이모지)
}

// 경보 레벨별 기본 스타일
export const WARNING_LEVEL_STYLES: Record<WarningLevel, WarningStyle> = {
  '주의보': {
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    icon: '⚠️'
  },
  '경보': {
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    icon: '🚨'
  },
  '심각': {
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: '🚨'
  }
};

// 경보 타입별 추가 스타일 (레벨 스타일을 오버라이드)
export const WARNING_TYPE_STYLES: Partial<Record<WarningType, Partial<WarningStyle>>> = {
  '폭염': {
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: '🔥'
  },
  '태풍': {
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    icon: '🌀'
  },
  '대설': {
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    icon: '❄️'
  },
  '강풍': {
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    icon: '💨'
  },
  '호우': {
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    icon: '🌧️'
  }
};

// 특보 정보 타입
export interface WeatherWarning {
  level: WarningLevel;  // 주의보/경보/심각
  type: WarningType;    // 구체적인 경보 유형
  message: string;      // 특보 메시지
  area: string;         // 발효 지역
  validTime: string;    // 유효 시간
}

// 사용자 위치 설정 타입
export interface UserLocation {
  id?: number;
  name: string;               // 위치명 (집, 회사 등)
  lat: number;                // 위도
  lon: number;                // 경도
  isDefault: boolean;         // 기본 위치 여부
  createdAt?: Date;
}

// API 응답 타입
export interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}
