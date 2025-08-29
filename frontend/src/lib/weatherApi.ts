import { WeatherData, WeatherWarning, UserLocation, OpenMeteoResponse, WarningLevel, WarningType } from '../types/weather';

// 주소를 좌표로 변환하는 함수
export const getCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lon: number; name: string } | null> => {
  try {    
    // Open-Meteo Geocoding API로 주소 검색
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=ko&format=json&country_code=KR`
    );
    
    if (!response.ok) {
      throw new Error('주소 검색에 실패했습니다.');
    }

    const data = await response.json();
    
    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      const result = data.results[0];
      
      // 한국 지역인지 확인
      if (result.country_code === 'KR' || result.country === '대한민국') {
        return {
          lat: result.latitude,
          lon: result.longitude,
          name: result.name
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// 사용자 주소로 기본 위치 설정하는 함수
export const setUserDefaultLocation = async (userAddress: string): Promise<UserLocation> => {
  try {
    const coords = await getCoordinatesFromAddress(userAddress);
    
    if (coords) {
      return {
        name: coords.name,
        lat: coords.lat,
        lon: coords.lon,
        isDefault: true
      };
    } else {
      // 주소 변환 실패 시 서울로 기본 설정
      return {
        name: "서울",
        lat: 37.5665,
        lon: 126.9780,
        isDefault: true
      };
    }
  } catch (error) {
    // 에러 시 서울로 기본 설정
    return {
      name: "서울",
      lat: 37.5665,
      lon: 126.9780,
      isDefault: true
    };
  }
};

// 날씨 아이콘 매핑
const getWeatherIcon = (weatherCode: number): string => {
  const iconMap: { [key: number]: string } = {
    0: '☀️',   // 맑음
    1: '🌤️',   // 대체로 맑음
    2: '⛅',    // 구름 많음
    3: '☁️',   // 흐림
    45: '🌫️',  // 안개
    48: '🌫️',  // 짙은 안개
    51: '🌧️',  // 가벼운 비
    53: '🌧️',  // 보통 비
    55: '🌧️',  // 강한 비
    61: '🌧️',  // 비
    63: '🌧️',  // 보통 비
    65: '🌧️',  // 강한 비
    71: '🌨️',  // 눈
    73: '🌨️',  // 보통 눈
    75: '🌨️',  // 강한 눈
    95: '⛈️',  // 천둥번개
  };
  
  return iconMap[weatherCode] || '🌤️';
};

// Open-Meteo API 호출
export const fetchWeatherData = async (lat: number = 37.5665, lon: number = 126.9780): Promise<WeatherData> => {
    try {
      const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Seoul`
      );
      
      if (!response.ok) {
      throw new Error('날씨 정보를 가져올 수 없습니다');
      }

    const data: OpenMeteoResponse = await response.json();
    return transformWeatherData(data, lat, lon);
    } catch (error) {
      throw error;
    }
};

// 데이터 변환
const transformWeatherData = (apiData: OpenMeteoResponse, lat: number, lon: number): WeatherData => {
  return {
    current: {
      temperature: Math.round(apiData.current_weather.temperature),
      weatherIcon: getWeatherIcon(apiData.current_weather.weathercode),
      humidity: Math.round(apiData.hourly.relative_humidity_2m[0]),
      precipitationProb: Math.round(apiData.hourly.precipitation_probability[0])
    },
    daily: {
      maxTemp: Math.round(apiData.daily.temperature_2m_max[0]),
      minTemp: Math.round(apiData.daily.temperature_2m_min[0]),
      precipitationProb: Math.round(apiData.daily.precipitation_probability_max[0])
    },
    location: {
      name: '현재 위치', // 이 부분은 WeatherWidget에서 실제 지역명으로 덮어쓸 예정
      lat,
      lon
    }
  };
};

// 특보 정보 (백엔드 기상청 API 호출)
export const fetchWeatherWarning = async (area?: string): Promise<WeatherWarning | null> => {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const url = area 
      ? `${apiBaseUrl}/dashboard/weather/warnings/?area=${encodeURIComponent(area)}`
      : `${apiBaseUrl}/dashboard/weather/warnings/`;    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`경보 API 호출 실패: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      // 첫 번째 경보 정보 반환
      const warning = data.data[0];
  return {
        level: warning.level as WarningLevel,
        type: warning.type as WarningType,
        message: warning.message,
        area: warning.area,
        validTime: warning.validTime
      };
    }
    
    // 경보가 없으면 null 반환
    return null;
    
  } catch (error) {
    // 에러 시 null 반환 (경보배너 숨김)
    return null;
  }
};

// 캐싱 관련 유틸리티
export const isDataStale = (lastUpdated: Date, cacheDuration: number): boolean => {
  return Date.now() - lastUpdated.getTime() > cacheDuration;
};

export const WEATHER_CACHE_DURATION = 10 * 60 * 1000; // 10분
export const WARNING_CACHE_DURATION = 60 * 60 * 1000; // 1시간

// GPS로 현재 위치 감지
export const getCurrentLocation = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS를 지원하지 않는 브라우저입니다.'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({
          name: '현재 위치',
          lat: latitude,
          lon: longitude,
          isDefault: false
        });
      },
      (error) => {
        reject(new Error('위치 정보를 가져올 수 없습니다.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5분
      }
    );
  });
};

// GPS 좌표를 지역명으로 변환하는 함수 (간단한 버전)
export const getLocationNameFromCoords = async (lat: number, lon: number): Promise<string> => {
  try {
    // 간단한 좌표 기반 지역명 매핑
    const locationMap: { [key: string]: string } = {
      '37.5665,126.9780': '서울',
      '37.4563,126.7052': '인천',
      '35.1796,129.0756': '부산',
      '35.8714,128.6014': '대구',
      '35.1595,126.8526': '광주',
      '36.3504,127.3845': '대전',
      '37.2911,127.0089': '수원',
      '37.7527,128.8724': '강릉',
      '36.6744,127.2829': '청주',
      '35.5384,129.3114': '울산'
    };
    
    // 좌표를 반올림하여 매핑
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    const coordKey = `${roundedLat},${roundedLon}`;
    
    // 가장 가까운 좌표 찾기
    let closestLocation = '현재 위치';
    let minDistance = Infinity;
    
    Object.keys(locationMap).forEach(key => {
      const [mapLat, mapLon] = key.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(lat - mapLat, 2) + Math.pow(lon - mapLon, 2));
      
      if (distance < minDistance && distance < 0.1) { // 0.1도 이내
        minDistance = distance;
        closestLocation = locationMap[key];
      }
    });
    
    return closestLocation;
    
  } catch (error) {
    return '현재 위치';
  }
};
