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
  const [isAutoSlide, setIsAutoSlide] = useState(false) // 자동 슬라이드 상태 (기본 비활성화)
  const [autoSlideInterval, setAutoSlideInterval] = useState<NodeJS.Timeout | null>(null)


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

  // 차트 데이터 포맷팅
  useEffect(() => {
    if (currentSpecies) {
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
               <CardContent className="p-6 pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                                                                               {/* 왼쪽 패널 - 어종 정보 및 가격 */}
                                                                                                                       <div className="lg:col-span-1 flex flex-col justify-start">
                                    {/* 어종명 */}
                                       <div className="text-center lg:text-left lg:ml-4 mt-4">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {currentSpecies.species.koreanName}
                    </h2>
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
                     {formatCurrency(currentSpecies.currentPrice)}
                   </div>
                 </div>
                 
                 {/* 예측가 */}
                 <div className="text-center lg:text-left lg:ml-4">
                   <div className="text-sm font-medium text-gray-600 mb-1">예측가</div>
                   <div className="flex items-center justify-center lg:justify-start space-x-3">
                     <div className="text-4xl font-bold text-blue-600">
                       {formatCurrency(currentSpecies.predictedPrice)}
                     </div>
                     <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${changeDisplay.bgColor} ${changeDisplay.color}`}>
                       <ChangeIcon className="h-4 w-4 mr-1" />
                       {changeDisplay.sign}{currentSpecies.priceChange}%
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           
                                               {/* 오른쪽 패널 - 차트 */}
             <div className="lg:col-span-4">
                                                         <div className="flex items-center justify-between">
                               <h3 className="text-lg font-semibold text-gray-800 text-left ml-20">
                                 경매가 동향 <span className="text-sm font-normal text-gray-600">(실제 경매가 7일)</span>
                               </h3>
                               
                                                               {/* 차트 상단 네비게이션 컨트롤 */}
                                <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg mr-5">
                                 {/* 왼쪽 화살표 버튼 */}
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={goToPreviousSpecies}
                                   className="h-9 w-9 p-0 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-full shadow-sm"
                                   title="이전 어종"
                                 >
                                   <ChevronLeft className="h-4 w-4 text-gray-700" />
                                 </Button>
                                 
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
                                 
                                 {/* 오른쪽 화살표 버튼 */}
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={goToNextSpecies}
                                   className="h-9 w-9 p-0 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-full shadow-sm"
                                   title="다음 어종"
                                 >
                                   <ChevronRight className="h-4 w-4 text-gray-700" />
                                 </Button>
                               </div>
                            </div>
              
                            <div className="relative">
                 <div className="h-64">
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
                         interval={1}
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
           </div>
         </div>
         
         
       </CardContent>
     </Card>
   )
}

export default AuctionPriceChart 