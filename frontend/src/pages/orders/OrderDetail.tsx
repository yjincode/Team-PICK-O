/**
 * 주문 상세 정보 페이지
 * 
 * URL 매개변수로 받은 주문 ID를 통해 주문 상세 정보를 표시합니다.
 */
import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { ArrowLeft, CreditCard, Banknote, Building2 } from "lucide-react"
import { format } from "date-fns"
import { formatPhoneNumber } from "../../utils/phoneFormatter"
import { orderApi } from "../../lib/api"
import { getBadgeClass, getLabel } from "../../lib/labels"
import toast from 'react-hot-toast'

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [processingRefund, setProcessingRefund] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [processingCancel, setProcessingCancel] = useState(false)
  // const [isEditing, setIsEditing] = useState(false)
  // const [editingData, setEditingData] = useState<any>(null)
  // const [processingEdit, setProcessingEdit] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        console.log('주문 상세 조회 시작:', id)
        const response = await orderApi.getById(parseInt(id))
        console.log('주문 상세 응답:', response)
        setOrder(response)
      } catch (error) {
        console.error('주문 정보 조회 실패:', error)
        toast.error('주문 정보를 불러올 수 없습니다.')
        navigate('/orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id, navigate])

  const handleManualPaymentComplete = async () => {
    if (!order || !order.payment) return
    
    try {
      setProcessingPayment(true)
      
      // 토큰 가져오기
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('로그인이 필요합니다.')
        navigate('/login')
        return
      }
      
      const response = await fetch('/api/v1/payments/manual/complete/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          method: order.payment.method,
          amount: order.payment.amount || order.total_price
        })
      })
      
      if (response.ok) {
        toast.success('결제가 완료되었습니다.')
        const updatedOrder = await orderApi.getById(parseInt(id!))
        setOrder(updatedOrder)
      } else if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
        navigate('/login')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '결제 완료 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('결제 완료 처리 오류:', error)
      toast.error('결제 완료 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleRefund = async () => {
    if (!order || !order.payment || !refundReason.trim()) return
    
    try {
      setProcessingRefund(true)
      
      // 토큰 가져오기
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('로그인이 필요합니다.')
        navigate('/login')
        return
      }
      
      const response = await fetch('/api/v1/payments/refund/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_id: order.payment.id,
          refund_reason: refundReason
        })
      })
      
      if (response.ok) {
        toast.success('환불이 처리되었습니다.')
        const updatedOrder = await orderApi.getById(parseInt(id!))
        setOrder(updatedOrder)
        setShowRefundModal(false)
        setRefundReason('')
      } else if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
        navigate('/login')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '환불 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('환불 처리 오류:', error)
      toast.error('환불 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingRefund(false)
    }
  }

  const handleShipOut = async () => {
    if (!order) return
    
    try {
      setProcessingPayment(true)
      
      // 토큰 가져오기
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('로그인이 필요합니다.')
        navigate('/login')
        return
      }
      
      const response = await fetch(`/api/v1/orders/${order.id}/ship-out/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        toast.success('출고가 처리되었습니다.')
        const updatedOrder = await orderApi.getById(parseInt(id!))
        setOrder(updatedOrder)
      } else if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
        navigate('/login')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '출고 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('출고 처리 오류:', error)
      toast.error('출고 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleCancel = async () => {
    if (!order || !cancelReason.trim()) return
    
    try {
      setProcessingCancel(true)
      
      // 토큰 가져오기
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('로그인이 필요합니다.')
        navigate('/login')
        return
      }
      
      const response = await fetch('/api/v1/orders/cancel/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          cancel_reason: cancelReason
        })
      })
      
      if (response.ok) {
        toast.success('주문이 취소되었습니다.')
        const updatedOrder = await orderApi.getById(parseInt(id!))
        setOrder(updatedOrder)
        setShowCancelModal(false)
        setCancelReason('')
      } else if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
        navigate('/login')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '주문 취소에 실패했습니다.')
      }
    } catch (error) {
      console.error('주문 취소 오류:', error)
      toast.error('주문 취소 중 오류가 발생했습니다.')
    } finally {
      setProcessingCancel(false)
    }
  }

  // const handleEditOrder = () => {
  //   setEditingData({
  //     business_id: order.business?.id || order.business_id,
  //     delivery_datetime: order.delivery_datetime,
  //     memo: order.memo || '',
  //     is_urgent: order.is_urgent || false,
  //     order_items: order.items?.map((item: any) => ({
  //       fish_type_id: item.fish_type?.id || item.fish_type_id,
  //       quantity: item.quantity,
  //       unit_price: item.unit_price,
  //       unit: item.unit,
  //       remarks: item.remarks || ''
  //     })) || []
  //   })
  //   setIsEditing(true)
  // }

  // const handleCancelEdit = () => {
  //   setIsEditing(false)
  //   setEditingData(null)
  // }

  // const handleUpdateOrder = async () => {
  //   if (!order || !editingData) return
  //   
  //   try {
  //     setProcessingEdit(true)
  //     
  //     // 토큰 가져오기
  //     const token = localStorage.getItem('access_token')
  //     if (!token) {
  //       toast.error('로그인이 필요합니다.')
  //       navigate('/login')
  //       return
  //     }
  //     
  //     const response = await fetch(`/api/v1/orders/${order.id}/update/`, {
  //       method: 'PUT',
  //       headers: { 
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       },
  //       body: JSON.stringify(editingData)
  //     })
  //     
  //     if (response.ok) {
  //       toast.success('주문이 성공적으로 수정되었습니다.')
  //       const updatedOrder = await orderApi.getById(parseInt(id!))
  //       setOrder(updatedOrder)
  //       setIsEditing(false)
  //       setEditingData(null)
  //     } else if (response.status === 401) {
  //       toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
  //       navigate('/login')
  //       return
  //     } else {
  //       errorData = await response.json()
  //       toast.error(errorData.error || '주문 수정에 실패했습니다.')
  //     }
  //   } catch (error) {
  //     console.error('주문 수정 오류:', error)
  //     toast.error('주문 수정 중 오류가 발생했습니다.')
  //     return
  //   } finally {
  //     setProcessingEdit(false)
  //   }
  // }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p>주문 정보를 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/orders')} className="mt-4">
          주문 목록으로 돌아가기
        </Button>
      </div>
    )
  }

  const getStatusText = (status: string) => getLabel('orderStatus', status)
  const getStatusColor = (status: string) => getBadgeClass('orderStatus', status)

  const totalAmount = order.total_price || order.items?.reduce((sum: number, item: any) => 
    sum + (item.quantity * (item.unit_price || 0)), 0
  ) || 0

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">
            주문 상세 정보 #{order.id}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/orders')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">거래처 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">거래처명:</span>
                  <span className="ml-2">{order.business_name || "정보 없음"}</span>
                </div>
                <div>
                  <span className="font-medium">연락처:</span>
                  <span className="ml-2">{order.business_phone ? formatPhoneNumber(order.business_phone) : "정보 없음"}</span>
                </div>
                <div>
                  <span className="font-medium">주소:</span>
                  <span className="ml-2">{order.business_address || "정보 없음"}</span>
                </div>
              </CardContent>
            </Card>

                         <Card>
               <CardHeader>
                 <CardTitle className="text-lg">주문 정보</CardTitle>
               </CardHeader>
               <CardContent className="space-y-2">
                 <div>
                   <span className="font-medium">주문일시:</span>
                   <span className="ml-2">
                     {format(new Date(order.order_datetime), "yyyy-MM-dd HH:mm")}
                   </span>
                 </div>
                 <div>
                   <span className="font-medium">배송일:</span>
                   <span className="ml-2">
                     {order.delivery_datetime ? format(new Date(order.delivery_datetime), "yyyy-MM-dd") : "미정"}
                   </span>
                 </div>
                 <div>
                   <span className="font-medium">주문 상태:</span>
                   <Badge className={`ml-2 ${getStatusColor(order.order_status)}`}>
                     {getStatusText(order.order_status)}
                   </Badge>
                 </div>
                 <div>
                   <span className="font-medium">긴급 주문:</span>
                   {order.is_urgent && (
                     <Badge className="ml-2 bg-red-100 text-red-800">
                       🚨 긴급 주문
                     </Badge>
                   )}
                 </div>
               </CardContent>
             </Card>
          </div>

          {/* 주문 항목 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문 항목</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">품목</th>
                      <th className="text-right p-2">수량</th>
                      <th className="text-right p-2">단가</th>
                      <th className="text-right p-2">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          {item.fish_type_name || item.item_name_snapshot || "어종명 없음"}
                          {item.remarks && (
                            <div className="text-sm text-gray-500">비고: {item.remarks}</div>
                          )}
                        </td>
                        <td className="text-right p-2">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="text-right p-2">
                          {item.unit_price?.toLocaleString()}원
                        </td>
                        <td className="text-right p-2 font-medium">
                          {(item.quantity * item.unit_price).toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={3} className="p-2 font-bold text-right">총 금액:</td>
                      <td className="p-2 font-bold text-right text-blue-600">
                        {totalAmount.toLocaleString()}원
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

                     {/* 메모 */}
           {order.memo && (
             <Card>
               <CardHeader>
                 <CardTitle className="text-lg">메모</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-gray-700 whitespace-pre-wrap">{order.memo}</p>
               </CardContent>
             </Card>
           )}

          {/* 원본 텍스트 */}
          {order.transcribed_text && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">원본 텍스트</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{order.transcribed_text}</p>
              </CardContent>
            </Card>
          )}

          {/* 결제 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">결제 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.payment ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">결제 상태:</span>
                    <Badge className={getBadgeClass('paymentStatus', order.payment.payment_status)}>
                      {getLabel('paymentStatus', order.payment.payment_status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">결제 수단:</span>
                    <div className="flex items-center space-x-2">
                      {order.payment.method === 'card' && <CreditCard className="h-4 w-4" />}
                      {order.payment.method === 'cash' && <Banknote className="h-4 w-4" />}
                      {order.payment.method === 'bank_transfer' && <Building2 className="h-4 w-4" />}
                      <span className="capitalize">{getLabel('paymentMethod', order.payment.method)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">결제 금액:</span>
                    <span className="font-bold text-blue-600">
                      {order.payment.amount?.toLocaleString()}원
                    </span>
                  </div>
                  {order.payment.paid_at && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">결제 완료 시각:</span>
                      <span>{format(new Date(order.payment.paid_at), "yyyy-MM-dd HH:mm")}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  결제 정보가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
           <div className="flex justify-end space-x-3 pt-4">
             {/* 편집 모드일 때 저장/취소 버튼 (임시 주석처리) */}
             {/* {isEditing ? (
               <>
                 <Button 
                   onClick={handleCancelEdit}
                   variant="outline"
                   className="border-gray-600 text-gray-600 hover:bg-gray-50"
                   disabled={processingEdit}
                 >
                   편집 취소
                 </Button>
                 <Button 
                   onClick={handleUpdateOrder}
                   className="bg-blue-600 hover:bg-blue-700"
                   disabled={processingEdit}
                 >
                   {processingEdit ? '저장 중...' : '저장'}
                 </Button>
               </>
             ) : null} */}
            
            {!order.payment || order.payment.payment_status !== 'paid' ? (
              <Button onClick={() => navigate(`/orders/${order.id}/payment`)} className="bg-blue-600 hover:bg-blue-700">
                결제하기
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => handleManualPaymentComplete()} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={order.payment.payment_status === 'paid' || processingPayment}
                >
                  {order.payment.payment_status === 'paid' ? '결제 완료됨' : '결제 완료 처리'}
                </Button>
                
                {/* 환불 버튼 - 결제 완료 상태일 때만 표시 */}
                {order.payment.payment_status === 'paid' && (
                  <Button 
                    onClick={() => setShowRefundModal(true)}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    환불 처리
                  </Button>
                )}
                
                {/* 출고 처리 버튼 - 출고 준비 상태이고 결제 완료일 때만 표시 */}
                {order.order_status === 'ready' && order.payment?.payment_status === 'paid' && (
                  <Button 
                    onClick={handleShipOut}
                    variant="outline"
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    disabled={processingPayment}
                  >
                    {processingPayment ? '처리 중...' : '출고 처리'}
                  </Button>
                )}
                
                {/* 주문 취소 버튼 - 취소 가능한 상태일 때만 표시 */}
                {(order.order_status === 'placed' || 
                  (order.order_status === 'ready' && !order.ship_out_datetime)) && (
                  <Button 
                    onClick={() => setShowCancelModal(true)}
                    variant="outline"
                    className="border-gray-600 text-gray-600 hover:bg-gray-50"
                  >
                    주문 취소
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 환불 모달 */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">환불 처리</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  환불 사유
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="환불 사유를 입력해주세요"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRefundModal(false)
                    setRefundReason('')
                  }}
                  disabled={processingRefund}
                >
                  취소
                </Button>
                <Button
                  onClick={handleRefund}
                  disabled={!refundReason.trim() || processingRefund}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processingRefund ? '처리 중...' : '환불 처리'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 주문 취소 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">주문 취소</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  취소 사유
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="취소 사유를 입력해주세요"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(false)
                    setCancelReason('')
                  }}
                  disabled={processingCancel}
                >
                  취소
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={!cancelReason.trim() || processingCancel}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processingCancel ? '처리 중...' : '주문 취소'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

export default OrderDetail
