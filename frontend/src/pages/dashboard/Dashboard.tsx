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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 날씨 위젯 */}
          <div className="h-full flex items-stretch justify-center">
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

      {/* 하단 섹션: 최근 주문 및 재고 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                 {/* 최근 주문 현황 */}
         <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">최근 주문 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && !error && recentOrders.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                                                 {recentOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                    <div className="font-semibold text-sm text-gray-900">{order.business_name}</div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">품목:</span> {order.items_summary}
                      </div>
                      <div className="text-sm text-blue-700 font-semibold">
                        <span>금액:</span> ₩{order.total_price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.order_datetime).toLocaleDateString('ko-KR')} {new Date(order.order_datetime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <OrderStatusBadge status={order.order_status} />
                    </div>
                  </div>
                ))}
                 
                                   {/* 더보기 버튼 */}
                  {recentOrders.length > 4 && (
                    <div className="mt-3 text-center">
                      <button 
                        onClick={() => navigate('/orders')}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 font-medium transition-colors"
                      >
                        전체 주문보기 ({recentOrders.length}건)
                      </button>
                    </div>
                  )}
              </div>
            ) : !loading && !error ? (
              <div className="text-center py-8 text-gray-500">
                최근 주문이 없습니다.
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                주문 데이터를 불러오는 중...
              </div>
            )}
          </CardContent>
        </Card>

        {/* 재고 부족 알림 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">재고현황</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && !error && lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.slice(0, 4).map((item, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    item.status === 'out_of_stock' 
                      ? 'bg-red-50 border-red-500' 
                      : 'bg-orange-50 border-orange-400'
                  }`}>
                                         <div className="flex items-center justify-between mb-2">
                       <div className="font-semibold text-sm text-gray-900">{item.fish_name}</div>
                       <div className="flex items-center space-x-2">
                         <div className="text-xs text-gray-600">
                           <span className="font-medium">현재고:</span> {item.stock_quantity || 0}{item.unit}
                         </div>
                         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                           item.status === 'out_of_stock'
                             ? 'bg-red-100 text-red-800'
                             : 'bg-orange-100 text-orange-800'
                         }`}>
                           {item.status === 'out_of_stock' ? '품절' : '부족'}
                         </span>
                       </div>
                     </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {item.registered_stock !== undefined ? (
                        <>
                          <div className="text-gray-600">
                            <span className="font-medium">등록재고:</span> {item.registered_stock}{item.unit}
                          </div>
                          <div className="text-blue-600">
                            <span className="font-medium">주문량:</span> {item.ordered_quantity || 0}{item.unit}
                          </div>
                          <div className={`font-medium ${(item.available_stock || 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            <span>가용재고:</span> {item.available_stock || 0}{item.unit}
                          </div>
                          {(item.shortage || 0) > 0 && (
                            <div className="text-red-600 font-medium">
                              <span>부족:</span> {item.shortage}{item.unit}
                            </div>
                          )}
                        </>
                                             ) : null}
                    </div>
                  </div>
                ))}
                
                                 {/* 더보기 버튼 */}
                 {lowStockItems.length > 4 && (
                   <div className="mt-3 text-center">
                     <button 
                       onClick={() => navigate('/inventory')}
                       className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 font-medium transition-colors"
                     >
                       전체 재고보기 ({lowStockItems.length}종)
                     </button>
                   </div>
                 )}
              </div>
            ) : !loading && !error ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="mx-auto h-8 w-8 text-green-400 mb-2" />
                <p className="text-sm">재고가 충분합니다</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                재고 데이터를 불러오는 중...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard 