/**
 * 매출 통계 페이지
 * 월별 매출 현황과 상세 분석을 제공하는 페이지입니다
 * TODO: 실제 차트 라이브러리(Chart.js, Recharts 등) 연동 필요
 */
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, ChevronDown } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { salesApi } from "../../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Crown, Trophy, TrendingUp as TrendUp } from "lucide-react";


// 매출 데이터 타입 정의
interface SalesStats {
  total_revenue: number;
  monthly_average?: number;
  daily_average?: number;
  highest_month_revenue?: number;
  highest_period?: string;
  growth_rate: number;
  monthly_data: Array<{
    month: string;
    revenue: number;
    order_count: number;
  }>;
  period_type?: string;
  selected_period?: string;
}


type PeriodType = 'month' | 'year';

// 거래처 구매 순위 데이터 타입
interface BusinessRanking {
  business_id: number;
  business_name: string;
  total_purchase: number;
  order_count: number;
  percentage: number;
}

// 어종별 판매량 데이터 타입
interface FishTypeSales {
  fish_type_id: number;
  fish_name: string;
  total_quantity: number;
  unit: string;
  total_revenue: number;
  percentage: number;
}



export default function SalesChart() {
  // 상태 관리
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    // 디폴트값: 현재 달
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessRankings, setBusinessRankings] = useState<BusinessRanking[]>([])
  const [fishTypeSales, setFishTypeSales] = useState<FishTypeSales[]>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [loadingFishSales, setLoadingFishSales] = useState(false)

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`

  // 거래처 구매 순위 데이터 로드
  const loadBusinessRankings = async () => {
    try {
      setLoadingRankings(true)
      
      const params: any = { 
        period_type: periodType,
        selected_period: selectedPeriod || undefined,
        limit: 10 // 상위 10개 거래처만
      }
      
      const data = await salesApi.getBusinessRanking(params)
      setBusinessRankings(data.rankings)
    } catch (err) {
      console.error('거래처 순위 데이터 로드 실패:', err)
      setBusinessRankings([])
    } finally {
      setLoadingRankings(false)
    }
  }

  // 어종별 판매량 데이터 로드
  const loadFishTypeSales = async () => {
    try {
      setLoadingFishSales(true)
      
      const params: any = { 
        period_type: periodType,
        selected_period: selectedPeriod || undefined
      }
      
      const data = await salesApi.getFishTypeSales(params)
      setFishTypeSales(data.fish_sales)
    } catch (err) {
      console.error('어종별 판매량 데이터 로드 실패:', err)
      setFishTypeSales([])
    } finally {
      setLoadingFishSales(false)
    }
  }

  // 매출 통계 데이터 로드
  const loadSalesStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: any = { 
        period_type: periodType,
        selected_period: selectedPeriod || undefined
      }
      
      // 기간별 날짜 범위 설정 (선택된 기간이 없을 때만)
      if (!selectedPeriod) {
        const now = new Date()
        if (periodType === 'month') {
          // 최근 12개월
          const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1)
          params.start_date = lastYear.toISOString().split('T')[0]
          params.end_date = now.toISOString().split('T')[0]
        } else {
          // 최근 5년
          const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1)
          params.start_date = fiveYearsAgo.toISOString().split('T')[0]
          params.end_date = now.toISOString().split('T')[0]
        }
      }
      
      const data = await salesApi.getStats(params)
      
      // 특정 월 선택 시 해당 월의 총 매출 및 성장률 계산
      if (periodType === 'month' && selectedPeriod && data.monthly_data) {
        const monthlyTotal = data.monthly_data.reduce((sum, item) => sum + item.revenue, 0)
        data.total_revenue = monthlyTotal
        
        // 일평균 매출 계산 (매출이 있는 날짜만 고려, 1000원 단위)
        const daysWithRevenue = data.monthly_data.filter(item => item.revenue > 0)
        if (daysWithRevenue.length > 0) {
          const dailyAvg = monthlyTotal / daysWithRevenue.length
          data.daily_average = Math.round(dailyAvg / 1000) * 1000
        } else {
          data.daily_average = 0
        }
        
        // 전월 대비 성장률 계산
        try {
          const [year, month] = selectedPeriod.split('-')
          const prevMonth = parseInt(month) - 1
          const prevYear = prevMonth === 0 ? parseInt(year) - 1 : parseInt(year)
          const prevMonthStr = prevMonth === 0 ? '12' : prevMonth.toString().padStart(2, '0')
          const prevPeriod = `${prevYear}-${prevMonthStr}`
          
          // 전월 데이터 요청
          const prevParams = {
            period_type: periodType,
            selected_period: prevPeriod
          }
          const prevData = await salesApi.getStats(prevParams)
          const prevMonthTotal = prevData.monthly_data?.reduce((sum, item) => sum + item.revenue, 0) || 0
          
          if (prevMonthTotal > 0) {
            data.growth_rate = ((monthlyTotal - prevMonthTotal) / prevMonthTotal) * 100
          } else {
            data.growth_rate = monthlyTotal > 0 ? 100 : 0
          }
        } catch (error) {
          console.error('전월 데이터 로드 실패:', error)
          data.growth_rate = 0
        }
      }
      
      // 년도별 보기에서 성장률 및 월평균 계산
      if (periodType === 'year') {
        // 월평균 매출 계산 (매출이 있는 월만 고려, 1000원 단위)
        if (data.monthly_data) {
          const monthsWithRevenue = data.monthly_data.filter(item => item.revenue > 0)
          if (monthsWithRevenue.length > 0) {
            const monthlyAvg = data.total_revenue / monthsWithRevenue.length
            data.monthly_average = Math.round(monthlyAvg / 1000) * 1000
          } else {
            data.monthly_average = 0
          }
        }
        
        // 특정 년도 선택 시 전년 대비 성장률 계산
        if (selectedPeriod) {
          try {
            const currentYear = parseInt(selectedPeriod)
            const prevYear = currentYear - 1
            
            // 전년 데이터 요청
            const prevParams = {
              period_type: periodType,
              selected_period: prevYear.toString()
            }
            const prevData = await salesApi.getStats(prevParams)
            const prevYearTotal = prevData.total_revenue || 0
            
            if (prevYearTotal > 0) {
              data.growth_rate = ((data.total_revenue - prevYearTotal) / prevYearTotal) * 100
            } else {
              data.growth_rate = data.total_revenue > 0 ? 100 : 0
            }
          } catch (error) {
            console.error('전년 데이터 로드 실패:', error)
            data.growth_rate = 0
          }
        }
      }
      
      setSalesStats(data)
    } catch (err) {
      console.error('매출 데이터 로드 실패:', err)
      setError('매출 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }


  // 컴포넌트 마운트 시 데이터 로드 (selectedPeriod 의존성 추가)
  useEffect(() => {
    loadSalesStats()
    loadBusinessRankings()
    loadFishTypeSales()
  }, [periodType, selectedPeriod])



  // 최고 매출 기간 찾기 (월 또는 일)
  const getHighestPeriod = () => {
    if (salesStats?.highest_period) {
      return salesStats.highest_period
    }
    if (!salesStats?.monthly_data.length) return '데이터 없음'
    const highest = salesStats.monthly_data.reduce((prev, current) => 
      prev.revenue > current.revenue ? prev : current
    )
    return highest.month
  }
  
  // 평균 매출 가져오기 (일평균 또는 월평균)
  const getAverageRevenue = () => {
    if (periodType === 'month' && selectedPeriod && salesStats?.monthly_data) {
      // 특정 월 선택 시: 해당 월의 일평균 매출 계산
      const totalRevenue = salesStats.monthly_data.reduce((sum, item) => sum + item.revenue, 0)
      const daysWithData = salesStats.monthly_data.filter(item => item.revenue > 0).length
      const dailyAverage = daysWithData > 0 ? totalRevenue / daysWithData : 0
      return Math.round(dailyAverage / 1000) * 1000 // 1000원 단위로 반올림
    }
    
    if (periodType === 'year' && salesStats?.monthly_data) {
      // 연도별 보기 시: 월평균 매출 계산
      const totalRevenue = salesStats.monthly_data.reduce((sum, item) => sum + item.revenue, 0)
      const monthsWithData = salesStats.monthly_data.filter(item => item.revenue > 0).length
      const monthlyAverage = monthsWithData > 0 ? totalRevenue / monthsWithData : 0
      return Math.round(monthlyAverage / 1000) * 1000 // 1000원 단위로 반올림
    }
    
    // 기본값 (백엔드에서 계산된 값이 있다면)
    const average = salesStats?.daily_average || salesStats?.monthly_average || 0
    return Math.round(average / 1000) * 1000 // 1000원 단위로 반올림
  }
  
  // 평균 매출 라벨 가져오기
  const getAverageLabel = () => {
    if (periodType === 'month' && selectedPeriod) {
      return '일평균 매출'
    }
    if (periodType === 'year') {
      return '월평균 매출'
    }
    return '평균 매출'
  }

  // 현재 보여지는 기간 텍스트 생성
  const getCurrentPeriodText = () => {
    if (selectedPeriod) {
      if (periodType === 'month') {
        const [year, month] = selectedPeriod.split('-')
        return `${year}년 ${parseInt(month)}월`
      } else {
        return `${selectedPeriod}년`
      }
    }
    
    if (periodType === 'month') {
      return '최근 12개월'
    } else {
      return '최근 5년'
    }
  }

  // 월별 옵션 생성 (현재 월부터 과거 24개월)
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const value = `${year}-${month.toString().padStart(2, '0')}`
      const label = `${year}년 ${month}월`
      options.push({ value, label })
    }
    
    return options
  }

  // 년도별 옵션 생성 (현재 년도부터 과거 10년)
  const getYearOptions = () => {
    const options = []
    const currentYear = new Date().getFullYear()
    
    for (let i = 0; i < 10; i++) {
      const year = currentYear - i
      options.push({ value: year.toString(), label: `${year}년` })
    }
    
    return options
  }


  // 차트 색상 팔레트
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-accent-blue flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">매출 통계</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 hidden sm:block">월별 매출 현황 및 상세 분석</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 현재 기간 표시 */}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-600 mr-3">
              현재 조회 기간: <span className="text-gray-900">{getCurrentPeriodText()}</span>
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* 기간 타입 선택 */}
            <div className="flex gap-2">
              <Button 
                variant={periodType === 'month' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => {
                  setPeriodType('month')
                  setSelectedPeriod('')
                }}
                className="w-full sm:w-auto"
              >
                한달 기준
              </Button>
              <Button 
                variant={periodType === 'year' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => {
                  setPeriodType('year')
                  setSelectedPeriod('')
                }}
                className="w-full sm:w-auto"
              >
                1년 기준
              </Button>
            </div>
            
            {/* 세부 기간 선택 드롭다운 */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={periodType === 'month' ? '월 선택' : '년도 선택'} />
              </SelectTrigger>
              <SelectContent>
                {periodType === 'month' ? (
                  getMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                ) : (
                  getYearOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
          </div>
        </div>
      </div>


      {/* 요약 통계 카드들 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="shadow-sm animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadSalesStats} className="mt-4">다시 시도</Button>
        </div>
      ) : salesStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-6 w-6 text-accent-blue" />
                <div>
                  <p className="text-sm text-gray-600">총 매출</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(salesStats.total_revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">{getAverageLabel()}</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(getAverageRevenue())}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedPeriod && periodType === 'month' ? '최고 매출일' : '최고 매출월'}
                  </p>
                  <p className="text-xl font-bold text-blue-600">{getHighestPeriod()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {salesStats.growth_rate >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className="text-sm text-gray-600">
                    {periodType === 'month' && selectedPeriod ? '전월 대비' : '전년 대비'} 성장률
                  </p>
                  <p className={`text-xl font-bold ${
                    salesStats.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {salesStats.growth_rate >= 0 ? '+' : ''}{salesStats.growth_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* 메인 차트 */}
      {salesStats && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              {periodType === 'month' ? '월별' : '연도별'} 매출 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesStats.monthly_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  interval={0}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (periodType === 'month' && selectedPeriod) {
                      // 일별 데이터에서 날짜 추출
                      if (typeof value === 'string' && value.includes('-')) {
                        const day = parseInt(value.split('-')[2] || '1')
                        // 1, 5, 10, 15, 20, 25, 30일만 표시
                        if ([1, 5, 10, 15, 20, 25, 30].includes(day)) {
                          return `${day}일`
                        }
                      }
                      return ''
                    }
                    
                    // 년도별 보기
                    if (periodType === 'year') {
                      if (typeof value === 'string' && value.includes('-')) {
                        const month = parseInt(value.split('-')[1] || '1')
                        return `${month}월`
                      }
                    }
                    
                    return value
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 100000000) {
                      return `${(value / 100000000).toFixed(0)}억원`
                    } else if (value >= 10000000) {
                      return `${(value / 10000000).toFixed(0)}천만원`
                    } else if (value >= 1000000) {
                      return `${(value / 1000000).toFixed(0)}백만원`
                    } else if (value >= 10000) {
                      return `${(value / 10000).toFixed(0)}만원`
                    } else if (value >= 1000) {
                      return `${(value / 1000).toFixed(0)}천원`
                    } else {
                      return `${value.toLocaleString()}원`
                    }
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '매출']}
                  labelFormatter={(label) => {
                    if (typeof label === 'string') {
                      // 일별 데이터 (2024-12-01)
                      if (label.includes('-') && label.split('-').length === 3) {
                        const parts = label.split('-')
                        const year = parts[0]
                        const month = parseInt(parts[1])
                        const day = parseInt(parts[2])
                        return `${year}년 ${month}월 ${day}일`
                      }
                      // 월별 데이터 (2024-12)
                      if (label.includes('-') && label.split('-').length === 2) {
                        const parts = label.split('-')
                        const year = parts[0]
                        const month = parseInt(parts[1])
                        return `${year}년 ${month}월`
                      }
                    }
                    return label
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>

          </CardContent>
        </Card>
      )}

      {/* 거래처별 구매량 순위 & 어종별 판매량 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 거래처별 구매량 순위 */}
        <Card className="shadow-sm flex flex-col" style={{ height: '600px' }}>
          <CardHeader className="flex-shrink-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <span>거래처 구매 순위</span>
              </div>
              <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">금액기준</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              {getCurrentPeriodText()} 기준 상위 구매 거래처
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col p-6 pt-0">
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {loadingRankings ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : businessRankings.length > 0 ? (
              <div className="space-y-3">
                {businessRankings.map((business, index) => (
                  <div 
                    key={business.business_id} 
                    className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 text-lg truncate">
                            {business.business_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            총 {business.order_count}건 주문
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="font-bold text-blue-600 text-lg">
                          {formatCurrency(business.total_purchase)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {business.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {/* 진행률 바 */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${business.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>거래처 데이터가 없습니다.</p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* 오른쪽: 어종별 판매량 원형 그래프 */}
        <Card className="shadow-sm flex flex-col" style={{ height: '600px' }}>
          <CardHeader className="flex-shrink-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-green-600" />
                <span>어종별 판매량</span>
              </div>
              <span className="text-sm font-normal text-green-600 bg-green-50 px-2 py-1 rounded">금액기준</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              {getCurrentPeriodText()} 기준 어종별 판매 비중
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col p-6 pt-0">
            {loadingFishSales ? (
              <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : fishTypeSales.length > 0 ? (
              <>
                {/* 원형 그래프 */}
                <div className="h-56 flex-shrink-0 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fishTypeSales.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="percentage"
                        label={({ fish_name, percentage }) => 
                          percentage > 5 ? fish_name : ''
                        }
                        labelLine={false}
                      >
                        {fishTypeSales.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name, props) => [
                          `${value.toFixed(1)}% (${props.payload.total_quantity}${props.payload.unit}, ${formatCurrency(props.payload.total_revenue)})`,
                          '판매 비중'
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* 어종별 상세 정보 */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <div className="space-y-2">
                    {fishTypeSales.map((fish, index) => (
                      <div key={fish.fish_type_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{fish.fish_name}</div>
                            <div className="text-sm text-gray-600">{fish.total_quantity}{fish.unit} 판매</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="font-semibold text-gray-900">{formatCurrency(fish.total_revenue)}</div>
                          <div className="text-sm text-gray-600">{fish.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>어종별 판매 데이터가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}