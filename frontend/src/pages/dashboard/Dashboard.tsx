/**
 * 대시보드 페이지
 * 주요 통계, 차트, 최근 주문 현황을 표시하는 메인 페이지입니다
 */
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react"
import { WeatherWidget } from "../../components/common/WeatherWidget"
import { StatsCard } from "../../components/common/StatsCard"
import { OrderStatusBadge } from "../../components/common/OrderStatusBadge"

// 최근 주문 데이터 타입 정의
interface RecentOrder {
  business: string;  // 거래처명으로 변경
  item: string;      // 어종명
  amount: string;    // 수량
  status: string;    // 주문 상태
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const recentOrders: RecentOrder[] = [
  { business: "동해수산", item: "고등어", amount: "50박스", status: "처리중" },
  { business: "바다마트", item: "갈치", amount: "30박스", status: "완료" },
  { business: "해양식품", item: "오징어", amount: "25박스", status: "대기" },
  { business: "신선수산", item: "명태", amount: "40박스", status: "완료" },
]

const Dashboard: React.FC = () => {
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

      {/* 통계 카드 섹션 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatsCard
          title="오늘 주문 건수"
          value="24건"
          subtitle="전일 대비 +12%"
          icon={ShoppingCart}
          subtitleColor="text-green-600"
        />
        <StatsCard
          title="재고 부족 알림"
          value="7종"
          subtitle="긴급 발주 필요"
          icon={AlertTriangle}
          iconColor="text-orange-500"
          valueColor="text-orange-600"
        />
        <StatsCard
          title="미수금 현황"
          value="₩2,340만"
          subtitle="15개 거래처"
          icon={DollarSign}
          iconColor="text-red-500"
          valueColor="text-red-600"
        />
      </div>

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
            <div className="space-y-3 sm:space-y-4">
              {recentOrders.map((order, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{order.business}</div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {order.item} · {order.amount}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 어종별 재고 현황 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">어종별 재고 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm sm:text-base">Inventory chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard; 