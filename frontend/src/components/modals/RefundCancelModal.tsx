/**
 * 환불/취소 사유 입력 모달
 * 환불 처리나 주문 취소 시 사유를 입력받는 모달입니다
 */
import React, { useState } from 'react'
import { X, AlertTriangle, CreditCard, Ban } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'

interface RefundCancelModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
  type: 'refund' | 'cancel'
  orderId: number
  isLoading?: boolean
}

const RefundCancelModal: React.FC<RefundCancelModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  orderId,
  isLoading = false
}) => {
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onSubmit(reason.trim())
    }
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  if (!isOpen) return null

  const isRefund = type === 'refund'
  const title = isRefund ? '환불 처리' : '주문 취소'
  const description = isRefund 
    ? '환불 사유를 입력해주세요.' 
    : '주문 취소 사유를 입력해주세요.'
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
              <p>주문 ID: <span className="font-medium">{orderId}</span></p>
              <p className="mt-1">{description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  {isRefund ? '환불 사유' : '취소 사유'}
                </Label>
                <Textarea
                  id="reason"
                  placeholder={isRefund ? '환불 사유를 입력하세요...' : '취소 사유를 입력하세요...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  disabled={isLoading}
                  className="resize-none"
                />
              </div>

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
                  disabled={isLoading || !reason.trim()}
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
