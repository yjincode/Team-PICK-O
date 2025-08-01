"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Calculator, CreditCard, CheckCircle } from "lucide-react"

const mockCustomers = [
  { id: 1, name: "동해수산", unpaidAmount: 2400000 },
  { id: 2, name: "해양식품", unpaidAmount: 1800000 },
  { id: 3, name: "신선수산", unpaidAmount: 3200000 },
  { id: 4, name: "바다마켓", unpaidAmount: 800000 },
  { id: 5, name: "푸른바다", unpaidAmount: 1200000 },
]

export default function SettlementForm() {
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatCurrency = (amount) => `₩${amount.toLocaleString()}`

  const handleCustomerSelect = (customerId) => {
    const customer = mockCustomers.find((c) => c.id.toString() === customerId)
    setSelectedCustomer(customer || null)
    setPaymentAmount("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    alert("정산이 완료되었습니다.")
  }

  const remainingAmount = selectedCustomer ? selectedCustomer.unpaidAmount - (Number.parseInt(paymentAmount) || 0) : 0

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Calculator className="h-8 w-8 text-accent-blue" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">정산 처리</h1>
          <p className="text-gray-600 mt-1">거래처 미수금 정산 및 결제 처리</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settlement Form */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>정산 정보 입력</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-base font-medium">
                  거래처 선택 *
                </Label>
                <Select onValueChange={handleCustomerSelect}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="정산할 거래처를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {formatCurrency(customer.unpaidAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unpaid Amount Display */}
              {selectedCustomer && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">현재 미수금액</Label>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedCustomer.unpaidAmount)}</p>
                  </div>
                </div>
              )}

              {/* Payment Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="paymentAmount" className="text-base font-medium">
                  정산 금액 *
                </Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="정산할 금액을 입력하세요"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-12 text-lg"
                  required
                />
              </div>

              {/* Remaining Amount Display */}
              {selectedCustomer && paymentAmount && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">정산 후 잔액</Label>
                  <div className={`p-4 border rounded-lg ${
                    remainingAmount > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"
                  }`}>
                    <p className={`text-2xl font-bold ${
                      remainingAmount > 0 ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {formatCurrency(remainingAmount)}
                    </p>
                    {remainingAmount <= 0 && (
                      <p className="text-sm text-green-600 mt-1">✓ 완전 정산 완료</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-base font-medium">
                  결제 방법
                </Label>
                <Select>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="결제 방법을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">계좌이체</SelectItem>
                    <SelectItem value="cash">현금</SelectItem>
                    <SelectItem value="check">어음</SelectItem>
                    <SelectItem value="card">카드</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <Label htmlFor="memo" className="text-base font-medium">
                  메모
                </Label>
                <Textarea
                  id="memo"
                  placeholder="정산 관련 메모를 입력하세요"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!selectedCustomer || !paymentAmount || isSubmitting}
                className="w-full h-12 bg-accent-blue hover:bg-accent-blue/90"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>정산 처리</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">정산 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">총 미수금</span>
                <span className="font-semibold">
                  {formatCurrency(mockCustomers.reduce((sum, c) => sum + c.unpaidAmount, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">거래처 수</span>
                <span className="font-semibold">{mockCustomers.length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">평균 미수금</span>
                <span className="font-semibold">
                  {formatCurrency(Math.round(mockCustomers.reduce((sum, c) => sum + c.unpaidAmount, 0) / mockCustomers.length))}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-2">최근 정산 내역</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>동해수산</span>
                  <span className="text-green-600">+₩500,000</span>
                </div>
                <div className="flex justify-between">
                  <span>해양식품</span>
                  <span className="text-green-600">+₩300,000</span>
                </div>
                <div className="flex justify-between">
                  <span>신선수산</span>
                  <span className="text-green-600">+₩800,000</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 