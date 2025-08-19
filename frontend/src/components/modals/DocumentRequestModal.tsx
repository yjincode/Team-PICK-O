/**
 * 문서 발급 요청 통합 모달
 * 세금계산서와 현금영수증 발급을 요청하는 모달입니다
 */
import React, { useState } from 'react'
import { X, FileText, Receipt } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

interface DocumentRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { 
    documentType: 'tax_invoice' | 'cash_receipt'
    receiptType?: 'individual' | 'business'
    identifier: string
    specialRequest: string 
  }) => void
  type: 'tax_invoice' | 'cash_receipt'
  orderId: number
  businessName: string
  itemsSummary: string
  isLoading?: boolean
}

const DocumentRequestModal: React.FC<DocumentRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  orderId,
  businessName,
  itemsSummary,
  isLoading = false
}) => {
  const [receiptType, setReceiptType] = useState<'individual' | 'business'>('individual')
  const [identifier, setIdentifier] = useState('')
  const [specialRequest, setSpecialRequest] = useState('')

  const handleSubmit = () => {
    if (!identifier.trim()) {
      alert('필수 정보를 입력해주세요.')
      return
    }

    // 현금영수증인 경우 receiptType이 필요
    if (type === 'cash_receipt' && !receiptType) {
      alert('개인/사업자 구분을 선택해주세요.')
      return
    }

    onSubmit({
      documentType: type,
      receiptType: type === 'cash_receipt' ? receiptType : undefined,
      identifier: identifier.trim(),
      specialRequest: specialRequest.trim()
    })
  }

  const handleClose = () => {
    setReceiptType('individual')
    setIdentifier('')
    setSpecialRequest('')
    onClose()
  }

  const getModalTitle = () => {
    return type === 'tax_invoice' ? '세금계산서 요청' : '현금영수증 요청'
  }

  const getModalIcon = () => {
    return type === 'tax_invoice' ? <FileText className="h-5 w-5" /> : <Receipt className="h-5 w-5" />
  }

  const getIdentifierLabel = () => {
    if (type === 'tax_invoice') return '사업자등록번호'
    return receiptType === 'individual' ? '휴대폰번호' : '사업자등록번호'
  }

  const getIdentifierPlaceholder = () => {
    if (type === 'tax_invoice') return '123-45-67890'
    return receiptType === 'individual' ? '010-1234-5678' : '123-45-67890'
  }

  const getDescription = () => {
    if (type === 'tax_invoice') {
      return '세금계산서 발급을 위한 정보를 입력해주세요.'
    }
    return '현금영수증 발급을 위한 정보를 입력해주세요.'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            {getModalIcon()}
            <CardTitle className="text-lg">{getModalTitle()}</CardTitle>
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
              <p className="mt-1">{getDescription()}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 현금영수증인 경우에만 영수증 타입 선택 */}
              {type === 'cash_receipt' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    영수증 타입 <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={receiptType}
                    onValueChange={(value: 'individual' | 'business') => setReceiptType(value)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="text-sm cursor-pointer">
                        개인
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="business" id="business" />
                      <Label htmlFor="business" className="text-sm cursor-pointer">
                        사업자
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  {getIdentifierLabel()} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="identifier"
                  placeholder={getIdentifierPlaceholder()}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={isLoading}
                  className={type === 'tax_invoice' || receiptType === 'business' ? 'font-mono' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequest" className="text-sm font-medium">
                  특별 요청사항 (선택사항)
                </Label>
                <Textarea
                  id="specialRequest"
                  placeholder="추가 요청사항이 있다면 입력하세요..."
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  rows={3}
                  disabled={isLoading}
                  className="resize-none"
                />
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
                  variant="default"
                  disabled={isLoading || !identifier.trim()}
                  className="flex-1"
                >
                  {isLoading ? '처리 중...' : '요청하기'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DocumentRequestModal
