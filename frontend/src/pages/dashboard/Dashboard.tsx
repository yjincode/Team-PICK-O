/**
 * 대시보드 페이지
 * 주요 통계, 차트, 최근 주문 현황을 표시하는 메인 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react"
import { WeatherWidget } from "../../components/common/WeatherWidget"
import { StatsCard } from "../../components/common/StatsCard"
import { OrderStatusBadge } from "../../components/common/OrderStatusBadge"
import { dashboardApi } from "../../lib/api"

// 대시보드 데이터 타입 정의
interface DashboardStats {
  todayOrders: number;
  lowStockCount: number;
  totalOutstandingBalance: number;
  businessCount: number;
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
  total_stock: number;
  unit: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
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

  // 데이터 로딩
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 병렬로 모든 데이터 로딩
        const [statsData, ordersData, stockData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentOrders(5),
          dashboardApi.getLowStockItems()
        ])

        setStats(statsData)
        setRecentOrders(ordersData)
        setLowStockItems(stockData)

      } catch (err) {
        console.error('대시보드 데이터 로딩 실패:', err)
        setError('데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더: 검색 및 날씨 위젯 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="거래처명, 어종명으로 검색..."
              className="pl-10 bg-white border-gray-200 text-base h-12"
            />
          </div>
          <Button className="bg-accent-blue hover:bg-accent-blue/90 h-12 px-6 touch-target flex-shrink-0">검색</Button>
        </div>
        <div className="w-full sm:w-auto">
          <WeatherWidget />
        </div>
      </div>

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

      {/* 통계 카드 섹션 */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatsCard
            title="오늘 주문 건수"
            value={`${stats.todayOrders}건`}
            subtitle="주문 관리에서 확인"
            icon={ShoppingCart}
            subtitleColor="text-blue-600"
          />
          <StatsCard
            title="재고 부족 알림"
            value={`${stats.lowStockCount}종`}
            subtitle={stats.lowStockCount > 0 ? "긴급 발주 필요" : "재고 안정"}
            icon={AlertTriangle}
            iconColor={stats.lowStockCount > 0 ? "text-orange-500" : "text-green-500"}
            valueColor={stats.lowStockCount > 0 ? "text-orange-600" : "text-green-600"}
          />
          <StatsCard
            title="미수금 현황"
            value={formatCurrency(stats.totalOutstandingBalance)}
            subtitle={`${stats.businessCount}개 거래처`}
            icon={DollarSign}
            iconColor="text-red-500"
            valueColor="text-red-600"
          />
        </div>
      )}

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">경매가 동향</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm sm:text-base">Chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">매출 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm sm:text-base">Chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 하단 섹션: 최근 주문 및 재고 현황 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* 최근 주문 현황 */}
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">최근 주문 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && !error && recentOrders.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm sm:text-base">{order.business_name}</div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {order.items_summary} · {formatCurrency(order.total_price)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(order.order_datetime).toLocaleDateString('ko-KR')} {new Date(order.order_datetime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <OrderStatusBadge status={order.order_status} />
                    </div>
                  </div>
                ))}
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
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">재고 부족 알림</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && !error && lowStockItems.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-orange-50 border-l-4 border-orange-400 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-orange-900 text-sm">{item.fish_name}</div>
                      <div className="text-xs text-orange-700">
                        재고: {item.total_stock}{item.unit}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.total_stock === 0 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {item.total_stock === 0 ? '품절' : '부족'}
                      </span>
                    </div>
                  </div>
                ))}
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

export default Dashboard; 