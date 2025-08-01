import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Package, AlertTriangle, Plus } from "lucide-react"

interface FishStock {
  id: number;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
  status: string;
  lastUpdated: string;
}

const mockFishStocks: FishStock[] = [
  {
    id: 1,
    name: "고등어",
    type: "생선",
    quantity: 150,
    unit: "박스",
    price: 48000,
    status: "충분",
    lastUpdated: "2024-01-30",
  },
  {
    id: 2,
    name: "갈치",
    type: "생선",
    quantity: 80,
    unit: "박스",
    price: 65000,
    status: "보통",
    lastUpdated: "2024-01-30",
  },
  {
    id: 3,
    name: "오징어",
    type: "어류",
    quantity: 25,
    unit: "박스",
    price: 85000,
    status: "부족",
    lastUpdated: "2024-01-29",
  },
  {
    id: 4,
    name: "명태",
    type: "생선",
    quantity: 200,
    unit: "박스",
    price: 35000,
    status: "충분",
    lastUpdated: "2024-01-30",
  },
]

const FishStockList: React.FC = () => {
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  const getStatusBadge = (status: string) => {
    const variants = {
      "충분": "default",
      "보통": "secondary",
      "부족": "destructive",
    } as const
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">어종 재고</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">재고 현황 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />재고 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mockFishStocks.map((stock) => (
          <Card key={stock.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg sm:text-xl">{stock.name}</CardTitle>
                </div>
                {getStatusBadge(stock.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">수량:</span>
                  <div className="font-semibold">{stock.quantity} {stock.unit}</div>
                </div>
                <div>
                  <span className="text-gray-500">단가:</span>
                  <div className="font-semibold">{formatCurrency(stock.price)}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>종류: {stock.type}</p>
                <p>최근 업데이트: {stock.lastUpdated}</p>
              </div>
              {stock.status === "부족" && (
                <div className="flex items-center space-x-2 text-orange-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>발주 필요</span>
                </div>
              )}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  상세보기
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  수정
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default FishStockList; 