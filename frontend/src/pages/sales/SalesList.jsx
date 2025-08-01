"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, Calendar } from "lucide-react"

const mockSales = [
  {
    saleId: "SALE-2024-001",
    customerName: "동해수산",
    totalPrice: 2400000,
    date: "2024-01-30",
    method: "계좌이체",
  },
  {
    saleId: "SALE-2024-002",
    customerName: "바다마트",
    totalPrice: 1800000,
    date: "2024-01-29",
    method: "카드",
  },
  {
    saleId: "SALE-2024-003",
    customerName: "해양식품",
    totalPrice: 3200000,
    date: "2024-01-30",
    method: "외상",
  },
  {
    saleId: "SALE-2024-004",
    customerName: "신선수산",
    totalPrice: 1500000,
    date: "2024-01-28",
    method: "현금",
  },
  {
    saleId: "SALE-2024-005",
    customerName: "대양마켓",
    totalPrice: 2800000,
    date: "2024-01-27",
    method: "계좌이체",
  },
]

export default function SalesList() {
  const [searchTerm, setSearchTerm] = useState("")

  const formatCurrency = (amount) => `₩${amount.toLocaleString()}`

  const getMethodColor = (method) => {
    switch (method) {
      case "현금":
        return "default"
      case "카드":
        return "secondary"
      case "계좌이체":
        return "outline"
      case "외상":
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
          <h1 className="text-3xl font-bold text-gray-900">판매 내역</h1>
          <p className="text-gray-600 mt-1">판매 현황 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90">
          <Plus className="h-4 w-4 mr-2" />새 판매 등록
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="판매번호, 거래처명으로 검색..."
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

      {/* Sales List */}
      <div className="space-y-4">
        {mockSales.map((sale) => (
          <Card key={sale.saleId} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{sale.saleId}</h3>
                    <Badge variant={getMethodColor(sale.method)} className="text-sm">
                      {sale.method}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium text-gray-800">거래처</p>
                      <p>{sale.customerName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">판매일</p>
                      <p>{sale.date}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(sale.totalPrice)}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      상세보기
                    </Button>
                    <Button variant="outline" size="sm">
                      영수증
                    </Button>
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