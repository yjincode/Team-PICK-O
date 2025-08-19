/**
 * 환불/취소 사유 입력 모달
 * 환불 처리나 주문 취소 시 사유를 선택하고 상세 내용을 입력받는 모달입니다
 */
import React, { useState } from 'react'
import { X, AlertTriangle, CreditCard, Ban } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

interface RefundCancelModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, detail: string) => void
  type: 'refund' | 'cancel'
  orderId: number
  businessName: string
  itemsSummary: string
  isLoading?: boolean
}

const RefundCancelModal: React.FC<RefundCancelModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  orderId,
  businessName,
  itemsSummary,
  isLoading = false
}) => {
  const [selectedReason, setSelectedReason] = useState('')
  const [detail, setDetail] = useState('')

  // 취소 사유 옵션
  const cancelReasons = [
    { value: 'customer_request', label: '고객 요청' },
    { value: 'stock_shortage', label: '재고 부족' },
    { value: 'quality_issue', label: '품질 문제' },
    { value: 'delivery_delay', label: '배송 지연' },
    { value: 'price_dispute', label: '가격 분쟁' },
    { value: 'other', label: '기타' },
  ]

  // 환불 사유 옵션
  const refundReasons = [
    { value: 'customer_request', label: '고객 요청' },
    { value: 'product_defect', label: '상품 하자' },
    { value: 'wrong_delivery', label: '잘못된 배송' },
    { value: 'delivery_delay', label: '배송 지연' },
    { value: 'price_error', label: '가격 오류' },
    { value: 'duplicate_payment', label: '중복 결제' },
    { value: 'other', label: '기타' },
  ]

  const reasons = type === 'refund' ? refundReasons : cancelReasons

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedReason) {
      onSubmit(selectedReason, detail.trim())
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    setDetail('')
    onClose()
  }

  if (!isOpen) return null

  const isRefund = type === 'refund'
  const title = isRefund ? '환불 처리' : '주문 취소'
  const description = isRefund 
    ? '환불 사유를 선택해주세요.' 
    : '주문 취소 사유를 선택해주세요.'
  const icon = isRefund ? <CreditCard className="h-5 w-5" /> : <Ban className="h-5 w-5" />
  const buttonText = isRefund ? '환불 처리' : '주문 취소'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>거래처: <span className="font-medium">{businessName}</span></p>
              <p>품목 요약: <span className="font-medium">{itemsSummary}</span></p>
              <p className="mt-1">{description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {isRefund ? '환불 사유' : '취소 사유'}
                </Label>
                <RadioGroup
                  value={selectedReason}
                  onValueChange={setSelectedReason}
                  className="grid grid-cols-3 gap-3"
                >
                  {reasons.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {selectedReason === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="detail" className="text-sm font-medium">
                    상세 사유 (필수)
                  </Label>
                  <Textarea
                    id="detail"
                    placeholder="구체적인 사유를 입력하세요..."
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    rows={3}
                    required
                    disabled={isLoading}
                    className="resize-none"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p>
                  {isRefund 
                    ? '환불 처리 시 결제 금액이 환불되고 주문이 취소됩니다.'
                    : '주문 취소 시 결제된 금액이 있다면 자동으로 환불 처리됩니다.'
                  }
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant={isRefund ? 'destructive' : 'default'}
                  disabled={isLoading || !selectedReason || (selectedReason === 'other' && !detail.trim())}
                  className="flex-1"
                >
                  {isLoading ? '처리 중...' : buttonText}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RefundCancelModal
