/**
 * 대시보드 페이지
 * 주요 통계, 차트, 최근 주문 현황을 표시하는 메인 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { ShoppingCart, AlertTriangle, DollarSign } from "lucide-react"
import { WeatherWidget } from "../../components/common/WeatherWidget"
import { StatsCard } from "../../components/common/StatsCard"
import { OrderStatusBadge } from "../../components/common/OrderStatusBadge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { dashboardApi, salesApi, orderApi } from "../../lib/api"
import AuctionPriceChart from "../../components/charts/AuctionPriceChart"
import { useNavigate } from "react-router-dom"

// 대시보드 데이터 타입 정의
interface DashboardStats {
  todayOrders: number;
  lowStockCount: number;
  totalOutstandingBalance: number;
}

interface RecentOrder {
  id: number;
  business_name: string;
  items_summary: string;
  total_price: number;
  order_status: 'placed' | 'ready' | 'delivered' | 'cancelled';
  order_datetime: string;
}

interface LowStockItem {
  fish_name: string;
  registered_stock?: number;  // 등록된 재고
  ordered_quantity?: number;  // 주문된 수량
  available_stock?: number;   // 가용 재고
  shortage?: number;         // 부족 수량
  total_stock?: number;      // 기존 API 호환성
  stock_quantity?: number;   // 현재 재고량 
  unit: string;
  status: string;
}

interface WeeklySalesData {
  date: string;
  revenue: number;
  order_count: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [weeklySalesData, setWeeklySalesData] = useState<WeeklySalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [salesLoading, setSalesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 원화 포맷팅 함수
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) {
      return `₩${Math.round(amount / 10000000 * 10) / 10}억`
    } else if (amount >= 10000) {
      return `₩${Math.round(amount / 10000)}만`
    } else {
      return `₩${amount.toLocaleString()}`
    }
  }

  // 최근 7일간 주문 데이터 로딩 (미결제 포함)
  const loadWeeklySalesData = async () => {
    try {
      setSalesLoading(true)
      
      // 오늘부터 7일 전까지의 날짜 범위 계산
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 6) // 7일간 (오늘 포함)
      
      // 7일간의 날짜별 데이터를 직접 orderApi로 조회
      const weeklyData: WeeklySalesData[] = []
      
      for (let i = 6; i >= 0; i--) {
        const currentDate = new Date()
        currentDate.setDate(endDate.getDate() - i)
        const dateStr = currentDate.toISOString().split('T')[0]
        
        try {
          // 해당 날짜의 모든 주문 조회 (결제상태 관계없이)
          const ordersResponse = await orderApi.getAll({
            date: dateStr,
            payment_status: 'all', // 미결제 포함 모든 주문
            page_size: 1000 // 해당 날짜의 모든 주문
          })
          
          // 해당 날짜 주문들의 총 금액과 건수 계산
          let dayRevenue = 0
          let dayOrderCount = 0
          
          
          if (ordersResponse.data) {
            ordersResponse.data.forEach(order => {
              // 주문일자가 해당 날짜와 일치하는지 확인
              const orderDate = new Date(order.order_datetime).toISOString().split('T')[0]
              if (orderDate === dateStr) {
                dayRevenue += order.total_price || 0
                dayOrderCount += 1
              }
            })
          }
          
          
          weeklyData.push({
            date: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
            revenue: dayRevenue,
            order_count: dayOrderCount
          })
          
        } catch (dayErr) {
          // 에러 시 0값으로 추가
          weeklyData.push({
            date: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
            revenue: 0,
            order_count: 0
          })
        }
      }
      
      setWeeklySalesData(weeklyData)
      
    } catch (err) {
    } finally {
      setSalesLoading(false)
    }
  }

    // 데이터 로딩 함수
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 병렬로 모든 데이터 로딩
      const [statsData, ordersData, stockData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecentOrders(10), // 더보기 버튼을 위해 더 많은 데이터 가져오기
        dashboardApi.getLowStockItems()
      ])

      setStats(statsData)
      setRecentOrders(ordersData as any) // 타입 캐스팅으로 order_status 타입 불일치 해결
      setLowStockItems(stockData)

    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 페이지 포커스 시 데이터 갱신
  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData()
      loadWeeklySalesData()
    }

    // 페이지가 포커스될 때 데이터 갱신
    window.addEventListener('focus', handleFocus)
    
    // 초기 로딩
    loadDashboardData()
    loadWeeklySalesData()

    // 클린업
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 로딩 및 에러 상태 */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">대시보드 데이터를 불러오는 중...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 날씨 위젯 및 통계 카드 섹션 */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 날씨 위젯 */}
          <div className="col-span-2 lg:col-span-1">
            <WeatherWidget className="w-full h-full" />
          </div>
          
          <StatsCard
            title="오늘 주문 건수"
            value={`${stats.todayOrders}건`}
            subtitle="주문 관리에서 확인"
            icon={ShoppingCart}
            subtitleColor="text-blue-600"
            onClick={() => navigate('/orders')}
          />
          
          <StatsCard
            title="재고현황"
            value={`${stats.lowStockCount}종`}
            subtitle={stats.lowStockCount > 0 ? "부족" : "안정"}
            icon={AlertTriangle}
            iconColor={stats.lowStockCount > 0 ? "text-orange-500" : "text-green-500"}
            valueColor={stats.lowStockCount > 0 ? "text-orange-600" : "text-green-600"}
            onClick={() => navigate('/inventory')}
          />
          
          <StatsCard
            title="미수금 현황"
            value={formatCurrency(stats.totalOutstandingBalance)}
            subtitle="거래처별 미수금 관리"
            icon={DollarSign}
            iconColor="text-red-500"
            valueColor="text-red-600"
            onClick={() => navigate('/business')}
          />
        </div>
      )}

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <AuctionPriceChart />
      </div>

    </div>
  )
}

export default Dashboard 