"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, Calendar, Package } from "lucide-react"

const mockOrders = [
  {
    orderId: "ORD-2024-001",
    customerName: "동해수산",
    itemsCount: 3,
    totalAmount: 2400000,
    status: "배송중",
    orderDate: "2024-01-30",
  },
  {
    orderId: "ORD-2024-002",
    customerName: "바다마트",
    itemsCount: 1,
    totalAmount: 1800000,
    status: "완료",
    orderDate: "2024-01-29",
  },
  {
    orderId: "ORD-2024-003",
    customerName: "해양식품",
    itemsCount: 2,
    totalAmount: 3200000,
    status: "배송중",
    orderDate: "2024-01-30",
  },
  {
    orderId: "ORD-2024-004",
    customerName: "신선수산",
    itemsCount: 4,
    totalAmount: 1500000,
    status: "완료",
    orderDate: "2024-01-28",
  },
]

export default function OrderList() {
  const [searchTerm, setSearchTerm] = useState("")

  const formatCurrency = (amount) => `₩${amount.toLocaleString()}`

  const getStatusColor = (status) => {
    switch (status) {
      case "완료":
        return "default"
      case "배송중":
        return "secondary"
      case "취소":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">주문 내역</h1>
          <p className="text-gray-600 mt-1">주문 현황 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90">
          <Plus className="h-4 w-4 mr-2" />새 주문 등록
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="주문번호, 거래처명으로 검색..."
                className="pl-10 bg-white border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              기간 선택
            </Button>
            <Button variant="outline">검색</Button>
          </div>
        </CardHeader>
      </Card>

      {/* Order List */}
      <div className="space-y-4">
        {mockOrders.map((order) => (
          <Card key={order.orderId} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{order.orderId}</h3>
                    <Badge variant={getStatusColor(order.status)} className="text-sm">
                      {order.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium text-gray-800">거래처</p>
                      <p>{order.customerName}</p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-800">주문 정보</p>
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4" />
                        <span>{order.itemsCount}개 품목</span>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-gray-800">주문일</p>
                      <p>{order.orderDate}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(order.totalAmount)}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      상세보기
                    </Button>
                    {order.status === "배송중" && (
                      <Button size="sm" className="bg-accent-blue hover:bg-accent-blue/90">
                        배송완료
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 