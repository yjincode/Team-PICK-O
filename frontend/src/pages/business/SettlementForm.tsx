/**
 * 정산 처리 폼 페이지
 * 미수금 정산 및 결제 처리를 위한 폼 페이지입니다
 */
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"

import { DollarSign, Calendar, User } from "lucide-react"

// 정산 데이터 타입 정의
interface SettlementData {
  businessId: number;      // 거래처 ID
  businessName: string;    // 거래처명
  phoneNumber: string;     // 연락처
  address?: string;        // 주소
  totalAmount: number;     // 총 미수금
  paidAmount: number;      // 결제 금액
  remainingAmount: number; // 잔여 금액

  notes: string;          // 메모
}

const SettlementForm: React.FC = () => {
  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState<SettlementData>({
    businessId: 1,
    businessName: "동해수산",
    phoneNumber: "010-1234-5678",
    address: "강원도 동해시",
    totalAmount: 2400000,
    paidAmount: 0,
    remainingAmount: 2400000,

    notes: "",
  })

  // 입력 필드 변경 핸들러 (결제 금액 변경 시 잔여 금액 자동 계산)
  const handleInputChange = (field: keyof SettlementData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      remainingAmount: field === 'paidAmount' ? prev.totalAmount - Number(value) : prev.remainingAmount
    }))
  }

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">정산 처리</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">미수금 정산 및 결제 처리</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 거래처 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>거래처 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName">거래처명</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">연락처</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => handleInputChange('address', e.target.value)}
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
            <div>
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="정산 관련 메모를 입력하세요..."
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>


      </div>

      {/* 액션 버튼들 */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
        <Button variant="outline" className="w-full sm:w-auto">
          취소
        </Button>
        <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
          정산 처리
        </Button>
      </div>
    </div>
  )
}

export default SettlementForm; 