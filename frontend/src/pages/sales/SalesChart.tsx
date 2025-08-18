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

interface DailyRevenue {
  date: string;
  total_revenue: number;
  order_count: number;
  orders: Array<{
    id: number;
    business_name: string;
    total_price: number;
    order_datetime: string;
  }>;
  hourly_data: Array<{
    hour: number;
    revenue: number;
    order_count: number;
  }>;
  top_fish_types: Array<{
    fish_name: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
}

type PeriodType = 'month' | 'year';



export default function SalesChart() {
  // 상태 관리
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`

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
      setSalesStats(data)
    } catch (err) {
      console.error('매출 데이터 로드 실패:', err)
      setError('매출 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 일별 매출 데이터 로드
  const loadDailyRevenue = async (date: Date) => {
    try {
      const dateString = date.toISOString().split('T')[0]
      const data = await salesApi.getDailyRevenue(dateString)
      setDailyRevenue(data)
    } catch (err) {
      console.error('일별 매출 데이터 로드 실패:', err)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadSalesStats()
  }, [periodType])

  // 날짜 선택 시 일별 매출 조회
  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      loadDailyRevenue(date)
    }
  }, [selectedDate])

  // 기간 변경 시 데이터 다시 로드
  useEffect(() => {
    if (selectedPeriod) {
      loadSalesStats()
    } else {
      loadSalesStats()
    }
  }, [selectedPeriod])

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
    if (salesStats?.daily_average !== undefined) {
      return salesStats.daily_average
    }
    return salesStats?.monthly_average || 0
  }
  
  // 평균 매출 라벨 가져오기
  const getAverageLabel = () => {
    if (selectedPeriod && periodType === 'month') {
      return '일평균 매출'
    }
    return '월평균 매출'
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

  // 일별 조회를 위한 날짜 옵션 생성 (최근 30일)
  const getDailyOptions = () => {
    const options = []
    const now = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      const value = date.toISOString().split('T')[0]
      const label = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      })
      options.push({ value, label })
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
            
            {/* 일별 매출 조회 드롭다운 */}
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="일별 매출 조회" />
              </SelectTrigger>
              <SelectContent>
                {getDailyOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 일별 매출 상세 분석 */}
      {selectedDate && dailyRevenue && (
        <div className="space-y-6">
          {/* 일별 매출 요약 */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">
                {new Date(selectedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })} 매출 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {formatCurrency(dailyRevenue.total_revenue)}
                  </div>
                  <div className="text-sm text-gray-600">총 매출</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {dailyRevenue.order_count}건
                  </div>
                  <div className="text-sm text-gray-600">총 주문 수</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {dailyRevenue.order_count > 0 ? formatCurrency(dailyRevenue.total_revenue / dailyRevenue.order_count) : '₩0'}
                  </div>
                  <div className="text-sm text-gray-600">평균 주문 금액</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 시간대별 매출 분석 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">시간대별 매출</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyRevenue.hourly_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(hour) => `${hour}시`}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), '매출']}
                      labelFormatter={(hour) => `${hour}시`}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">시간대별 주문 수</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyRevenue.hourly_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(hour) => `${hour}시`}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value, '주문 수']}
                      labelFormatter={(hour) => `${hour}시`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="order_count" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 어종별 매출 분석 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">어종별 매출 비중</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyRevenue.top_fish_types.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dailyRevenue.top_fish_types}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                        label={({ fish_name, percentage }) => `${fish_name} ${percentage}%`}
                      >
                        {dailyRevenue.top_fish_types.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name, props) => [
                          `${value}% (${formatCurrency(props.payload.revenue)})`,
                          '비중'
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-lg mb-2">어종별 데이터 없음</div>
                    <div className="text-sm">주문 내역에 어종 정보가 없습니다.</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">상위 어종 상세</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyRevenue.top_fish_types.length > 0 ? (
                  <div className="space-y-3">
                    {dailyRevenue.top_fish_types.map((fish, index) => (
                      <div key={fish.fish_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <div>
                            <div className="font-medium text-gray-900">{fish.fish_name}</div>
                            <div className="text-sm text-gray-600">{fish.quantity}개 판매</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(fish.revenue)}</div>
                          <div className="text-sm text-gray-600">{fish.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-lg mb-2">어종별 데이터 없음</div>
                    <div className="text-sm">주문 내역에 어종 정보가 없습니다.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 주문 내역 */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">주문 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRevenue.orders.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dailyRevenue.orders.map((order) => (
                    <div key={order.id} className="p-3 bg-gray-50 rounded-lg text-sm border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{order.business_name}</div>
                          <div className="text-gray-600 text-xs">
                            주문 #{order.id} • {new Date(order.order_datetime).toLocaleTimeString('ko-KR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(order.total_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>해당 날짜에 주문이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  <p className="text-sm text-gray-600">성장률</p>
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
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '매출']}
                  labelFormatter={(label) => `${label}`}
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

            {/* 월별 매출 데이터 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
              {salesStats.monthly_data.map((monthData, index) => {
                const prevRevenue = index > 0 ? salesStats.monthly_data[index - 1].revenue : monthData.revenue
                const change = prevRevenue > 0 ? ((monthData.revenue - prevRevenue) / prevRevenue) * 100 : 0
                const isPositive = change >= 0
                
                return (
                  <div key={monthData.month} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">{monthData.month}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(monthData.revenue)}</p>
                    <p className="text-xs text-gray-500">{monthData.order_count}건</p>
                    {index > 0 && (
                      <div className="flex items-center justify-center space-x-1 mt-1">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
                          {isPositive ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}