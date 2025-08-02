import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react"
import { WeatherWidget } from "../../components/common/WeatherWidget"
import { StatsCard } from "../../components/common/StatsCard"
import { OrderStatusBadge } from "../../components/common/OrderStatusBadge"

interface RecentOrder {
  customer: string;
  item: string;
  amount: string;
  status: string;
}

const recentOrders: RecentOrder[] = [
  { customer: "동해수산", item: "고등어", amount: "50박스", status: "처리중" },
  { customer: "바다마트", item: "갈치", amount: "30박스", status: "완료" },
  { customer: "해양식품", item: "오징어", amount: "25박스", status: "대기" },
  { customer: "신선수산", item: "명태", amount: "40박스", status: "완료" },
]

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Search */}
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

      {/* Stats Cards */}
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

      {/* Charts Section */}
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

      {/* Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">최근 주문 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {recentOrders.map((order, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{order.customer}</div>
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