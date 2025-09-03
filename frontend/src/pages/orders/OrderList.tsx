/**
 * 주문 목록 페이지
 * 주문 내역을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { 
  CalendarDays, 
  Plus, 
  Eye, 
  CreditCard,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Ban,
  AlertTriangle
} from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import { Label } from "../../components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { OrderListItem, Business } from "../../types"
import { orderApi, paymentApi, businessApi } from "../../lib/api"
import toast from 'react-hot-toast'
import OrderForm from "./OrderForm"
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/common/StatusBadges"
import { getLabel } from "../../lib/labels"
import RefundCancelModal from "../../components/modals/RefundCancelModal"
import StockShortageModal from "../../components/modals/StockShortageModal"

// 금액 포맷팅 (한국 통화 형식, 소수점 없이)
const formatPrice = (price: number) => {
  // 정수로 변환하여 소수점 제거 후 한국 통화 형식으로 포맷팅
  return new Intl.NumberFormat('ko-KR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(price))
}

const OrderList: React.FC = () => {
  const navigate = useNavigate()
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [date, setDate] = useState<Date>()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [businessFilter, setBusinessFilter] = useState<string>("all")
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessLoading, setBusinessLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // 환불/취소 모달 상태
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [processingRefund, setProcessingRefund] = useState(false)
  const [processingCancel, setProcessingCancel] = useState(false)

  // 거래처 목록 가져오기
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setBusinessLoading(true)
        const response = await businessApi.getAll({ page_size: 1000 }) // 모든 거래처 가져오기
        
        
        // Django 페이지네이션 응답 구조 처리
        if (response.results && Array.isArray(response.results)) {
          // Django 페이지네이션 응답: {count, next, previous, results}
          setBusinesses(response.results)
        } else {
          setBusinesses([])
        }
      } catch (error) {
        setBusinesses([])
      } finally {
        setBusinessLoading(false)
      }
    }

    fetchBusinesses()
  }, [])

  // 주문 목록 가져오기 (orderApi 사용 - 백엔드 페이지네이션, 필터링, 검색)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        
        // API 요청 파라미터 구성
        const params: any = {
          page: currentPage,
          page_size: itemsPerPage
        }
        
        // 필터 파라미터 추가
        if (statusFilter !== 'all') {
          params.status = statusFilter
        }
        
        if (paymentStatusFilter !== 'all') {
          params.payment_status = paymentStatusFilter
        }
        
        if (date) {
          params.date = date.toISOString().split('T')[0] // YYYY-MM-DD 형식
        }
        
        if (businessFilter !== 'all') {
          params.business_id = businessFilter
        }
        
        const response = await orderApi.getAll(params)
        
        // 백엔드 페이지네이션 응답 처리
        if (response.pagination) {
          setOrders(response.data || [])
          setTotalCount(response.pagination.total_count)
          setTotalPages(response.pagination.total_pages)
        } else {
          // 기존 형식 호환성
          const ordersData = response.data || []
          setOrders(Array.isArray(ordersData) ? ordersData : [])
        }
      } catch (error) {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [currentPage, itemsPerPage, statusFilter, paymentStatusFilter, date, businessFilter])

  // 필터 변경 시 첫 페이지로 이동 (데이터는 위의 useEffect에서 자동으로 새로고침됨)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [statusFilter, paymentStatusFilter, date, businessFilter])

  // 현재 페이지 데이터는 이미 백엔드에서 필터링되어 옴
  const currentOrders = orders
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  // 새 주문 처리
  const handleNewOrder = (orderData: any) => {
    // PostgreSQL에서 자동 생성된 ID를 우선 사용
    if (!orderData.id && !orderData.order_id) {
      toast.error('주문 ID를 받아올 수 없습니다.')
      return
    }
    
    // 주문이 성공적으로 생성되었으므로 전체 목록을 새로고침
    const refreshOrders = async () => {
      try {
        // API 요청 파라미터 구성
        const params: any = {
          page: currentPage,
          page_size: itemsPerPage
        }
        
        // 현재 필터 상태 적용
        if (statusFilter !== 'all') {
          params.status = statusFilter
        }
        
        if (paymentStatusFilter !== 'all') {
          params.payment_status = paymentStatusFilter
        }
        
        if (date) {
          params.date = date.toISOString().split('T')[0]
        }
        
        if (businessFilter !== 'all') {
          params.business_id = businessFilter
        }
        
        const response = await orderApi.getAll(params)
        
        if (response.pagination) {
          setOrders(response.data || [])
          setTotalCount(response.pagination.total_count)
          setTotalPages(response.pagination.total_pages)
        } else {
          const ordersData = response.data || []
          setOrders(Array.isArray(ordersData) ? ordersData : [])
        }
        setShowOrderForm(false)
      } catch (error) {
        toast.error('주문 목록을 새로고침하는데 실패했습니다.')
      }
    }
    
    refreshOrders()
  }



  // 상세보기 처리
  const handleViewDetail = (orderId: number) => {
    if (!orderId || orderId === undefined || isNaN(orderId)) {
      toast.error('주문 ID가 올바르지 않습니다.')
      return
    }
    navigate(`/orders/${orderId}`)
  }

  // 결제 처리
  const handlePayment = (orderId: number) => {
    navigate(`/orders/${orderId}/payment`)
  }

  // 환불 처리
  const handleRefund = (orderId: number) => {
    setSelectedOrderId(orderId)
    setShowRefundModal(true)
  }

  // 주문 취소
  const handleCancel = (orderId: number) => {
    setSelectedOrderId(orderId)
    setShowCancelModal(true)
  }

  // 환불 처리 실행
  const executeRefund = async (reason: string, detail: string) => {
    if (!selectedOrderId) return

    try {
      setProcessingRefund(true)
      await paymentApi.refund({
        orderId: selectedOrderId,
        refundReason: reason,
        refundReasonDetail: detail
      })
      
      toast.success('환불이 성공적으로 처리되었습니다!')
      setShowRefundModal(false)
      
      // 주문 목록 새로고침 (현재 필터 상태 유지)
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      if (paymentStatusFilter !== 'all') {
        params.payment_status = paymentStatusFilter
      }
      
      if (date) {
        params.date = date.toISOString().split('T')[0]
      }
      
      if (businessFilter !== 'all') {
        params.business_id = businessFilter
      }
      
      const response = await orderApi.getAll(params)
      
      if (response.pagination) {
        setOrders(response.data || [])
        setTotalCount(response.pagination.total_count)
        setTotalPages(response.pagination.total_pages)
      } else {
        const ordersData = response.data || []
        setOrders(Array.isArray(ordersData) ? ordersData : [])
      }
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || '환불 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingRefund(false)
    }
  }

  // 주문 취소 실행
  const executeCancel = async (reason: string, detail: string) => {
    if (!selectedOrderId) return

    try {
      setProcessingCancel(true)
      await paymentApi.cancelOrder({
        orderId: selectedOrderId,
        cancelReason: reason,
        cancelReasonDetail: detail
      })
      
      toast.success('주문이 성공적으로 취소되었습니다!')
      setShowCancelModal(false)
      
      // 주문 목록 새로고침 (현재 필터 상태 유지)
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      if (paymentStatusFilter !== 'all') {
        params.payment_status = paymentStatusFilter
      }
      
      if (date) {
        params.date = date.toISOString().split('T')[0]
      }
      
      if (businessFilter !== 'all') {
        params.business_id = businessFilter
      }
      
      const response = await orderApi.getAll(params)
      
      if (response.pagination) {
        setOrders(response.data || [])
        setTotalCount(response.pagination.total_count)
        setTotalPages(response.pagination.total_pages)
      } else {
        const ordersData = response.data || []
        setOrders(Array.isArray(ordersData) ? ordersData : [])
      }
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || '주문 취소 중 오류가 발생했습니다.')
    } finally {
      setProcessingCancel(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 -mx-4 sm:-mx-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">주문 목록</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">주문 내역 조회 및 관리</p>
          </div>
          <Button 
            onClick={() => setShowOrderForm(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            새 주문 등록
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        {/* 필터 바 */}
        <Card className="mb-6 -mx-4 sm:-mx-6">
          <CardHeader className="px-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              필터 및 검색
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 거래처 필터 - 가장 왼쪽 */}
              <div className="space-y-2">
                <Label htmlFor="business-filter" className="text-sm font-medium text-gray-700">
                  거래처
                </Label>
                <Select value={businessFilter} onValueChange={setBusinessFilter} disabled={businessLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={businessLoading ? "로딩 중..." : "전체 거래처"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 거래처</SelectItem>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id.toString()}>
                        {business.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 주문 상태 필터 */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                  주문 상태
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="placed">{getLabel('orderStatus', 'placed')}</SelectItem>
                    <SelectItem value="ready">{getLabel('orderStatus', 'ready')}</SelectItem>
                    <SelectItem value="delivered">{getLabel('orderStatus', 'delivered')}</SelectItem>
                    <SelectItem value="cancelled">{getLabel('orderStatus', 'cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 결제 상태 필터 */}
              <div className="space-y-2">
                <Label htmlFor="payment-status-filter" className="text-sm font-medium text-gray-700">
                  결제 상태
                </Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="pending">미결제</SelectItem>
                    <SelectItem value="paid">결제 완료</SelectItem>
                    <SelectItem value="refunded">환불됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 날짜 필터 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">주문일자</Label>
                  {date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDate(undefined)}
                      className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      초기화
                    </Button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {date ? format(date, "yyyy-MM-dd", { locale: ko }) : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 테이블 */}
        <Card className="-mx-4 sm:-mx-6">
          <CardHeader className="px-6">
            <CardTitle className="flex items-center justify-between">
              <span>주문 목록</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">번호</TableHead>
                    <TableHead className="font-semibold text-gray-900">거래처명</TableHead>
                    <TableHead className="font-semibold text-gray-900">주문일자</TableHead>
                    <TableHead className="font-semibold text-gray-900">납기일</TableHead>
                    <TableHead className="font-semibold text-gray-900">품목 요약</TableHead>
                    <TableHead className="font-semibold text-gray-900">총금액</TableHead>
                    <TableHead className="font-semibold text-gray-900">결제 상태</TableHead>
                    <TableHead className="font-semibold text-gray-900">주문 상태</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>주문 목록을 불러오는 중입니다...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        조회된 주문이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentOrders.map((order, index) => (
                      <TableRow 
                        key={order.id} 
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${order.has_stock_issues ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}
                        onClick={() => handleViewDetail(order.id)}
                      >
                        <TableCell className="font-medium text-gray-900">
                          {totalCount - startIndex - index}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="font-semibold text-gray-900">
                            {order.business?.business_name || '거래처명 없음'}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {format(new Date(order.order_datetime), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {order.delivery_datetime ? format(new Date(order.delivery_datetime), "yyyy-MM-dd") : "-"}
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-[250px]">
                          <div className="flex items-start gap-2">
                            {order.has_stock_issues && (
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 overflow-hidden">
                              {order.items_summary.split('\n').map((item: string, idx: number) => (
                                <div 
                                  key={idx}
                                  className="truncate text-sm"
                                  title={item}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {formatPrice(order.total_price)}원
                        </TableCell>
                        <TableCell>
                          {/* 결제 상태 표시 */}
                          {order.payment ? (
                            <PaymentStatusBadge status={order.payment.payment_status} />
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-300">
                              미결제
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {/* 주문 상태 표시 */}
                          <OrderStatusBadge status={order.order_status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* 결제 버튼 - 미결제 상태이고 취소되지 않은 주문일 때만 표시 */}
                            {(!order.payment || order.payment.payment_status !== 'paid') && 
                             order.order_status !== 'cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePayment(order.id)
                                }}
                                className="border-green-600 text-green-600 hover:bg-green-50"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                결제
                              </Button>
                            )}

                            {/* 결제 취소 버튼 - 결제 완료 상태일 때만 표시 */}
                            {order.payment?.payment_status === 'paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRefund(order.id)
                                }}
                                className="border-orange-600 text-orange-600 hover:bg-orange-50"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                결제취소
                              </Button>
                            )}

                            {/* 주문 취소 버튼 - 결제되지 않았거나 대기 상태일 때만 표시 */}
                            {(!order.payment || order.payment.payment_status === 'pending') && 
                             order.order_status !== 'cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancel(order.id)
                                }}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                취소
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  {startIndex + 1} - {endIndex} / {totalCount}건
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  
                  {(() => {
                    // 페이지 번호를 최대 15개까지만 표시
                    const maxVisiblePages = 15
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                    
                    // 끝에서부터 계산해서 시작 페이지 조정
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }
                    
                    const pages = []
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i)
                    }
                    
                    return pages.map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))
                  })()}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 주문 폼 모달 */}
      {showOrderForm && (
        <OrderForm
          onClose={() => setShowOrderForm(false)}
          onSubmit={handleNewOrder}
        />
      )}

      {/* 환불/취소 모달 */}
      <RefundCancelModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onSubmit={executeRefund}
        type="refund"
        orderId={selectedOrderId || 0}
        businessName={orders.find(o => o.id === selectedOrderId)?.business?.business_name || ''}
        itemsSummary={orders.find(o => o.id === selectedOrderId)?.items_summary || ''}
        isLoading={processingRefund}
      />

      <RefundCancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={executeCancel}
        type="cancel"
        orderId={selectedOrderId || 0}
        businessName={orders.find(o => o.id === selectedOrderId)?.business?.business_name || ''}
        itemsSummary={orders.find(o => o.id === selectedOrderId)?.items_summary || ''}
        isLoading={processingCancel}
      />
    </div>
  )
}

export default OrderList 