"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, Phone, Mail, Eye, Edit } from "lucide-react"

interface Customer {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  unpaid: number;
  status: string;
  lastOrder: string;
}

const mockCustomers: Customer[] = [
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

const CustomerList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("")

  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">거래처 리스트</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">거래처 정보 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />새 거래처 등록
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="거래처명, 담당자명으로 검색..."
                className="pl-10 bg-white border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="flex-shrink-0">검색</Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="space-y-4">
        {mockCustomers.map((customer) => (
          <Card key={customer.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{customer.name}</h3>
                    <Badge variant={customer.status === "정상" ? "default" : "destructive"} className="text-xs sm:text-sm w-fit">
                      {customer.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">담당자:</span>
                      <span className="font-medium">{customer.contact}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{customer.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{customer.email}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">미수금: <span className="font-semibold text-red-600">{formatCurrency(customer.unpaid)}</span></span>
                      <span className="text-gray-600">최근 주문: <span className="font-medium">{customer.lastOrder}</span></span>
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

export default CustomerList; 