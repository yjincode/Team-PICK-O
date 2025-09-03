/**
 * 경매가 예측 차트 컴포넌트
 * 어종별 경매가 동향과 예측을 슬라이드 형식으로 표시하는 차트입니다
 * 
 * 사용법:
 * - 대시보드: <AuctionPriceChart />
 * - 다른 페이지: <AuctionPriceChart data={customData} loading={isLoading} />
 * 
 * TODO: 실제 API 연동 시 mockAuctionPredictions를 실제 API 응답으로 교체
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Brain, Play, Pause } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { SpeciesPrediction } from "../../types/auction"
import { mockAuctionPredictions } from "../../data/mockAuctionData"
import { auctionApi } from "../../lib/api"


// 컴포넌트 props 타입 정의
interface AuctionPriceChartProps {
  data?: SpeciesPrediction[]; // 선택적 - 없으면 목업 데이터 사용
  loading?: boolean; // 로딩 상태
  onSpeciesChange?: (species: string) => void; // 선택적 - 외부에서 어종 변경 감지
}

const AuctionPriceChart: React.FC<AuctionPriceChartProps> = ({ 
  data = mockAuctionPredictions, 
  loading = false,
  onSpeciesChange 
}) => {
  const [currentSpeciesIndex, setCurrentSpeciesIndex] = useState(0)
  const [chartData, setChartData] = useState<any[]>([])
  const [isAutoSlide, setIsAutoSlide] = useState(false) // 자동 슬라이드 상태 (기본 비활성화)
  const [autoSlideInterval, setAutoSlideInterval] = useState<NodeJS.Timeout | null>(null)
  const [realData, setRealData] = useState<any[]>([]) // 실제 경매가 데이터
  const [isLoadingRealData, setIsLoadingRealData] = useState(false)
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null) // 예측가
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date()) // 마지막 업데이트 시간

  const currentSpecies = data[currentSpeciesIndex]

  // 로컬 스토리지 키 생성
  const getStorageKey = (species: string, type: 'real' | 'prediction') => 
    `auction_${type}_${species}_${new Date().toISOString().split('T')[0]}`

  // 로컬 스토리지에서 데이터 가져오기
  const getFromLocalStorage = (species: string, type: 'real' | 'prediction') => {
    try {
      const key = getStorageKey(species, type)
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        console.log(`📦 ${species} ${type} 데이터 로컬에서 사용`)
        return data
      }
    } catch (error) {
      console.warn('로컬 스토리지 읽기 실패:', error)
    }
    return null
  }

  // 로컬 스토리지에 데이터 저장
  const saveToLocalStorage = (species: string, type: 'real' | 'prediction', data: any) => {
    try {
      const key = getStorageKey(species, type)
      localStorage.setItem(key, JSON.stringify(data))
      console.log(`💾 ${species} ${type} 데이터 로컬에 저장`)
    } catch (error) {
      console.warn('로컬 스토리지 저장 실패:', error)
    }
  }

  // 실제 경매가 데이터 가져오기 (로컬 우선, API 백업)
  const fetchRealData = async (targetSpecies?: string) => {
    const speciesToFetch = targetSpecies || currentSpecies?.species?.koreanName || ''
    
    // 먼저 로컬 스토리지에서 확인
    const cached = getFromLocalStorage(speciesToFetch, 'real')
    if (cached) {
      setRealData(cached)
      return
    }

    setIsLoadingRealData(true)
    try {
      const response = await auctionApi.getActualAuctionData(speciesToFetch, 7)
      if (response.success) {
        setRealData(response.data)
        // 로컬 스토리지에 저장
        saveToLocalStorage(speciesToFetch, 'real', response.data)
      }
    } catch (error) {
      console.error('실제 경매가 데이터 가져오기 실패:', error)
    } finally {
      setIsLoadingRealData(false)
    }
  }

  // 예측가 가져오기 (내일 예측) - 로컬 스토리지 우선
  const fetchPrediction = async (targetSpecies?: string) => {
    const speciesToFetch = targetSpecies || currentSpecies?.species?.koreanName || ''
    
    // 먼저 로컬 스토리지에서 확인
    const cached = getFromLocalStorage(speciesToFetch, 'prediction')
    if (cached) {
      setPredictedPrice(cached.predicted_price)
      return
    }

    setIsLoadingPrediction(true)
    try {
      // 내일 날짜 계산
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const targetDate = tomorrow.toISOString().split('T')[0] // YYYY-MM-DD 형식
      
      // 환경 데이터 (기본값)
      const environmentalData = {
        temperature: 20,
        water_temperature: 18,
        humidity: 60,
        precipitation: 0,
        wind_speed: 5,
        pressure: 1013
      }
      
      const response = await auctionApi.predictSingleSpecies(speciesToFetch, targetDate, environmentalData)
      if (response.success && response.prediction) {
        setPredictedPrice(response.prediction.predicted_price)
        // 로컬 스토리지에 저장
        saveToLocalStorage(speciesToFetch, 'prediction', response.prediction)
      }
    } catch (error) {
      console.error('예측가 가져오기 실패:', error)
    } finally {
      setIsLoadingPrediction(false)
    }
  }



  // 컴포넌트 마운트 시 실제 데이터와 예측가 가져오기
  useEffect(() => {
    fetchRealData()
    fetchPrediction()
    
    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 어종이 변경될 때마다 해당 어종의 실제 데이터와 예측가 가져오기
  useEffect(() => {
    if (currentSpecies?.species?.koreanName) {
      fetchRealData(currentSpecies.species.koreanName)
      fetchPrediction(currentSpecies.species.koreanName)
    }
  }, [currentSpeciesIndex])

  // 자동 슬라이드 시작
  const startAutoSlide = () => {
    if (autoSlideInterval) clearInterval(autoSlideInterval)
    
    const interval = setInterval(() => {
      setCurrentSpeciesIndex(prev => 
        prev === data.length - 1 ? 0 : prev + 1
      )
    }, 10000) // 10초마다 자동 슬라이드 
    
    setAutoSlideInterval(interval)
  }

  // 자동 슬라이드 정지
  const stopAutoSlide = () => {
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval)
      setAutoSlideInterval(null)
    }
  }

  // 자동 슬라이드 토글
  const toggleAutoSlide = () => {
    if (isAutoSlide) {
      stopAutoSlide()
      setIsAutoSlide(false)
    } else {
      setIsAutoSlide(true)
      startAutoSlide()
    }
  }

  // 자동 슬라이드 초기화 및 정리
  useEffect(() => {
    if (isAutoSlide) {
      startAutoSlide()
    }
    
    return () => {
      if (autoSlideInterval) {
        clearInterval(autoSlideInterval)
      }
    }
  }, [isAutoSlide, data.length])

  // 차트 데이터 포맷팅 (실제 데이터 우선 사용)
  useEffect(() => {
    if (realData.length > 0) {
      // 실제 데이터가 있으면 실제 데이터 사용
      const formattedData = realData.map((item) => {
        const itemDate = new Date(item.date);
        const today = new Date();
        const isToday = itemDate.getDate() === today.getDate() && 
                       itemDate.getMonth() === today.getMonth() && 
                       itemDate.getFullYear() === today.getFullYear();
        
        return {
          ...item,
          // 날짜 포맷팅 (매우 간결하게)
          formattedDate: item.formattedDate || `${itemDate.getMonth() + 1}.${itemDate.getDate()}`,
          // 오늘 날짜인지 확인 (더 안전한 방법)
          isToday,
          isPrediction: false // 실제 데이터
        };
      });
      
      // 예측가가 있으면 내일 날짜에 추가 (중복 체크 포함)
      if (predictedPrice) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
        
        // 이미 해당 날짜의 실제 데이터가 있는지 확인
        const existingDataForTomorrow = formattedData.find(item => item.date === tomorrowDateStr);
        
        if (!existingDataForTomorrow) {
          // 실제 예측 데이터 추가
          formattedData.push({
            date: tomorrowDateStr,
            price: predictedPrice,
            formattedDate: `${tomorrow.getMonth() + 1}.${tomorrow.getDate()}`,
            isToday: false,
            isPrediction: true // 예측 데이터임을 표시
          });
        }
      }
      
      // 날짜별로 정렬
      const sortedData = formattedData
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // 실제 데이터와 예측 데이터를 별도 필드로 분리
      const chartDataWithSeparateFields = sortedData.map((item, index) => {
        const isLastRealData = !item.isPrediction && index < sortedData.length - 1 && sortedData[index + 1]?.isPrediction;
        
        return {
          ...item,
          realPrice: !item.isPrediction ? item.price : null,
          predictionPrice: item.isPrediction ? item.price : (isLastRealData ? item.price : null) // 연결점을 위해 마지막 실제 데이터도 예측 라인에 포함
        };
      });
      
      setChartData(chartDataWithSeparateFields)
    } else if (currentSpecies) {
      // 실제 데이터가 없으면 목업 데이터 사용
      const formattedData = currentSpecies.priceHistory.map((item, index) => {
        const itemDate = new Date(item.date);
        const today = new Date();
        const isToday = itemDate.getDate() === today.getDate() && 
                       itemDate.getMonth() === today.getMonth() && 
                       itemDate.getFullYear() === today.getFullYear();
        
        return {
          ...item,
          // 날짜 포맷팅 (매우 간결하게)
          formattedDate: `${itemDate.getMonth() + 1}.${itemDate.getDate()}`,
          // 오늘 날짜인지 확인 (더 안전한 방법)
          isToday
        };
      });
      
      // 예측가가 있으면 내일 날짜에 추가 (중복 체크 포함)
      if (predictedPrice) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = tomorrow.toISOString().split('T')[0];
        
        // 이미 해당 날짜의 데이터가 있는지 확인 (목업 데이터에서)
        const existingDataForTomorrow = formattedData.find(item => item.date === tomorrowDateStr);
        
        if (!existingDataForTomorrow) {
          // 중복되지 않는 경우만 예측 데이터 추가
          formattedData.push({
            date: tomorrowDateStr,
            price: predictedPrice,
            formattedDate: `${tomorrow.getMonth() + 1}.${tomorrow.getDate()}`,
            isToday: false,
            isPrediction: true // 예측 데이터임을 표시
          });
        }
      }
      
      // 날짜별로 정렬하고 최종 중복 제거 (목업 데이터도 동일하게 처리)
      const sortedData = formattedData
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .filter((item, index, array) => {
          // 같은 날짜의 첫 번째 항목만 유지 (실제 데이터 우선)
          const firstIndex = array.findIndex(other => other.date === item.date);
          return index === firstIndex;
        });
      
      // 실제 데이터와 예측 데이터를 별도 필드로 분리 (목업 데이터도 동일하게)
      const chartDataWithSeparateFields = sortedData.map((item, index) => {
        const isLastRealData = !item.isPrediction && index < sortedData.length - 1 && sortedData[index + 1]?.isPrediction;
        
        return {
          ...item,
          realPrice: !item.isPrediction ? item.price : null,
          predictionPrice: item.isPrediction ? item.price : (isLastRealData ? item.price : null) // 연결점을 위해 마지막 실제 데이터도 예측 라인에 포함
        };
      });
      
      setChartData(chartDataWithSeparateFields)
      
      // 외부 콜백 호출
      onSpeciesChange?.(currentSpecies.species.id)
    }
  }, [currentSpecies, realData, predictedPrice, onSpeciesChange])

  // 이전 어종으로 이동 (수동 조작 시 자동 슬라이드 일시정지)
  const goToPreviousSpecies = () => {
    stopAutoSlide()
    setIsAutoSlide(false)
    setCurrentSpeciesIndex(prev => 
      prev === 0 ? data.length - 1 : prev - 1
    )
  }

  // 다음 어종으로 이동 (수동 조작 시 자동 슬라이드 일시정지)
  const goToNextSpecies = () => {
    stopAutoSlide()
    setIsAutoSlide(false)
    setCurrentSpeciesIndex(prev => 
      prev === data.length - 1 ? 0 : prev + 1
    )
  }

  // 특정 어종으로 직접 이동 (수동 조작 시 자동 슬라이드 일시정지)
  const goToSpecies = (index: number) => {
    stopAutoSlide()
    setIsAutoSlide(false)
    setCurrentSpeciesIndex(index)
  }

  // 자동 슬라이드 재시작 (10초 후)
  useEffect(() => {
    if (!isAutoSlide) {
      const timer = setTimeout(() => {
        setIsAutoSlide(true)
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [isAutoSlide])

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  // 변동률 색상 및 아이콘 결정
  const getChangeDisplay = (change: number) => {
    const isPositive = change > 0
    return {
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-green-50' : 'bg-red-50',
      icon: isPositive ? TrendingUp : TrendingDown,
      sign: isPositive ? '+' : ''
    }
  }

  // Y축 범위 계산 (고정된 범위로 설정)
  const getYAxisDomain = () => {
    // 고정된 가격 범위 설정 (6천원 ~ 2만원)
    return [6000, 20000]
  }

  // 가장 현실적인 가격 선택 함수
  const getMostRealisticPrice = (data: any[]): number => {
    if (!data || data.length === 0) return 0
    
    // 규격별로 그룹화
    const priceGroups: { [key: string]: number[] } = {}
    
    data.forEach(item => {
      const weight = item.unit_weight_kg || 0
      if (!priceGroups[weight]) {
        priceGroups[weight] = []
      }
      priceGroups[weight].push(item.price)
    })
    
    // 규격별 평균 가격 계산
    const avgPrices = Object.entries(priceGroups).map(([weight, prices]) => ({
      weight: parseFloat(weight),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      count: prices.length
    }))
    
    // 현실적인 규격 우선 선택 (100g 이하는 제외, 적당한 크기 우선)
    const realisticWeights = avgPrices.filter(item => item.weight >= 0.2) // 200g 이상만 고려
    
    if (realisticWeights.length > 0) {
      // 1kg 근처의 규격을 우선적으로 선택
      const preferredWeight = realisticWeights.find(item => 
        item.weight >= 0.5 && item.weight <= 1.2
      )
      
      if (preferredWeight) {
        return Math.round(preferredWeight.avgPrice)
      }
      
      // 선호 규격이 없으면 가장 많은 데이터를 가진 현실적인 규격 선택
      const mostCommon = realisticWeights.reduce((prev, current) => 
        current.count > prev.count ? current : prev
      )
      return Math.round(mostCommon.avgPrice)
    }
    
    // 현실적인 규격이 없으면 전체 평균
    const allPrices = data.map(item => item.price)
    const overallAvg = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
    return Math.round(overallAvg)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">경매가 예측</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 text-sm sm:text-base">경매 예측 데이터를 불러오는 중...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentSpecies) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">경매가 예측</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 text-sm sm:text-base">경매 예측 데이터가 없습니다</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const changeDisplay = getChangeDisplay(currentSpecies.priceChange)
  const ChangeIcon = changeDisplay.icon

     return (
     <Card className="w-full">
               <CardContent className="p-6 pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                                                                               {/* 왼쪽 패널 - 어종 정보 및 가격 */}
                                                                                                                       <div className="lg:col-span-1 flex flex-col justify-start">
                                    {/* 어종명 및 네비게이션 */}
                                       <div className="text-center lg:text-left lg:ml-4 mt-4">
                    <div className="flex items-center justify-center lg:justify-start space-x-3 mb-2">
                      {/* 왼쪽 화살표 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousSpecies}
                        className="h-8 w-8 p-0 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-full shadow-sm"
                        title="이전 어종"
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-700" />
                      </Button>
                      
                      <h2 className="text-3xl font-bold text-gray-900">
                        {currentSpecies.species.koreanName}
                      </h2>
                      
                      {/* 오른쪽 화살표 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextSpecies}
                        className="h-8 w-8 p-0 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-full shadow-sm"
                        title="다음 어종"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-700" />
                      </Button>
                    </div>
                    
                    <p className="text-lg text-gray-600">
                      {new Date().toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                
                                 {/* 가격 정보 */}
                                  <div className="mt-8">
                 {/* 현재가 */}
                 <div className="text-center lg:text-left lg:ml-4 mb-4">
                   <div className="text-sm font-medium text-gray-600 mb-1">현재가</div>
                   <div className="text-4xl font-bold text-gray-800">
                     {(() => {
                       if (isLoadingRealData) {
                         return <div className="animate-pulse">로딩중...</div>
                       }
                       
                       if (realData.length > 0) {
                         // 오늘 날짜의 경매가 찾기
                         const today = new Date()
                         const todayStr = today.toISOString().split('T')[0]
                         const todayData = realData.find(item => item.date === todayStr)
                         
                         if (todayData) {
                           return formatCurrency(todayData.price)
                         }
                         
                         // 오늘 데이터가 없으면 가장 최근 데이터
                         const latestData = realData[realData.length - 1]
                         if (latestData) {
                           return formatCurrency(latestData.price)
                         }
                       }
                       
                       // 실제 데이터가 없으면 목업 데이터 사용
                       return formatCurrency(currentSpecies.currentPrice)
                     })()}
                   </div>
                 </div>
                 
                 {/* 예측가 */}
                 <div className="text-center lg:text-left lg:ml-4">
                   <div className="text-sm font-medium text-gray-600 mb-1">예측가</div>
                   <div className="flex items-center justify-center lg:justify-start space-x-3">
                     <div className="text-4xl font-bold text-blue-600">
                       {isLoadingPrediction ? (
                         <div className="animate-pulse">로딩중...</div>
                       ) : predictedPrice ? (
                         formatCurrency(predictedPrice)
                       ) : (
                         formatCurrency(currentSpecies.predictedPrice)
                       )}
                     </div>
                     {predictedPrice && (() => {
                       // 현재가 계산
                       let currentPrice = currentSpecies.currentPrice
                       
                       if (realData.length > 0) {
                         const today = new Date()
                         const todayStr = today.toISOString().split('T')[0]
                         const todayData = realData.find(item => item.date === todayStr)
                         
                         if (todayData) {
                           currentPrice = todayData.price
                         } else {
                           const latestData = realData[realData.length - 1]
                           if (latestData) {
                             currentPrice = latestData.price
                           }
                         }
                       }
                       
                       if (currentPrice) {
                         const isPositive = predictedPrice > currentPrice
                         return (
                           <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                             isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                           }`}>
                             <ChangeIcon className="h-4 w-4 mr-1" />
                             {isPositive ? '+' : ''}
                             {(((predictedPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%
                           </div>
                         )
                       }
                       
                       return null
                     })()}
                   </div>
                 </div>
               </div>
             </div>
           
                                               {/* 오른쪽 패널 - 차트 */}
             <div className="lg:col-span-4">
                                                         <div className="flex items-center justify-between">
                               <div className="text-left ml-20">
                                 <h3 className="text-lg font-semibold text-gray-800">경매가 동향</h3>
                                 <p className="text-sm text-gray-600 mt-1">(실제 경매가 7일) + 내일 예측가</p>
                               </div>
                               
                                                               {/* 차트 상단 컨트롤 (새로고침, 인디케이터, 자동슬라이드만) */}
                                <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg mr-5">
                                 {/* 수동 새로고침 컨트롤 */}
                                 <div className="flex items-center justify-end space-x-6 mr-4 min-w-0" style={{ flexWrap: 'nowrap' }}>
                                   <div className="flex items-center space-x-2 h-8 flex-shrink-0">
                                     <span className="text-xs text-gray-500 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>업데이트:</span>
                                     <span className="text-xs font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded whitespace-nowrap flex items-center" style={{ whiteSpace: 'nowrap' }}>
                                       {lastUpdateTime.toLocaleTimeString('ko-KR', { 
                                         hour: '2-digit', 
                                         minute: '2-digit' 
                                       })}
                                     </span>
                                   </div>
                                   
                                   <button
                                     onClick={() => {
                                       fetchRealData()
                                       fetchPrediction()
                                       setLastUpdateTime(new Date())
                                     }}
                                     className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-md flex-shrink-0"
                                     title="지금 새로고침"
                                   >
                                     <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                     </svg>
                                   </button>
                                 </div>
                                 
                                 {/* 어종 선택 인디케이터 */}
                                 <div className="flex space-x-1.5">
                                   {data.map((_, index) => (
                                     <button
                                       key={index}
                                       onClick={() => goToSpecies(index)}
                                       className={`transition-all duration-200 ${
                                         index === currentSpeciesIndex 
                                           ? 'w-6 h-2 bg-gray-700 rounded-full' 
                                           : 'w-2 h-2 bg-gray-300 hover:bg-gray-400 rounded-full'
                                       }`}
                                       aria-label={`${data[index].species.koreanName} 선택`}
                                     />
                                   ))}
                                 </div>
                                 
                                 {/* 자동 슬라이드 토글 버튼 */}
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={toggleAutoSlide}
                                   className="h-9 w-9 p-0 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-full shadow-sm"
                                   title={isAutoSlide ? "자동 슬라이드 정지" : "자동 슬라이드 시작"}
                                 >
                                   {isAutoSlide ? (
                                     <Pause className="h-4 w-4 text-gray-700" />
                                   ) : (
                                     <Play className="h-4 w-4 text-gray-700" />
                                   )}
                                 </Button>
                               </div>
                            </div>
              
                            <div className="relative">
                 <div className="h-96">
                                     <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 40, left: 40, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="formattedDate" 
                        tick={(props) => {
                          const isToday = chartData[props.payload.index]?.isToday;
                          return (
                            <text
                              x={props.x}
                              y={props.y + 10}
                              textAnchor="middle"
                              fill={isToday ? "#1f2937" : "#666"}
                              fontSize={isToday ? 13 : 11}
                              fontWeight={isToday ? "bold" : "normal"}
                            >
                              {props.payload.value}
                            </text>
                          );
                        }}
                        stroke="#666"
                        interval={0}
                        allowDuplicatedCategory={false}
                      />
                                             <YAxis 
                         domain={['dataMin - 1000', 'dataMax + 1000']}
                         tickFormatter={(value) => {
                           return Math.floor(value / 1000) + ',000'
                         }}
                         tick={{ fontSize: 14 }}
                         stroke="#666"
                       />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(value), 
                          name === 'price' ? (chartData[0]?.isPrediction ? '예측가' : '경매가') : '가격'
                        ]}
                        labelFormatter={(label) => `${label}일`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      
                      {/* 실제 데이터 라인 (파란색 실선) */}
                      <Line
                        type="monotone"
                        dataKey="realPrice"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={(props) => {
                          const currentData = chartData[props.index];
                          if (currentData?.realPrice == null) return null;
                          
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={4}
                              fill="#3b82f6"
                              stroke="#3b82f6"
                              strokeWidth={1}
                            />
                          );
                        }}
                        activeDot={{ r: 6, fill: '#1d4ed8' }}
                        connectNulls={false}
                      />
                      
                      {/* 예측 데이터 라인 (빨간색 점선) */}
                      <Line
                        type="monotone"
                        dataKey="predictionPrice"
                        stroke="#ef4444"
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        dot={(props) => {
                          const currentData = chartData[props.index];
                          if (currentData?.predictionPrice == null) return null;
                          
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={6}
                              fill="#ef4444"
                              stroke="#dc2626"
                              strokeWidth={2}
                              opacity={0.9}
                            />
                          );
                        }}
                        activeDot={{ r: 7, fill: '#dc2626' }}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                 </div>
               </div>
           </div>
         </div>
         
         
       </CardContent>
     </Card>
   )
}

export default AuctionPriceChart 