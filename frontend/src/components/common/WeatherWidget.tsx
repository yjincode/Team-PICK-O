import React, { useState, useEffect } from 'react';
import { RefreshCw, MapPin, Navigation, Search } from 'lucide-react';
import { WeatherData, WeatherWarning, UserLocation, WARNING_LEVEL_STYLES, WARNING_TYPE_STYLES } from '../../types/weather';
import { fetchWeatherData, fetchWeatherWarning, getCurrentLocation, getLocationNameFromCoords, getCoordinatesFromAddress, WEATHER_CACHE_DURATION, isDataStale } from '../../lib/weatherApi';

interface WeatherWidgetProps {
  className?: string;
  userAddress?: string; // 사용자 주소 (회원가입 시 입력한 주소)
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ className = '', userAddress }) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherWarning, setWeatherWarning] = useState<WeatherWarning | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [currentLocation, setCurrentLocation] = useState<UserLocation>({
    name: "서울", lat: 37.5665, lon: 126.9780, isDefault: true
  });

  const [addressInput, setAddressInput] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);

  // 사용자 주소로 초기 위치 설정
  useEffect(() => {
    if (userAddress) {
      setUserLocationFromAddress(userAddress);
    }
  }, [userAddress]);

  // 주소로 위치 설정
  const setUserLocationFromAddress = async (address: string) => {
    try {
      const result = await getCoordinatesFromAddress(address);
      if (result) {
        const newLocation: UserLocation = {
          name: result.name,
          lat: result.lat,
          lon: result.lon,
          isDefault: true
        };
        setCurrentLocation(newLocation);
        await loadWeatherData(newLocation);
      }
    } catch (error) {
    }
  };

  // 주소 입력 제출 (Enter 키)
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      await setUserLocationFromAddress(addressInput.trim());
      setAddressInput('');
      setShowAddressInput(false);
    }
  };

  const loadWeatherData = async (location?: UserLocation) => {
    try {
      setLoading(true);
      const targetLocation = location || currentLocation;
      
      // 날씨 데이터와 특보 정보를 동시에 가져오기
      const [data, warning] = await Promise.all([
        fetchWeatherData(targetLocation.lat, targetLocation.lon),
        fetchWeatherWarning(targetLocation.name)  // 현재 지역의 경보 정보 가져오기
      ]);
            
      // 위치 정보 업데이트
      data.location.name = targetLocation.name;
      data.location.lat = targetLocation.lat;
      data.location.lon = targetLocation.lon;
      
      setWeatherData(data);
      setWeatherWarning(warning);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('날씨 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadWeatherData();
  };

  // GPS 현재 위치 감지
  const handleCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      
      // GPS 좌표를 실제 지역명으로 변환
      const locationName = await getLocationNameFromCoords(location.lat, location.lon);      
      const newLocation: UserLocation = {
        name: locationName,
        lat: location.lat,
        lon: location.lon,
        isDefault: false
      };
      
      setCurrentLocation(newLocation);
      await loadWeatherData(newLocation);
    } catch (err) {
      setError('현재 위치를 감지할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherData();
  }, []);

  useEffect(() => {
    if (lastUpdated && isDataStale(lastUpdated, WEATHER_CACHE_DURATION)) {
      loadWeatherData();
    }
  }, [lastUpdated]);

  // 경보 정보 주기적 업데이트 (5분마다)
  useEffect(() => {
    const warningInterval = setInterval(() => {
      if (currentLocation.name) {
        fetchWeatherWarning(currentLocation.name).then(setWeatherWarning);
      }
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(warningInterval);
  }, [currentLocation.name]);

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-2 ${className}`}>
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className={`bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-100 p-2 ${className}`}>
        <div className="text-center text-red-600 text-xs">
          {error || '날씨 정보를 불러올 수 없습니다.'}
        </div>
      </div>
    );
  }

  const getWarningStyle = (warning: WeatherWarning) => {
    const { level, type } = warning;
    
    // 기본 레벨 스타일
    const baseStyle = WARNING_LEVEL_STYLES[level];
    
    // 타입별 추가 스타일 (있는 경우 오버라이드)
    const typeStyle = WARNING_TYPE_STYLES[type] || {};
    
    // 최종 스타일 조합
    const finalStyle = {
      bgColor: typeStyle.bgColor || baseStyle.bgColor,
      textColor: typeStyle.textColor || baseStyle.textColor,
      icon: typeStyle.icon || baseStyle.icon
    };
    
    return {
      className: `${finalStyle.bgColor} ${finalStyle.textColor} rounded-b-lg`,
      icon: finalStyle.icon
    };
  };

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className} flex flex-col`}>
      <div className="p-4 flex-1 flex flex-col justify-between">
        {/* Location and action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin size={16} className="text-gray-600 mr-2" />
            <button
              onClick={() => setShowAddressInput(!showAddressInput)}
              className="text-base font-medium text-gray-800 hover:text-blue-600 transition-colors"
            >
              {currentLocation.name}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCurrentLocation}
              className="text-gray-600 hover:text-blue-600 transition-all duration-200 p-1.5 rounded-full hover:bg-blue-50"
              title="현재 위치"
            >
              <Navigation size={14} />
            </button>
            <button
              onClick={handleRefresh}
              className="text-gray-600 hover:text-blue-600 transition-all duration-200 p-1.5 rounded-full hover:bg-blue-50"
              title="새로고침"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Simple address input */}
        {showAddressInput && (
          <form onSubmit={handleAddressSubmit} className="mt-3">
            <div className="flex items-center space-x-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="주소 입력 후 Enter"
                className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-300"
                autoFocus
              />
            </div>
          </form>
        )}

        {/* Special warning banner - inside widget */}
        {weatherWarning && (
          <div className={`my-2 p-2 rounded-lg ${getWarningStyle(weatherWarning).className}`}>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-base">{getWarningStyle(weatherWarning).icon}</span>
              <span className="text-sm font-medium">{weatherWarning.message}</span>
            </div>
          </div>
        )}
            
        {/* Temperature and details - center area */}
        <div className="flex items-center justify-between flex-1 min-h-0">
          <div className="flex items-center space-x-3">
            <div className="text-5xl">{weatherData.current.weatherIcon}</div>
            <div className="text-3xl font-bold text-gray-800">
              {weatherData.current.temperature}°C
            </div>
          </div>

          <div className="text-right text-base text-gray-700">
            <div className="mb-2 font-medium">강수확률 {weatherData.current.precipitationProb}%</div>
            <div className="text-lg font-semibold">{weatherData.daily.minTemp}° / {weatherData.daily.maxTemp}°</div>
          </div>
        </div>
      </div>
    </div>
  );
}; 