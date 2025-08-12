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

  const badge = useMemo(() => {
    const status = order?.payment?.payment_status || 'pending'
    if (status === 'paid') return { text: '결제 완료', color: 'bg-blue-100 text-blue-800' }
    if (status === 'pending') return { text: '미결제', color: 'bg-red-100 text-red-800' }
    return { text: status, color: 'bg-gray-100 text-gray-800' }
  }, [order])

  const submitCashOrBank = async () => {
    if (!orderId) return
    try {
      await orderApi.updateStatus(Number(orderId), 'placed')
      alert('결제 정보가 저장되었습니다. 결제 완료는 주문상세에서 수동으로 처리하세요.')
      navigate('/orders')
    } catch (e) {
      alert('결제 정보 저장 실패')
    }
  }

  const submitCard = async () => {
    if (!orderId) return
    try {
      await loadTossScript()
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
      if (!clientKey) throw new Error('TOSS CLIENT KEY가 설정되지 않았습니다.')
      const toss = window.TossPayments(clientKey)
      const orderName = `주문 #${orderId}`
      const amountNumber = Number(amount)
      await toss.requestPayment('카드', {
        amount: amountNumber,
        orderId: `order-${orderId}-${Date.now()}`,
        orderName,
        successUrl: window.location.origin + `/orders/${orderId}/payment`,
        failUrl: window.location.origin + `/orders/${orderId}/payment?fail=1`,
      })
    } catch (e) {
      alert('카드 결제창 호출 실패')
    }
  }

  // 결제 성공 콜백 처리 (토스 리다이렉트 파라미터: paymentKey, orderId, amount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentKey = params.get('paymentKey')
    const tossOrderId = params.get('orderId')
    const tossAmount = params.get('amount')
    const fail = params.get('fail') || params.get('code') || params.get('message')

    if (fail) {
      const code = params.get('code')
      const message = params.get('message')
      alert(`결제 실패: ${message || '알 수 없는 오류'}${code ? ` (코드: ${code})` : ''}`)
      return
    }

    if (paymentKey && tossOrderId && tossAmount) {
      // 토스 결제 승인 API 호출
      paymentsApi.confirmToss({
        paymentKey,
        orderId: tossOrderId,
        amount: Number(tossAmount)
      })
        .then((response) => {
          console.log('토스 결제 승인 완료:', response)
          alert('카드 결제가 완료되었습니다.')
          navigate('/orders')
        })
        .catch((error) => {
          console.error('토스 결제 승인 실패:', error)
          alert('결제 승인 처리 실패: ' + (error.response?.data?.error || error.message))
        })
    }
  }, [orderId])

  if (loading) return <div className="p-6">로딩 중...</div>
  if (!order) return null

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">주문 결제</div>
              <CardTitle className="text-2xl">주문 #{orderId} 결제</CardTitle>
            </div>
            <Badge className={`${badge.color}`}>{badge.text}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-900">결제 수단</h3>
              <div className="space-y-3">
                <Label>수단 선택</Label>
                <Select value={method} onValueChange={(v: PaymentMethod) => setMethod(v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="결제 수단 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">현금</SelectItem>
                    <SelectItem value="bank_transfer">계좌이체</SelectItem>
                    <SelectItem value="card">카드</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label>결제 금액</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value || '0'))} />
                </div>

                {method === 'cash' && (
                  <div className="space-y-3">
                    <Label>현금영수증</Label>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant={cashReceiptRequested ? 'default' : 'outline'} onClick={() => setCashReceiptRequested((v) => !v)}>
                        {cashReceiptRequested ? '신청 취소' : '신청'}
                      </Button>
                      {cashReceiptRequested && (
                        <Select value={cashReceiptType} onValueChange={(v: 'personal' | 'business') => setCashReceiptType(v)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal">개인</SelectItem>
                            <SelectItem value="business">사업자</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {cashReceiptRequested && (
                      <div className="space-y-2">
                        <Label>{cashReceiptType === 'personal' ? '휴대폰 번호' : '사업자등록번호'}</Label>
                        <Input value={cashReceiptNumber} onChange={(e) => setCashReceiptNumber(e.target.value)} placeholder={cashReceiptType === 'personal' ? '010-0000-0000' : '000-00-00000'} />
                      </div>
                    )}
                  </div>
                )}

                {method === 'bank_transfer' && (
                  <div className="space-y-3">
                    <Label>세금계산서</Label>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant={taxInvoiceRequested ? 'default' : 'outline'} onClick={() => setTaxInvoiceRequested((v) => !v)}>
                        {taxInvoiceRequested ? '신청 취소' : '신청'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  {method === 'card' ? (
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={submitCard}>카드 결제 진행</Button>
                  ) : (
                    <Button onClick={submitCashOrBank}>결제 정보 저장</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">주문 요약</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">거래처</div>
                <div className="font-medium">{order.business_name}</div>
                <div className="text-gray-600">총 금액</div>
                <div className="font-medium">{(order.total_price || 0).toLocaleString()}원</div>
                <div className="text-gray-600">주문 상태</div>
                <div className="font-medium">{order.order_status}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentPage


