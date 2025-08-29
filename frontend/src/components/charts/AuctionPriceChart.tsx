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
  const [isAutoSlide, setIsAutoSlide] = useState(true) // 자동 슬라이드 상태
  const [autoSlideInterval, setAutoSlideInterval] = useState<NodeJS.Timeout | null>(null)

  // 현재 선택된 어종 정보
  const currentSpecies = data[currentSpeciesIndex]

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

  // 차트 데이터 포맷팅 (예측 데이터 제외, 실제 데이터만)
  useEffect(() => {
    if (currentSpecies) {
      const actualData = currentSpecies.priceHistory.filter(item => !item.isPrediction);
      const formattedData = actualData.map((item, index) => {
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
      
      // 디버깅용 로그
      console.log('Chart data:', formattedData);
      console.log('Today:', new Date().toDateString());
      
      setChartData(formattedData)
      
      // 외부 콜백 호출
      onSpeciesChange?.(currentSpecies.species.id)
    }
  }, [currentSpecies, onSpeciesChange])

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
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">
            {currentSpecies.species.koreanName} ({currentSpecies.species.unit})
          </span>
          <div className="flex items-center space-x-3">
            {/* 오늘 날짜 표시 */}
            <span className="text-sm font-medium text-gray-600">
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </span>
            
            {/* 자동 슬라이드 토글 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutoSlide}
              className="h-8 px-3"
              title={isAutoSlide ? "자동 슬라이드 정지" : "자동 슬라이드 시작"}
            >
              {isAutoSlide ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousSpecies}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-600 px-2">
              {currentSpeciesIndex + 1} / {data.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextSpecies}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-4">
          {/* 주요 정보 섹션 - 상단에 가로로 배치 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 예측가격 */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                내일 예측가 <span className="text-gray-500 font-normal">(정확도: {currentSpecies.confidence}%)</span>
              </h3>
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(currentSpecies.predictedPrice)}
                </div>
                {/* 상승률 뱃지를 예측가 가격 오른쪽 옆으로 이동 */}
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${changeDisplay.bgColor} ${changeDisplay.color}`}>
                  <ChangeIcon className="h-3 w-3 mr-1" />
                  {changeDisplay.sign}{currentSpecies.priceChange}%
                </div>
              </div>
            </div>

            {/* 우측: 현재가격 */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                현재 경매가 <span className="text-gray-500 font-normal">(실시간 기준)</span>
              </h3>
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {formatCurrency(currentSpecies.currentPrice)}
              </div>
            </div>
          </div>

          {/* 차트 섹션 - 하단에 가로로 길게 */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3 text-center">
              경매가 동향 <span className="text-sm font-normal text-gray-600">(실제 경매가 7일)</span>
            </h3>
            <div className="h-40">
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
                  />
                  <YAxis 
                    domain={[6000, 20000]}
                    ticks={[6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000]}
                    tickFormatter={(value) => {
                      if (value >= 10000) {
                        return `${(value / 10000).toFixed(0)}만`
                      } else if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}천`
                      }
                      return value.toString()
                    }}
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'price' ? '경매가' : '가격'
                    ]}
                    labelFormatter={(label) => `${label}일`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  
                  {/* 실제 경매가 라인 (파란색 실선) */}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#1d4ed8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 어종 선택 네비게이션 */}
          <div className="flex justify-center space-x-3 pt-4">
            {data.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSpecies(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSpeciesIndex 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`${data[index].species.koreanName} 선택`}
              />
            ))}
          </div>


        </div>
      </CardContent>
    </Card>
  )
}

export default AuctionPriceChart 