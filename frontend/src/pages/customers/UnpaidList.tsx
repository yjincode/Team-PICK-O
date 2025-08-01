import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { AlertTriangle, DollarSign, Calendar } from "lucide-react"

interface UnpaidCustomer {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  contact: string;
  phone: string;
}

const mockUnpaidCustomers: UnpaidCustomer[] = [
  {
    id: 1,
    name: "동해수산",
    amount: 2400000,
    dueDate: "2024-01-15",
    daysOverdue: 15,
    contact: "김철수",
    phone: "010-1234-5678",
  },
  {
    id: 2,
    name: "해양식품",
    amount: 1800000,
    dueDate: "2024-01-20",
    daysOverdue: 10,
    contact: "박민수",
    phone: "010-3456-7890",
  },
  {
    id: 3,
    name: "신선수산",
    amount: 3200000,
    dueDate: "2024-01-10",
    daysOverdue: 20,
    contact: "최지훈",
    phone: "010-4567-8901",
  },
]

const UnpaidList: React.FC = () => {
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">미수금 내역</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">미수금 현황 및 관리</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          <AlertTriangle className="h-4 w-4 mr-2" />
          긴급 연락
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mockUnpaidCustomers.map((customer) => (
          <Card key={customer.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">{customer.name}</CardTitle>
                <Badge variant={customer.daysOverdue > 15 ? "destructive" : "secondary"}>
                  {customer.daysOverdue}일 연체
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="font-semibold text-red-600">{formatCurrency(customer.amount)}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>만기일: {customer.dueDate}</span>
              </div>
              <div className="text-sm">
                <p>담당자: {customer.contact}</p>
                <p>연락처: {customer.phone}</p>
              </div>
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  연락하기
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  상세보기
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default UnpaidList; 