/**
 * 결제 페이지
 * 주문에 대한 결제를 처리하는 페이지입니다
 */
import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, CreditCard, Banknote, Building2 } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Order } from "../../types"
import { orderApi, paymentApi } from "../../lib/api"
import { getLabel, getBadgeClass } from "../../lib/labels"
import { PaymentStatusBadge, PaymentMethodBadge } from "../../components/common/StatusBadges"
import toast from 'react-hot-toast'

// 토스 페이먼츠 타입 정의
declare global {
  interface Window {
    TossPayments: any
  }
}

const PaymentPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // 중복 확정 호출 방지
  const confirmingRef = useRef(false)
  const processedKeyRef = useRef<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // 결제 방법 선택
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'bank_transfer'>('card')
  
  // 수동 결제 정보
  const [payerName, setPayerName] = useState('')
  const [bankName, setBankName] = useState('')

  // 토스페이먼츠 관련 상태
  const [tosspayments, setTosspayments] = useState<any>(null)
  const [widgets, setWidgets] = useState<any>(null)
  const [paymentMethodWidget, setPaymentMethodWidget] = useState<any>(null)
  const [isWidgetReady, setIsWidgetReady] = useState(false)

  // 주문 정보 로드
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        const response = await orderApi.getById(parseInt(id))
        console.log('🔍 orderApi.getById 응답:', response)
        console.log('🔍 response 타입:', typeof response)
        console.log('🔍 response 키들:', Object.keys(response || {}))
        
        // response가 이미 Order 객체이므로 직접 사용
        setOrder(response)
      } catch (error) {
        console.error('주문 정보 로드 실패:', error)
        toast.error('주문 정보를 불러오는데 실패했습니다.')
        navigate('/orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id]) // navigate 의존성 제거

  // 토스페이먼츠 SDK 초기화
  useEffect(() => {
    const initializeTossPayments = async () => {
      try {
        // SDK가 로드될 때까지 대기
        if (window.TossPayments) {
          const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
          if (!clientKey) {
            console.error('토스페이먼츠 클라이언트 키가 설정되지 않았습니다.')
            toast.error('토스페이먼츠 설정이 완료되지 않았습니다.')
            return
          }

          console.log('🚀 토스페이먼츠 SDK 초기화 시작 (API 개별 연동 키)')
          console.log('🔑 사용 중인 클라이언트 키:', clientKey.substring(0, 10) + '...')
          
          // v2 방식으로 초기화 (API 개별 연동 키)
          const tosspaymentsInstance = window.TossPayments(clientKey)
          setTosspayments(tosspaymentsInstance)

          // API 개별 연동 키는 payment() 메서드 사용
          try {
            const paymentInstance = tosspaymentsInstance.payment({
              customerKey: 'ANONYMOUS' // 비회원 결제
            })
            setWidgets(paymentInstance) // payment 인스턴스 사용
            console.log('✅ 결제창 초기화 성공 (API 개별 연동 키)')
          } catch (paymentError: any) {
            console.error('결제창 초기화 실패:', paymentError)
            toast.error('결제창 초기화에 실패했습니다.')
            return
          }

          console.log('✅ 토스페이먼츠 SDK 초기화 완료')
        } else {
          console.error('토스페이먼츠 SDK를 찾을 수 없습니다.')
          toast.error('토스페이먼츠 SDK 로딩에 실패했습니다.')
        }
      } catch (error: any) {
        console.error('토스페이먼츠 초기화 오류:', error)
        
        // 구체적인 에러 메시지 처리
        if (error.message) {
          if (error.message.includes('결제위젯 연동 키')) {
            toast.error('API 개별 연동 키를 사용하여 결제창 방식으로 변경되었습니다.')
          } else if (error.message.includes('API 개별 연동 키')) {
            toast.error('API 개별 연동 키로 결제창을 초기화합니다.')
          } else {
            toast.error(`토스페이먼츠 초기화 오류: ${error.message}`)
          }
        } else {
          toast.error('토스페이먼츠 초기화 중 오류가 발생했습니다.')
        }
      }
    }

    // SDK 스크립트가 로드된 후 초기화
    const checkSDK = setInterval(() => {
      if (window.TossPayments) {
        clearInterval(checkSDK)
        initializeTossPayments()
      }
    }, 100)

    // 10초 후 타임아웃
    setTimeout(() => {
      clearInterval(checkSDK)
      if (!window.TossPayments) {
        toast.error('토스페이먼츠 SDK 로딩 시간이 초과되었습니다.')
      }
    }, 10000)

    return () => clearInterval(checkSDK)
  }, [])

  // 결제창 렌더링 (API 개별 연동 키용)
  useEffect(() => {
    const renderPaymentInterface = async () => {
      if (!widgets || !order) return

      try {
        console.log('🎨 결제창 인터페이스 준비 시작')
        
        // API 개별 연동 키는 결제창을 직접 호출하므로 별도 렌더링 불필요
        setIsWidgetReady(true)
        console.log('✅ 결제창 인터페이스 준비 완료')
        
      } catch (error) {
        console.error('결제창 인터페이스 준비 오류:', error)
        toast.error('결제창을 준비하는데 실패했습니다.')
      }
    }

    renderPaymentInterface()
  }, [widgets, order])

  // 카드 결제 처리 (API 개별 연동 키 - 결제창 방식)
  const handleCardPayment = async () => {
    if (!order || !widgets) {
      toast.error('결제 준비가 완료되지 않았습니다.')
      return
    }
    
    try {
      setProcessingPayment(true)
      
      console.log('💳 카드 결제 시작 (결제창 방식):', {
        orderId: order.id,
        amount: order.total_price,
        clientKey: import.meta.env.VITE_TOSS_CLIENT_KEY
      })

      // 1단계: 백엔드에 pending 상태의 Payment 생성 요청
      const orderIdForToss = `order_${order.id}_${Date.now()}`
      console.log('🔍 결제 요청 전 Payment 생성:', orderIdForToss)
      
      try {
        // 결제 요청 API 호출 (pending 상태 생성) - 토큰 없이도 호출 가능
        console.log('📡 백엔드 API 호출 시작:', {
          url: '/api/v1/payments/toss/request/',
          data: {
            orderId: order.id,
            amount: order.total_price,
            orderIdForToss: orderIdForToss
          }
        })
        
        const createPaymentResponse = await fetch('/api/v1/payments/toss/request/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: order.id,
            amount: order.total_price,
            orderIdForToss: orderIdForToss
          })
        })
        
        if (!createPaymentResponse.ok) {
          let errorMessage = `Payment 생성 실패: ${createPaymentResponse.status}`
          try {
            const errorData = await createPaymentResponse.json()
            errorMessage += ` - ${errorData.error || '알 수 없는 오류'}`
          } catch (parseError) {
            errorMessage += ' - 응답 파싱 실패'
          }
          throw new Error(errorMessage)
        }
        
        await createPaymentResponse.json()
      } catch (error) {
        console.error('Payment 생성 오류:', error)
        toast.error(`결제 준비 중 오류가 발생했지만 결제창을 계속 진행합니다: ${error.message}`)
      }

      // 2단계: 토스페이먼츠 결제창 호출
      try {
        await widgets.requestPayment({
          method: "CARD",
          amount: {
            currency: "KRW",
            value: order.total_price,
          },
          orderId: orderIdForToss,
          orderName: `주문 #${order.id} - ${order.business_id}`,
          successUrl: `${window.location.origin}/orders/${order.id}/payment?success=true&orderId=${orderIdForToss}&amount=${order.total_price}`,
          failUrl: `${window.location.origin}/orders/${order.id}/payment?fail=true`,
          customerEmail: 'customer@example.com',
          customerName: '고객',
          card: {
            useEscrow: false,
            useCardPoint: false,
            useAppCardOnly: false,
          },
        })
      } catch (paymentError) {
        console.error('토스페이먼츠 결제창 호출 실패:', paymentError)
        throw paymentError
      }
      
    } catch (error: any) {
      console.error('카드 결제 오류:', error)
      
      // 토스페이먼츠 에러 코드별 처리
      if (error.code) {
        switch (error.code) {
          case 'PAY_PROCESS_CANCELED':
            toast.error('결제가 취소되었습니다.')
            break
          case 'PAY_PROCESS_ABORTED':
            toast.error('결제가 중단되었습니다.')
            break
          default:
            toast.error(`결제 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`)
        }
      } else {
        toast.error('결제 처리 중 오류가 발생했습니다.')
      }
      
      setProcessingPayment(false)
    }
  }

  // Toss Payments 리다이렉트 결과 처리
  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderIdParam = searchParams.get('orderId')
    const amountParam = searchParams.get('amount')
    const failCode = searchParams.get('code')
    const failMessage = searchParams.get('message')
    const success = searchParams.get('success')
    const fail = searchParams.get('fail')

    // 성공 처리: paymentKey, orderId, amount 존재
    if (paymentKey && orderIdParam && amountParam) {
      // 중복 실행 방지 (StrictMode 등)
      if (processedKeyRef.current === paymentKey || confirmingRef.current) {
        return
      }
      const confirmPayment = async () => {
        try {
          confirmingRef.current = true
          setProcessingPayment(true)
          
          // 디버깅: 전송할 데이터 로그 출력
          const confirmData = {
            paymentKey,
            orderId: orderIdParam, // orderIdForToss (merchant_uid)
            amount: Number(amountParam),
          }
          console.log('🔍 결제 확정 요청 데이터:', confirmData)
          console.log('🔍 데이터 타입 확인:', {
            paymentKey: typeof paymentKey,
            orderId: typeof confirmData.orderId,
            amount: typeof confirmData.amount
          })
          
          const response = await paymentApi.confirmToss(confirmData)
          if (response.data) {
            // 결제 완료 즉시 UI 상태 업데이트
            if (order) {
              setOrder({
                ...order,
                order_status: 'ready' // 출고준비 상태로 즉시 업데이트
              })
            }
            
            toast.success('🎉 결제가 성공적으로 완료되었습니다! 주문 상태가 출고준비로 변경되었습니다.')
            
            // 2초 후 주문 목록으로 이동 (사용자가 성공 메시지를 볼 수 있도록)
            setTimeout(() => {
              navigate('/orders', { replace: true, state: { refresh: true, ts: Date.now() } })
            }, 2000)
          }
        } catch (error: any) {
          console.error('결제 확정 처리 오류:', error)
          toast.error('결제는 완료되었지만 처리 중 오류가 발생했습니다.')
        } finally {
          processedKeyRef.current = paymentKey
          confirmingRef.current = false
          setProcessingPayment(false)
        }
      }
      confirmPayment()
    }

    // v2 방식 성공/실패 처리
    if (success === 'true') {
      toast.success('🎉 결제가 성공적으로 완료되었습니다! 주문 상태가 출고준비로 변경되었습니다.')
      navigate('/orders')
    } else if (fail === 'true') {
      toast.error('결제에 실패했습니다.')
      setProcessingPayment(false)
    }

    // 실패 처리
    if (!paymentKey && (failCode || failMessage)) {
      toast.error(`결제 실패: ${failMessage || failCode}`)
      setProcessingPayment(false)
      if (id) {
        navigate(`/orders/${id}/payment`, { replace: true })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // 수동 결제 완료 처리
  const handleManualPayment = async () => {
    if (!order) return
    
    try {
      setProcessingPayment(true)
      
      const response = await paymentApi.markPaid({
        orderId: order.id,
        amount: order.total_price,
        method: paymentMethod === 'card' ? 'bank_transfer' : paymentMethod,
        payerName: payerName || undefined,
        bankName: bankName || undefined
      })
      
      if (response.data) {
        toast.success('결제가 완료되었습니다.')
        navigate(`/orders/${order.id}`)
      }
      
    } catch (error: any) {
      console.error('수동 결제 오류:', error)
      const errorMessage = error.response?.data?.error || '결제 처리 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setProcessingPayment(false)
    }
  }

  // 컴포넌트 언마운트 시 위젯 정리
  useEffect(() => {
    return () => {
      if (paymentMethodWidget) {
        paymentMethodWidget.destroy().catch(console.error)
      }
    }
  }, [paymentMethodWidget])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">주문 정보를 불러오는 중...</p>
          <Button 
            onClick={() => setLoading(false)} 
            className="mt-4"
            variant="outline"
          >
            강제로 로딩 해제
          </Button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">주문을 찾을 수 없습니다.</p>
          <Button onClick={() => navigate('/orders')} className="mt-4">
            주문 목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/orders/${order.id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              돌아가기
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">결제 처리</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                주문 #{order.id} - 거래처 ID: {order.business_id}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 주문 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">주문 번호:</span>
                <span className="font-semibold">#{order.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">거래처:</span>
                <span className="font-semibold">거래처 ID: {order.business_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">주문일:</span>
                <span>{format(new Date(order.order_datetime), "yyyy-MM-dd", { locale: ko })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">납기일:</span>
                <span>
                  {order.delivery_datetime 
                    ? format(new Date(order.delivery_datetime), "yyyy-MM-dd", { locale: ko })
                    : "-"
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">주문 상태:</span>
                <Badge className={getBadgeClass('orderStatus', order.order_status)}>
                  {getLabel('orderStatus', order.order_status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">총 금액:</span>
                <span className="text-xl font-bold text-blue-600">
                  {order.total_price.toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">품목:</span>
                <span className="text-sm text-gray-600 max-w-[200px] truncate">
                  {order.items?.length ? `${order.items.length}개 품목` : '품목 없음'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 결제 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">결제 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 결제 상태 표시 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">결제 상태</Label>
                <div className="flex items-center gap-3">
                  <Badge 
                    className={order.order_status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                  >
                    {order.order_status === 'ready' ? '✅ 결제 완료' : '⏳ 결제 대기'}
                  </Badge>
                  {order.order_status === 'ready' && (
                    <span className="text-sm text-green-600 font-medium">
                      주문 상태: 출고준비
                    </span>
                  )}
                </div>
              </div>

              {/* 결제 방법 선택 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">결제 방법</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('card')}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="text-sm">카드</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Banknote className="h-6 w-6" />
                    <span className="text-sm">현금</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Building2 className="h-6 w-6" />
                    <span className="text-sm">계좌이체</span>
                  </Button>
                </div>
              </div>

              {/* 토스페이먼츠 결제창 (API 개별 연동 키용) */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">결제 수단</Label>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700">
                      <CreditCard className="h-5 w-5" />
                      <span className="text-sm font-medium">카드 결제</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      결제 버튼을 클릭하면 토스페이먼츠 결제창이 열립니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 수동 결제 정보 입력 */}
              {paymentMethod !== 'card' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payerName" className="text-sm font-medium">
                      입금자명
                    </Label>
                    <Input
                      id="payerName"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="입금자명을 입력하세요"
                      className="mt-1"
                    />
                  </div>
                  
                  {paymentMethod === 'bank_transfer' && (
                    <div>
                      <Label htmlFor="bankName" className="text-sm font-medium">
                        은행명
                      </Label>
                      <Input
                        id="bankName"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="은행명을 입력하세요"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 결제 버튼 */}
              <div className="pt-4">
                 {paymentMethod === 'card' ? (
                   <div className="space-y-3">
                     {order.order_status === 'ready' ? (
                       <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                         <div className="text-green-700 font-medium mb-2">🎉 결제가 완료되었습니다!</div>
                         <div className="text-sm text-green-600">주문 상태가 출고준비로 변경되었습니다.</div>
                       </div>
                     ) : (
                       <Button
                         onClick={handleCardPayment}
                         disabled={processingPayment || !isWidgetReady}
                         className="w-full bg-blue-600 hover:bg-blue-700"
                       >
                         {processingPayment ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                             카드 결제 처리 중...
                           </>
                         ) : (
                           <>
                             <CreditCard className="h-4 w-4 mr-2" />
                             카드로 결제하기
                           </>
                         )}
                       </Button>
                     )}
                     
                     {/* 강제로 상태 초기화하는 버튼 추가 */}
                     {processingPayment && (
                       <Button
                         onClick={() => setProcessingPayment(false)}
                         variant="outline"
                         className="w-full"
                       >
                         결제 상태 초기화
                       </Button>
                     )}
                   </div>
		      ) : (
		        <Button
		          onClick={handleManualPayment}
		          disabled={processingPayment}
		          className="w-full bg-green-600 hover:bg-green-700"
		        >
		          {processingPayment ? (
		            <>
		              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
		              결제 처리 중...
		            </>
		          ) : (
		            <>
		              <Banknote className="h-4 w-4 mr-2" />
		              {paymentMethod === 'cash' ? '현금 결제 완료' : '계좌이체 완료'}
		            </>
		          )}
		        </Button>
		      )}
		    </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage
