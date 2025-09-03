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
import { ArrowLeft, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { formatPhoneNumber } from "../../utils/phoneFormatter"
import { orderApi, paymentApi, requestDocument, getDocumentRequests } from "../../lib/api"
import { getBadgeClass, getLabel } from "../../lib/labels"
import StockShortageModal from "../../components/modals/StockShortageModal"
import toast from 'react-hot-toast'
import DocumentRequestModal from "../../components/modals/DocumentRequestModal"

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [processingCancel, setProcessingCancel] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<{
    delivery_datetime: string;
    ship_out_datetime: string | null;
    source_type: "manual" | "voice" | "text";
    memo: string;
    is_urgent: boolean;
    order_items: Array<{
      id?: number;
      fish_type_id?: number;
      fish_type_name: string;
      quantity: number;
      unit_price: number;
      unit: string;
      remarks: string;
    }>;
  } | null>(null)
  const [processingEdit, setProcessingEdit] = useState(false)
  
  // 출고 처리 확인 모달 상태
  const [showShipOutModal, setShowShipOutModal] = useState(false)
  
  // 환불 처리 상태
  const [processingRefund, setProcessingRefund] = useState(false)
  
  // 주문 항목 수정 모달 상태
  const [showItemEditModal, setShowItemEditModal] = useState(false)
  const [editingItems, setEditingItems] = useState<any[]>([])
  
  // 재고 부족 모달 상태
  const [showStockShortageModal, setShowStockShortageModal] = useState(false)
  const [insufficientItems, setInsufficientItems] = useState<any[]>([])
  const [shortageActionType, setShortageActionType] = useState<'ready' | 'delivered'>('ready')

  // 문서 발급 요청 관련 상태
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [documentModalType, setDocumentModalType] = useState<'tax_invoice' | 'cash_receipt'>('tax_invoice')
  const [processingDocument, setProcessingDocument] = useState(false)
  const [documentRequests, setDocumentRequests] = useState<{
    tax_invoice?: { id: number; status: string }
    cash_receipt?: { id: number; status: string }
  }>({})

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        const response = await orderApi.getById(parseInt(id))
        setOrder(response)
        
        // 기존 문서 요청 정보 조회
        await fetchDocumentRequests(parseInt(id))
      } catch (error) {
        toast.error('주문 정보를 불러올 수 없습니다.')
        navigate('/orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id, navigate])

  // 문서 요청 정보 조회 함수
  const fetchDocumentRequests = async (orderId: number) => {
    try {
      const response = await getDocumentRequests(orderId)
      setDocumentRequests(response)
    } catch (error) {
      // 오류 발생 시 빈 객체로 설정
      setDocumentRequests({})
    }
  }

  const handleShipOut = async () => {
    if (!order) return
    
    try {
      setLoading(true)
      
      await orderApi.shipOut(order.id)
      toast.success('출고가 처리되었습니다.')
      
      // 주문 정보 다시 조회하여 업데이트
      const updatedOrder = await orderApi.getById(parseInt(id!))
      setOrder(updatedOrder)
      
    } catch (error: any) {
      
      // 재고 부족 에러인 경우 모달 표시
      if (error.response?.data?.error_type === 'insufficient_stock') {
        setInsufficientItems(error.response.data.insufficient_items || [])
        setShortageActionType('delivered')
        setShowStockShortageModal(true)
      } else {
        toast.error(error.response?.data?.error || '출고 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReadyOrder = async () => {
    if (!order) return
    
    try {
      setLoading(true)
      
      await orderApi.updateStatus(order.id, 'ready')
      toast.success('주문이 준비 완료 상태로 변경되었습니다.')
      
      // 주문 정보 다시 조회하여 업데이트
      const updatedOrder = await orderApi.getById(parseInt(id!))
      setOrder(updatedOrder)
      
    } catch (error: any) {
      
      // 재고 부족 에러인 경우 모달 표시
      if (error.response?.data?.error_type === 'insufficient_stock') {
        setInsufficientItems(error.response.data.insufficient_items || [])
        setShortageActionType('ready')
        setShowStockShortageModal(true)
      } else {
        toast.error(error.response?.data?.error || '상태 변경 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRevertToPlaced = async () => {
    if (!order) return
    
    try {
      setLoading(true)
      
      await orderApi.updateStatus(order.id, 'ready')
      toast.success('주문이 등록 상태로 되돌아갔습니다.')
      
      // 주문 정보 다시 조회하여 업데이트
      const updatedOrder = await orderApi.getById(parseInt(id!))
      setOrder(updatedOrder)
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || '상태 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 문서 발급 요청 처리
  const handleDocumentRequest = async (data: {
    documentType: 'tax_invoice' | 'cash_receipt'
    receiptType?: 'individual' | 'business'
    identifier: string
    specialRequest: string
  }) => {
    if (!order) return

    setProcessingDocument(true)
    try {
      
      const response = await requestDocument(order.id, {
        orderId: order.id,
        documentType: data.documentType,
        receiptType: data.receiptType,
        identifier: data.identifier,
        specialRequest: data.specialRequest
      })

      toast.success('문서 발급 요청이 성공적으로 처리되었습니다!')
      setShowDocumentModal(false)

      // 문서 발급 요청 정보 저장
      setDocumentRequests(prev => {
        const newState = {
          ...prev,
          [data.documentType]: {
            id: response.document_request_id,
            status: response.status
          }
        }
        return newState
      })
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || '문서 발급 요청 중 오류가 발생했습니다.')
    } finally {
      setProcessingDocument(false)
    }
  }

  // 세금계산서 요청 모달 열기
  const openTaxInvoiceModal = () => {
    setDocumentModalType('tax_invoice')
    setShowDocumentModal(true)
  }

  // 현금영수증 요청 모달 열기
  const openCashReceiptModal = () => {
    setDocumentModalType('cash_receipt')
    setShowDocumentModal(true)
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
      toast.error('주문 취소 중 오류가 발생했습니다.')
    } finally {
      setProcessingCancel(false)
    }
  }

  // 결제 롤백(취소) 처리
  const handlePaymentRollback = async () => {
    if (!order) return
    
    // 사용자 확인
    const confirmRollback = confirm(
      `주문 #${order.id}의 결제를 취소하시겠습니까?\n\n` +
      `• 결제 금액: ₩${order.total_price.toLocaleString()}\n` +
      `• 주문 상태: 출고준비 → 주문완료 (결제 대기)\n\n` +
      `⚠️ 실수로 결제한 경우에만 사용해주세요.\n` +
      `이 작업은 되돌릴 수 없습니다.`
    )
    
    if (!confirmRollback) return
    
    // 취소 사유 입력
    const cancelReason = prompt('결제 취소 사유를 입력해주세요:', '실수로 결제함')
    if (!cancelReason || cancelReason.trim() === '') {
      toast.error('취소 사유를 입력해주세요.')
      return
    }
    
    try {
      setProcessingRefund(true)
      
      const response = await paymentApi.rollback({
        orderId: order.id,
        rollbackReason: cancelReason.trim()
      })
      
      if (response.data) {
        toast.success('결제가 성공적으로 취소되었습니다. 주문 상태가 결제 대기로 변경되었습니다.')
        // 주문 정보 새로고침
        const updatedOrder = await orderApi.getById(parseInt(id!))
        setOrder(updatedOrder)
      }
      
    } catch (error: any) {
      console.error('결제 취소 오류:', error)
      const errorMessage = error.response?.data?.error || '결제 취소 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setProcessingRefund(false)
    }
  }

  const handleEditOrder = () => {
    // 날짜 데이터 안전하게 처리
    const formatDateForInput = (dateString?: string | null): string => {
      if (!dateString) return ''
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ''
        // YYYY-MM-DD 형식으로 변환
        return date.toISOString().split('T')[0]
      } catch (error) {
        return ''
      }
    }

    setEditingData({
      delivery_datetime: formatDateForInput(order.delivery_datetime),
      ship_out_datetime: formatDateForInput(order.ship_out_datetime),
      source_type: (order.source_type as "manual" | "voice" | "text") || 'manual',
      memo: order.memo || '',
      is_urgent: order.is_urgent || false,
      order_items: order.items?.map((item: any) => ({
        id: item.id,
        fish_type_id: item.fish_type_id || 1, // 기본값 설정
        fish_type_name: item.fish_type_name || item.item_name_snapshot || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit,
        remarks: item.remarks || ''
      })) || []
    })
    
    // 주문 항목 수정용 상태도 초기화
    setEditingItems(order.items?.map((item: any) => ({
      fish_type_id: item.fish_type_id || 1, // 기본값 설정
      fish_type_name: item.fish_type_name || item.item_name_snapshot || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit: item.unit,
      remarks: item.remarks || ''
    })) || [])
    
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingData(null)
  }

  const handleUpdateOrder = async () => {
    if (!order || !editingData) return
    
    try {
      setProcessingEdit(true)
      
      // 날짜 데이터를 한국 시간대로 변환
      const processedData = { ...editingData }
      
      if (processedData.delivery_datetime) {
        try {
          // 날짜 문자열 검증 및 변환
          const dateStr = processedData.delivery_datetime.trim()
          if (dateStr && dateStr !== '' && !dateStr.includes('Invalid')) {
            // YYYY-MM-DD 형식인지 확인
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const koreanDate = new Date(dateStr + 'T00:00:00+09:00')
              if (!isNaN(koreanDate.getTime())) {
                processedData.delivery_datetime = koreanDate.toISOString()
              } else {
                delete processedData.delivery_datetime
              }
            } else {
              // 이미 ISO 형식이거나 다른 형식인 경우
              const testDate = new Date(dateStr)
              if (!isNaN(testDate.getTime())) {
                processedData.delivery_datetime = testDate.toISOString()
              } else {
                delete processedData.delivery_datetime
              }
            }
          } else {
            delete processedData.delivery_datetime
          }
        } catch (error) {
          delete processedData.delivery_datetime
        }
      }
      
      if (processedData.ship_out_datetime) {
        try {
          const dateStr = processedData.ship_out_datetime.trim()
          if (dateStr && dateStr !== '' && !dateStr.includes('Invalid')) {
            const testDate = new Date(dateStr)
            if (!isNaN(testDate.getTime())) {
              processedData.ship_out_datetime = testDate.toISOString()
            } else {
              delete processedData.ship_out_datetime
            }
          } else {
            delete processedData.ship_out_datetime
          }
        } catch (error) {
          delete processedData.ship_out_datetime
        }
      }
      
      // 디버깅을 위한 로그 추가
      
      // orderApi.update 사용 (새로운 엔드포인트: /orders/{id}/update/)
      const updateResponse = await orderApi.update(order.id, processedData)
      
      toast.success('주문이 성공적으로 수정되었습니다.')
      const updatedOrder = await orderApi.getById(parseInt(id!))
      setOrder(updatedOrder)
      setIsEditing(false)
      setEditingData(null)
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
        navigate('/login')
        return
      } else {
        toast.error(error.response?.data?.error || '주문 수정에 실패했습니다.')
      }
    } finally {
      setProcessingEdit(false)
    }
  }

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
            주문 상세 정보
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
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">거래처명</span>
                  <div className="text-lg font-semibold text-gray-900">{order.business_name || "정보 없음"}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">연락처</span>
                  <div className="text-base font-medium text-gray-800">{order.business_phone ? formatPhoneNumber(order.business_phone) : "정보 없음"}</div>
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
                  <span className="font-medium">주문 상태:</span>
                  <Badge className={`ml-2 ${getStatusColor(order.order_status)}`}>
                    {getStatusText(order.order_status)}
                  </Badge>
                </div>
                
                {/* 출고 완료 상태 표시 - delivered 상태일 때 */}
                {order.order_status === 'delivered' && (
                  <div className="pt-2">
                    <Badge className="bg-green-100 text-green-800">
                      ✅ 출고 완료
                    </Badge>
                    <span className="ml-2 text-sm text-gray-600">
                      {order.ship_out_datetime && `출고일: ${format(new Date(order.ship_out_datetime), "yyyy-MM-dd HH:mm")}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 결제 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">결제 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">결제 수단:</span>
                  <span className="ml-2">
                    {order.payment_method === 'cash' && '현금'}
                    {order.payment_method === 'bank_transfer' && '계좌이체'}
                    {order.payment_method === 'card' && '카드'}
                    {!order.payment_method && '미정'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">결제 상태:</span>
                  <span className="ml-2">
                    {order.payment_status === 'paid' && '결제완료'}
                    {order.payment_status === 'pending' && '미결제'}
                    {order.payment_status === 'refunded' && '환불완료'}
                    {!order.payment_status && '미정'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">결제 금액:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {order.payment_amount ? order.payment_amount.toLocaleString() + '원' : '미정'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">결제 일시:</span>
                  <span className="ml-2">
                    {order.paid_at ? format(new Date(order.paid_at), "yyyy-MM-dd HH:mm") : '미결제'}
                  </span>
                </div>
                
                {/* 증빙/문서 버튼 - 결제 완료 후에만 노출 */}
                {order.payment_status === 'paid' && (
                  <div className="pt-2 space-y-2">
                    {/* 증빙/문서 문구 제거 */}
                    <div className="flex space-x-2">
                      {/* 카드 매출전표 버튼 제거 - 하단 액션에서만 표시 */}
                    </div>
                  </div>
                )}
                
                {/* 환불 버튼 제거 - 하단 액션바로 이동 */}
              </CardContent>
            </Card>

            {/* 주문상태 변경 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">주문상태 변경</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div>
                  <span className="font-medium">현재 상태:</span>
                  <Badge className={`ml-2 ${getStatusColor(order.order_status)}`}>
                    {getStatusText(order.order_status)}
                     </Badge>
                </div>
                
                {/* 상태 변경 버튼들 */}
                <div className="space-y-2">
                  {order.order_status === 'placed' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-green-600 text-green-600 hover:bg-green-50"
                      onClick={handleReadyOrder}
                    >
                      준비 완료로 변경
                    </Button>
                  )}
                  
                  {order.order_status === 'ready' && (
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-orange-600 text-orange-600 hover:bg-orange-50"
                        onClick={() => setShowShipOutModal(true)}
                      >
                        출고 처리
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-gray-600 text-gray-600 hover:bg-gray-50"
                        onClick={handleRevertToPlaced}
                      >
                        등록 상태로 되돌리기
                      </Button>
                    </div>
                  )}
                  
                  {order.order_status === 'delivered' && (
                    <div className="text-sm text-gray-600">
                      출고 완료된 주문입니다.
                    </div>
                  )}
                  
                  {order.order_status === 'cancelled' && (
                    <div className="text-sm text-gray-600">
                      취소된 주문입니다.
                    </div>
                   )}
                 </div>
                
                {/* 미수금 처리 섹션 */}
                {order.payment_status === 'pending' && (
                  <div className="pt-3 border-t">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">미수금 처리</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                        onClick={() => {/* TODO: 현금 결제 처리 */}}
                      >
                        현금 결제
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-green-600 text-green-600 hover:bg-green-50"
                        onClick={() => {/* TODO: 계좌이체 처리 */}}
                      >
                        계좌이체
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                        onClick={() => {/* TODO: 카드 결제 처리 */}}
                      >
                        카드 결제
                      </Button>
                    </div>
                  </div>
                )}
               </CardContent>
             </Card>
          </div>

          {/* 주문 항목 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문 항목</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                
                {/* 항목 추가/수정 버튼 */}
                <div className="flex justify-center">
                  <Button 
                    onClick={() => setShowItemEditModal(true)} 
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    + 항목 추가/수정
                  </Button>
                </div>
              </div>
            
            </CardContent>
          </Card>

                     {/* 메모 */}
            {order.memo ? (
             <Card>
               <CardHeader>
                 <CardTitle className="text-lg">메모</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-gray-700 whitespace-pre-wrap">{order.memo}</p>
               </CardContent>
             </Card>
            ) : isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">메모</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={editingData?.memo || ''}
                    onChange={(e) => setEditingData({
                      ...editingData,
                      memo: e.target.value
                    })}
                    placeholder="메모를 입력해주세요"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </CardContent>
              </Card>
            ) : null}


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

          {/* 액션 */}
          <div className="flex flex-wrap gap-3 justify-end">
                        {/* 문서 관련 버튼들 */}
                         <div className="flex flex-wrap gap-3 mb-4">
               {/* 결제 수단별 문서 버튼 */}
               {order.payment_method === 'card' && order.receipt_url && (
                 <Button variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-50">
                   카드 매출전표 보기
                 </Button>
               )}
               
               {/* 주문확인서 - 항상 표시 */}
               <Button
                 variant="outline"
                 size="sm"
                 className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                 onClick={() => navigate(`/order-confirmation/${order.id}`)}
               >
                 주문확인서
               </Button>
              
              {/* 현금영수증 요청/확인 - 결제 완료 후에만 */}
              {order.payment_method === 'cash' && order.payment_status === 'paid' && (
                   documentRequests.cash_receipt ? (
                     <Button
                       variant="outline"
                       size="sm"
                       className="border-orange-600 text-orange-600 hover:bg-orange-50"
                       onClick={() => navigate(`/cash-receipt/${order.id}`)}
                     >
                       현금영수증
                     </Button>
                   ) : (
                     <Button
                       variant="outline"
                       size="sm"
                       className="border-orange-600 text-orange-600 hover:bg-orange-50"
                       onClick={openCashReceiptModal}
                     >
                  현금영수증 요청
                </Button>
                   )
              )}
              
                 {/* 세금계산서 요청/확인 - 결제 완료 후에만 */}
              {order.payment_method === 'bank_transfer' && order.payment_status === 'paid' && (
                   documentRequests.tax_invoice ? (
                     <Button
                       variant="outline"
                       size="sm"
                       className="border-purple-600 text-purple-600 hover:bg-purple-50"
                       onClick={() => navigate(`/tax-invoice/${order.id}`)}
                     >
                       세금계산서
                     </Button>
                   ) : (
                     <Button
                       variant="outline"
                       size="sm"
                       className="border-purple-600 text-purple-600 hover:bg-purple-50"
                       onClick={openTaxInvoiceModal}
                     >
                  세금계산서 요청
                </Button>
                   )
              )}
            </div>
            
            {/* 운영 액션 버튼들 */}
            <div className="flex flex-wrap gap-3">
              {/* 수정 버튼 - 주문 취소 상태가 아닐 때만 */}
              {order.order_status !== 'cancelled' && !isEditing && (
                <Button 
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  size="sm"
                  onClick={handleEditOrder}
                >
                  수정
                </Button>
              )}
              

              
              {/* 주문 취소 - pending 상태에서만 */}
              {order.order_status === 'placed' && order.payment_status === 'pending' && (
                <Button 
                  onClick={() => setShowCancelModal(true)}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  size="sm"
                >
                  주문 취소
                </Button>
              )}
              
              {/* 결제 취소 - paid 상태에서만 */}
              {order.payment_status === 'paid' && order.order_status !== 'cancelled' && (
                <Button 
                  onClick={handlePaymentRollback}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                  size="sm"
                  disabled={processingRefund}
                >
                  {processingRefund ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-1 border-2 border-orange-600 border-t-transparent rounded-full" />
                      처리중...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      결제 취소
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
           <div className="flex justify-end space-x-3 pt-4">
             {/* 편집 모드일 때 저장/취소 버튼 */}
             {isEditing ? (
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
             ) : null}
          </div>
        </CardContent>
      </Card>

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

      {/* 출고 처리 확인 모달 */}
      {showShipOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">출고 처리 확인</h3>
            <div className="space-y-4">
              <p className="text-gray-700">
                출고 처리하면 납품 완료로 전환되고 출고일이 기록됩니다.
              </p>
              <p className="text-sm text-gray-600">
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowShipOutModal(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    setShowShipOutModal(false)
                    handleShipOut()
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  출고 처리
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* 주문 항목 수정 모달 */}
       {showItemEditModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
             <h3 className="text-lg font-semibold mb-4">주문 항목 수정</h3>
             <div className="space-y-4">
               <div className="overflow-x-auto">
                 <table className="w-full border-collapse">
                   <thead>
                     <tr className="border-b">
                       <th className="text-left p-2">품목</th>
                       <th className="text-right p-2">수량</th>
                       <th className="text-right p-2">단가</th>
                       <th className="text-right p-2">단위</th>
                       <th className="text-right p-2">비고</th>
                       <th className="text-right p-2">액션</th>
                     </tr>
                   </thead>
                   <tbody>
                     {editingItems.map((item, index) => (
                       <tr key={index} className="border-b">
                         <td className="p-2">
                           <input
                             type="text"
                             value={item.fish_type_name || ''}
                             onChange={(e) => {
                               const newItems = [...editingItems];
                               newItems[index].fish_type_name = e.target.value;
                               setEditingItems(newItems);
                             }}
                             className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           />
                         </td>
                         <td className="p-2">
                           <input
                             type="number"
                             value={item.quantity}
                             onChange={(e) => {
                               const newItems = [...editingItems]
                               newItems[index].quantity = parseInt(e.target.value) || 0
                               setEditingItems(newItems)
                             }}
                             className="w-full p-2 border border-gray-300 rounded text-right"
                           />
                         </td>
                         <td className="p-2">
                           <input
                             type="number"
                             value={item.unit_price}
                             onChange={(e) => {
                               const newItems = [...editingItems]
                               newItems[index].unit_price = parseInt(e.target.value) || 0
                               setEditingItems(newItems)
                             }}
                             className="w-full p-2 border border-gray-300 rounded text-right"
                           />
                         </td>
                         <td className="p-2">
                           <select
                             value={item.unit}
                             onChange={(e) => {
                               const newItems = [...editingItems];
                               newItems[index].unit = e.target.value;
                               setEditingItems(newItems);
                             }}
                             className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           >
                             <option value="kg">kg</option>
                             <option value="g">g</option>
                             <option value="마리">마리</option>
                             <option value="박스">박스</option>
                           </select>
                         </td>
                         <td className="p-2">
                           <input
                             type="text"
                             value={item.remarks || ''}
                             onChange={(e) => {
                               const newItems = [...editingItems]
                               newItems[index].remarks = e.target.value
                               setEditingItems(newItems)
                             }}
                             className="w-full p-2 border border-gray-300 rounded"
                           />
                         </td>
                         <td className="p-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               const newItems = editingItems.filter((_, i) => i !== index)
                               setEditingItems(newItems)
                             }}
                             className="text-red-600 border-red-600 hover:bg-red-50"
                           >
                             삭제
                           </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* 항목 추가 버튼 */}
               <div className="flex justify-center py-4">
                 <Button
                   onClick={() => {
                     const newItem = {
                       fish_type_name: '',
                       quantity: 1,
                       unit_price: 0,
                       unit: 'kg',
                       remarks: ''
                     }
                     setEditingItems([...editingItems, newItem])
                   }}
                   variant="outline"
                   size="sm"
                   className="border-green-600 text-green-600 hover:bg-green-50"
                 >
                   + 항목 추가
                 </Button>
               </div>
               
               <div className="flex justify-end space-x-3">
                 <Button
                   variant="outline"
                   onClick={() => setShowItemEditModal(false)}
                 >
                   취소
                 </Button>
                 <Button
                   onClick={() => {
                     setEditingData({
                       ...editingData,
                       order_items: editingItems
                     })
                     setShowItemEditModal(false)
                   }}
                   className="bg-blue-600 hover:bg-blue-700"
                 >
                   적용
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 재고 부족 경고 모달 */}
      <StockShortageModal
        open={showStockShortageModal}
        onOpenChange={setShowStockShortageModal}
        insufficientItems={insufficientItems}
        actionType={shortageActionType}
      />

      {/* 문서 발급 요청 모달 */}
      <DocumentRequestModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSubmit={handleDocumentRequest}
        type={documentModalType}
        orderId={order?.id || 0}
        businessName={order?.business_name || ''}
        itemsSummary={order?.items?.map((item: any) => 
          `${item.fish_type_name || item.item_name_snapshot || '어종명 없음'} ${item.quantity}${item.unit}`
        ).join(', ') || ''}
        isLoading={processingDocument}
      />


    </div>
  )
}

export default OrderDetail
