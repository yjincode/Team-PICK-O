"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, Phone, Mail, Eye, Edit } from "lucide-react"

const mockCustomers = [
  {
    id: 1,
    name: "동해수산",
    contact: "김철수",
    phone: "010-1234-5678",
    email: "donghai@seafood.co.kr",
    unpaid: 2400000,
    status: "정상",
    lastOrder: "2024-01-30",
  },
  {
    id: 2,
    name: "바다마트",
    contact: "이영희",
    phone: "010-2345-6789",
    email: "badamart@ocean.com",
    unpaid: 0,
    status: "정상",
    lastOrder: "2024-01-29",
  },
  {
    id: 3,
    name: "해양식품",
    contact: "박민수",
    phone: "010-3456-7890",
    email: "ocean@foods.kr",
    unpaid: 1800000,
    status: "연체",
    lastOrder: "2024-01-25",
  },
  {
    id: 4,
    name: "신선수산",
    contact: "최지훈",
    phone: "010-4567-8901",
    email: "fresh@seafood.net",
    unpaid: 3200000,
    status: "연체",
    lastOrder: "2024-01-20",
  },
]

export default function CustomerList() {
  const [searchTerm, setSearchTerm] = useState("")

  const formatCurrency = (amount) => `₩${amount.toLocaleString()}`

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">거래처 리스트</h1>
          <p className="text-gray-600 mt-1">거래처 정보 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90">
          <Plus className="h-4 w-4 mr-2" />새 거래처 등록
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="거래처명, 담당자명으로 검색..."
                className="pl-10 bg-white border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">검색</Button>
          </div>
        </CardHeader>
      </Card>

      {/* Customer List */}
      <div className="space-y-4">
        {mockCustomers.map((customer) => (
          <Card key={customer.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{customer.name}</h3>
                    <Badge variant={customer.status === "정상" ? "default" : "destructive"} className="text-sm">
                      {customer.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="space-y-2">
                      <p className="font-medium text-gray-800">담당자: {customer.contact}</p>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{customer.email}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p>최근 주문: {customer.lastOrder}</p>
                      <p className={`font-semibold ${customer.unpaid > 0 ? "text-red-600" : "text-green-600"}`}>
                        미수금: {formatCurrency(customer.unpaid)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    상세보기
                  </Button>
                  <Button variant="outline" size="sm">
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