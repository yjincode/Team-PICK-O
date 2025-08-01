import React from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, Phone, Mail } from "lucide-react"
import { formatCurrency } from "../../lib/utils"

const customers = [
  {
    id: 1,
    name: "동해수산",
    contact: "김철수",
    phone: "010-1234-5678",
    email: "donghai@example.com",
    unpaid: 2400000,
    status: "정상",
    lastOrder: "2024-01-30",
  },
  {
    id: 2,
    name: "바다마트",
    contact: "이영희",
    phone: "010-2345-6789",
    email: "badamart@example.com",
    unpaid: 0,
    status: "정상",
    lastOrder: "2024-01-29",
  },
  {
    id: 3,
    name: "해양식품",
    contact: "박민수",
    phone: "010-3456-7890",
    email: "ocean@example.com",
    unpaid: 1800000,
    status: "연체",
    lastOrder: "2024-01-25",
  },
]

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">거래처 관리</h1>
        <Button className="bg-accent-blue hover:bg-accent-blue/90">
          <Plus className="h-4 w-4 mr-2" />새 거래처 등록
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="거래처명, 담당자명으로 검색..." className="pl-10 bg-white border-gray-200" />
            </div>
            <Button variant="outline">검색</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                      <Badge variant={customer.status === "정상" ? "default" : "destructive"} className="text-xs">
                        {customer.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">담당자: {customer.contact}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                      </div>
                      <div>
                        <p>최근 주문: {customer.lastOrder}</p>
                        <p className={`font-medium mt-1 ${customer.unpaid > 0 ? "text-red-600" : "text-green-600"}`}>
                          미수금: {formatCurrency(customer.unpaid)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      상세보기
                    </Button>
                    <Button variant="outline" size="sm">
                      수정
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 