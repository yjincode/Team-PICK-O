"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, AlertTriangle, Package, Fish } from "lucide-react"

const mockFishStock = [
  {
    id: 1,
    fishName: "고등어",
    quantity: 150,
    unit: "박스",
    status: "신선",
    expirationDate: "2024-02-05",
  },
  {
    id: 2,
    fishName: "갈치",
    quantity: 0,
    unit: "박스",
    status: "소진",
    expirationDate: "2024-02-03",
  },
  {
    id: 3,
    fishName: "오징어",
    quantity: 80,
    unit: "박스",
    status: "신선",
    expirationDate: "2024-02-07",
  },
  {
    id: 4,
    fishName: "명태",
    quantity: 25,
    unit: "박스",
    status: "폐기예정",
    expirationDate: "2024-02-01",
  },
  {
    id: 5,
    fishName: "참치",
    quantity: 60,
    unit: "박스",
    status: "신선",
    expirationDate: "2024-02-10",
  },
  {
    id: 6,
    fishName: "연어",
    quantity: 5,
    unit: "박스",
    status: "폐기예정",
    expirationDate: "2024-02-02",
  },
]

export default function FishStockList() {
  const [searchTerm, setSearchTerm] = useState("")

  const getStatusColor = (status) => {
    switch (status) {
      case "신선":
        return "default"
      case "소진":
        return "destructive"
      case "폐기예정":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusBgColor = (status) => {
    switch (status) {
      case "신선":
        return "bg-green-50 border-green-200"
      case "소진":
        return "bg-red-50 border-red-200"
      case "폐기예정":
        return "bg-yellow-50 border-yellow-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getQuantityColor = (quantity, status) => {
    if (status === "소진") return "text-red-600"
    if (quantity < 10) return "text-orange-600"
    return "text-green-600"
  }

  const totalItems = mockFishStock.length
  const lowStockItems = mockFishStock.filter(item => item.quantity < 10 && item.status !== "소진").length
  const expiredItems = mockFishStock.filter(item => item.status === "폐기예정").length

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">재고 현황</h1>
          <p className="text-gray-600 mt-1">어종별 재고 현황 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90">
          <Plus className="h-4 w-4 mr-2" />재고 입고
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">총 어종</p>
                <p className="text-2xl font-bold text-blue-600">{totalItems}종</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">부족 재고</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems}종</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Fish className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">폐기 예정</p>
                <p className="text-2xl font-bold text-yellow-600">{expiredItems}종</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="어종명으로 검색..."
                className="pl-10 bg-white border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">검색</Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stock List */}
      <div className="space-y-4">
        {mockFishStock.map((item) => (
          <Card key={item.id} className={`shadow-sm hover:shadow-md transition-shadow ${getStatusBgColor(item.status)}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{item.fishName}</h3>
                    <Badge variant={getStatusColor(item.status)} className="text-sm">
                      {item.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium text-gray-800">재고량</p>
                      <p className={`text-lg font-semibold ${getQuantityColor(item.quantity, item.status)}`}>
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">유통기한</p>
                      <p className="text-lg">{item.expirationDate}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">상태</p>
                      <p className="text-lg">
                        {item.status === "신선" && "✅ 양호"}
                        {item.status === "소진" && "❌ 소진"}
                        {item.status === "폐기예정" && "⚠️ 주의"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    상세보기
                  </Button>
                  <Button variant="outline" size="sm">
                    입고
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