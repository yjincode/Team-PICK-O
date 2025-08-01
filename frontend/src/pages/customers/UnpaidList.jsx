"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Phone, Mail, AlertTriangle, CreditCard } from "lucide-react"

const mockUnpaidCustomers = [
  {
    id: 1,
    name: "동해수산",
    contact: "김철수",
    phone: "010-1234-5678",
    email: "donghai@seafood.co.kr",
    unpaidAmount: 2400000,
    status: "연체",
    dueDate: "2024-01-15",
    overdueDays: 15,
  },
  {
    id: 2,
    name: "해양식품",
    contact: "박민수",
    phone: "010-3456-7890",
    email: "ocean@foods.kr",
    unpaidAmount: 1800000,
    status: "연체",
    dueDate: "2024-01-20",
    overdueDays: 10,
  },
  {
    id: 3,
    name: "신선수산",
    contact: "최지훈",
    phone: "010-4567-8901",
    email: "fresh@seafood.net",
    unpaidAmount: 3200000,
    status: "연체",
    dueDate: "2024-01-10",
    overdueDays: 20,
  },
]

export default function UnpaidList() {
  const [searchTerm, setSearchTerm] = useState("")

  const formatCurrency = (amount) => `₩${amount.toLocaleString()}`

  const totalUnpaid = mockUnpaidCustomers.reduce((sum, customer) => sum + customer.unpaidAmount, 0)

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">미수금 내역</h1>
          <p className="text-gray-600 mt-1">
            총 {mockUnpaidCustomers.length}개 거래처 · 연체 {mockUnpaidCustomers.length}건
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">총 미수금액</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">연체 건수</p>
                <p className="text-2xl font-bold text-red-600">{mockUnpaidCustomers.length}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">평균 연체일</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {Math.round(mockUnpaidCustomers.reduce((sum, c) => sum + c.overdueDays, 0) / mockUnpaidCustomers.length)}일
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Phone className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">최대 연체일</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.max(...mockUnpaidCustomers.map(c => c.overdueDays))}일
                </p>
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

      {/* Unpaid Customers List */}
      <div className="space-y-4">
        {mockUnpaidCustomers.map((customer) => (
          <Card key={customer.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{customer.name}</h3>
                    <Badge variant="destructive" className="text-sm">
                      {customer.status}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {customer.overdueDays}일 연체
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
                      <p>만기일: {customer.dueDate}</p>
                      <p className="font-semibold text-red-600">
                        미수금: {formatCurrency(customer.unpaidAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-1" />
                    연락
                  </Button>
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    정산
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