import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"

import { DollarSign, Calendar, User } from "lucide-react"

interface SettlementData {
  customerId: number;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
}

const SettlementForm: React.FC = () => {
  const [formData, setFormData] = useState<SettlementData>({
    customerId: 1,
    customerName: "동해수산",
    totalAmount: 2400000,
    paidAmount: 0,
    remainingAmount: 2400000,
    paymentDate: "",
    paymentMethod: "bank_transfer",
    notes: "",
  })

  const handleInputChange = (field: keyof SettlementData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      remainingAmount: field === 'paidAmount' ? prev.totalAmount - Number(value) : prev.remainingAmount
    }))
  }

  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">정산 처리</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">미수금 정산 및 결제 처리</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>거래처 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">거래처명</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalAmount">총 미수금</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <Input
                    id="totalAmount"
                    value={formatCurrency(formData.totalAmount)}
                    disabled
                    className="font-semibold"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="remainingAmount">잔여 금액</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <DollarSign className="h-4 w-4 text-red-400" />
                  <Input
                    id="remainingAmount"
                    value={formatCurrency(formData.remainingAmount)}
                    disabled
                    className="font-semibold text-red-600"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>결제 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paidAmount">결제 금액</Label>
              <div className="flex items-center space-x-2 mt-1">
                <DollarSign className="h-4 w-4 text-green-400" />
                <Input
                  id="paidAmount"
                  type="number"
                  value={formData.paidAmount}
                  onChange={(e) => handleInputChange('paidAmount', Number(e.target.value))}
                  className="font-semibold"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="paymentDate">결제일</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="paymentMethod">결제 방법</Label>
              <select
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank_transfer">계좌이체</option>
                <option value="cash">현금</option>
                <option value="check">수표</option>
                <option value="credit_card">신용카드</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="정산 관련 메모를 입력하세요..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
        <Button variant="outline" className="w-full sm:w-auto">
          취소
        </Button>
        <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
          정산 완료
        </Button>
      </div>
    </div>
  )
}

export default SettlementForm; 