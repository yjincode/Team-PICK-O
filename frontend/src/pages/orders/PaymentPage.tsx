import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { orderApi, paymentsApi } from '../../lib/api'

type PaymentMethod = 'cash' | 'bank_transfer' | 'card'

declare global {
  interface Window {
    TossPayments?: any
  }
}

const loadTossScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve()
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('토스 스크립트 로드 실패'))
    document.body.appendChild(script)
  })
}

const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [amount, setAmount] = useState<number>(0)
  const [processingPayment, setProcessingPayment] = useState(false) // 결제 진행 중 상태 추가

  // 현금영수증
  const [cashReceiptRequested, setCashReceiptRequested] = useState(false)
  const [cashReceiptType, setCashReceiptType] = useState<'personal' | 'business'>('personal')
  const [cashReceiptNumber, setCashReceiptNumber] = useState('')

  // 세금계산서
  const [taxInvoiceRequested, setTaxInvoiceRequested] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      try {
        const data: any = await orderApi.getById(Number(id))
        setOrder(data as any)
        setAmount((data as any).total_price || 0)
        // 기본 결제수단은 카드 제외 임의 선택
        const defaultMethod: PaymentMethod = (data as any)?.payment?.method || 'cash'
        setMethod(defaultMethod)
      } catch (e) {
        alert('주문 정보를 불러오지 못했습니다.')
        navigate('/orders')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id])

  // 토스 결제 성공 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = params.get('amount')
    const fail = params.get('fail') || params.get('code') || params.get('message')

    if (fail) {
      const code = params.get('code')
      const message = params.get('message')
      alert(`결제 실패: ${message || '알 수 없는 오류'}${code ? ` (코드: ${code})` : ''}`)
      return
    }

    if (paymentKey && orderId && amount) {
      // 토스 결제 승인 API 호출
      const confirmPayment = async () => {
        try {
          setProcessingPayment(true)
          const response = await paymentsApi.confirmToss({
            paymentKey,
            orderId,
            amount: Number(amount)
          })
          
          console.log('토스 결제 승인 완료:', response)
          alert('카드 결제가 완료되었습니다.')
          navigate('/orders')
        } catch (error: unknown) {
          console.error('토스 결제 승인 실패:', error)
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
          alert('결제 승인 처리 실패: ' + errorMessage)
        } finally {
          setProcessingPayment(false)
        }
      }
      
      confirmPayment()
    }
  }, [id, navigate])

  const badge = useMemo(() => {
    const status = order?.payment?.payment_status || 'pending'
    if (status === 'paid') return { text: '결제 완료', color: 'bg-blue-100 text-blue-800' }
    if (status === 'pending') return { text: '미결제', color: 'bg-red-100 text-red-800' }
    return { text: status, color: 'bg-gray-100 text-gray-800' }
  }, [order])

  const submitCashOrBank = async () => {
    if (!id || processingPayment) return
    
    try {
      setProcessingPayment(true)
      await orderApi.updateStatus(Number(id), 'pending') // linter 에러 수정
      alert('결제 정보가 저장되었습니다. 결제 완료는 주문상세에서 수동으로 처리하세요.')
      navigate('/orders')
    } catch (e) {
      alert('결제 정보 저장 실패')
    } finally {
      setProcessingPayment(false)
    }
  }

  const submitCard = async () => {
    if (!id || processingPayment) return
    
    try {
      setProcessingPayment(true)
      await loadTossScript()
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
      if (!clientKey) throw new Error('TOSS CLIENT KEY가 설정되지 않았습니다.')
      const toss = window.TossPayments(clientKey)
      const orderName = `주문 #${id}`
      const amountNumber = Number(amount)
      await toss.requestPayment('카드', {
        amount: amountNumber,
        orderId: `order-${id}-${Date.now()}`,
        orderName,
        successUrl: window.location.origin + `/orders/${id}/payment`,
        failUrl: window.location.origin + `/orders/${id}/payment?fail=1`,
      })
    } catch (e) {
      alert('카드 결제 요청 실패')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleMethodChange = (newMethod: PaymentMethod) => {
    setMethod(newMethod)
    // 결제 수단 변경 시 관련 상태 초기화
    if (newMethod === 'cash') {
      setTaxInvoiceRequested(false)
    } else if (newMethod === 'bank_transfer') {
      setCashReceiptRequested(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">결제 페이지</h1>
        <p className="text-gray-600">주문 #{id}의 결제를 진행합니다.</p>
      </div>

      {/* 주문 정보 요약 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>주문 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">주문 금액</Label>
              <p className="text-lg font-semibold">{amount?.toLocaleString()}원</p>
            </div>
            <div>
              <Label className="text-sm font-medium">결제 상태</Label>
              <Badge className={badge.color}>{badge.text}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결제 수단 선택 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>결제 수단 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="cash"
                  checked={method === 'cash'}
                  onChange={() => handleMethodChange('cash')}
                  className="text-blue-600"
                />
                <span>현금</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="bank_transfer"
                  checked={method === 'bank_transfer'}
                  onChange={() => handleMethodChange('bank_transfer')}
                  className="text-blue-600"
                />
                <span>계좌이체</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="card"
                  checked={method === 'card'}
                  onChange={() => handleMethodChange('card')}
                  className="text-blue-600"
                />
                <span>카드</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현금/계좌이체 폼 */}
      {(method === 'cash' || method === 'bank_transfer') && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{method === 'cash' ? '현금 결제' : '계좌이체 결제'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 현금영수증 신청 */}
            {method === 'cash' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cashReceipt"
                    checked={cashReceiptRequested}
                    onChange={(e) => setCashReceiptRequested(e.target.checked)}
                    className="text-blue-600"
                  />
                  <Label htmlFor="cashReceipt">현금영수증 신청</Label>
                </div>
                
                {cashReceiptRequested && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <Label>현금영수증 유형</Label>
                      <Select value={cashReceiptType} onValueChange={(value: 'personal' | 'business') => setCashReceiptType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">개인</SelectItem>
                          <SelectItem value="business">사업자</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>
                        {cashReceiptType === 'personal' ? '휴대폰 번호' : '사업자 등록번호'}
                      </Label>
                      <Input
                        placeholder={cashReceiptType === 'personal' ? '010-1234-5678' : '123-45-67890'}
                        value={cashReceiptNumber}
                        onChange={(e) => setCashReceiptNumber(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 세금계산서 신청 */}
            {method === 'bank_transfer' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="taxInvoice"
                    checked={taxInvoiceRequested}
                    onChange={(e) => setTaxInvoiceRequested(e.target.checked)}
                    className="text-blue-600"
                  />
                  <Label htmlFor="taxInvoice">세금계산서 신청</Label>
                </div>
                
                {taxInvoiceRequested && (
                  <div className="ml-6">
                    <Label>사업자 등록번호</Label>
                    <Input
                      placeholder="123-45-67890"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={submitCashOrBank}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={processingPayment}
            >
              {processingPayment ? '처리 중...' : '결제 정보 저장'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 카드 결제 폼 */}
      {method === 'card' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>카드 결제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                토스페이먼츠를 통해 안전하게 결제를 진행합니다.
              </p>
              <Button 
                onClick={submitCard}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={processingPayment}
              >
                {processingPayment ? '처리 중...' : '카드로 결제하기'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PaymentPage


