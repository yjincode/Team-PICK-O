import React from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Plus, Eye, Edit } from "lucide-react"

interface Order {
  id: number;
  customerName: string;
  items: string[];
  totalAmount: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
}

const mockOrders: Order[] = [
  {
    id: 1,
    customerName: "동해수산",
    items: ["고등어 50박스", "갈치 30박스"],
    totalAmount: 2400000,
    status: "처리중",
    orderDate: "2024-01-30",
    deliveryDate: "2024-02-05",
  },
  {
    id: 2,
    customerName: "바다마트",
    items: ["오징어 25박스"],
    totalAmount: 1200000,
    status: "완료",
    orderDate: "2024-01-29",
    deliveryDate: "2024-02-03",
  },
  {
    id: 3,
    customerName: "해양식품",
    items: ["명태 40박스", "고등어 20박스"],
    totalAmount: 1800000,
    status: "대기",
    orderDate: "2024-01-28",
    deliveryDate: "2024-02-10",
  },
]

const OrderList: React.FC = () => {
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  const getStatusBadge = (status: string) => {
    const variants = {
      "완료": "default",
      "처리중": "secondary",
      "대기": "outline",
    } as const
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">주문 내역</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">주문 관리 및 현황</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />새 주문
        </Button>
      </div>

      <div className="space-y-4">
        {mockOrders.map((order) => (
          <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{order.customerName}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">주문 품목:</span>
                      <div className="mt-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-gray-700">{item}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">주문 금액:</span>
                      <div className="font-semibold text-lg">{formatCurrency(order.totalAmount)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">주문일:</span>
                      <div>{order.orderDate}</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Eye className="h-4 w-4 mr-1" />
                    상세보기
                  </Button>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Edit className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default OrderList; 