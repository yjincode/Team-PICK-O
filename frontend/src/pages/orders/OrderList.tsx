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
  Search, 
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
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { OrderListItem } from "../../types"
import { orderApi, paymentApi } from "../../lib/api"
import toast from 'react-hot-toast'
import OrderForm from "./OrderForm"
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/common/StatusBadges"
import { getLabel } from "../../lib/labels"
import RefundCancelModal from "../../components/modals/RefundCancelModal"

// 금액 포맷팅
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price)
}

const OrderList: React.FC = () => {
  const navigate = useNavigate()
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [filteredOrders, setFilteredOrders] = useState<OrderListItem[]>([])
  const [date, setDate] = useState<Date>()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)

  // 환불/취소 모달 상태
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [processingRefund, setProcessingRefund] = useState(false)
  const [processingCancel, setProcessingCancel] = useState(false)

  // 주문 목록 가져오기 (orderApi 사용)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const response = await orderApi.getAll()
        
        // API 응답 구조에 따라 적절한 데이터 추출
        const ordersData = response.data || response || []
        setOrders(Array.isArray(ordersData) ? ordersData : [])
      } catch (error) {
        console.error('주문 목록 가져오기 실패:', error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  // 필터링 및 검색 로직
  useEffect(() => {
    let filtered = orders

    // 상태별 필터
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.order_status === statusFilter)
    }

    // 결제 상태별 필터
    if (paymentStatusFilter !== "all") {
      if (paymentStatusFilter === "paid") {
        filtered = filtered.filter(order => order.payment?.payment_status === "paid")
      } else if (paymentStatusFilter === "pending") {
        filtered = filtered.filter(order => !order.payment || order.payment.payment_status === "pending")
      } else if (paymentStatusFilter === "refunded") {
        filtered = filtered.filter(order => order.payment?.payment_status === "refunded")
      }
    }

    // 날짜별 필터
    if (date) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_datetime)
        return orderDate.toDateString() === date.toDateString()
      })
    }

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(order => {
        const businessName = order.business?.business_name || ''
        const itemsSummary = order.items_summary || ''
        return businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               itemsSummary.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }

    setFilteredOrders(filtered)
    setCurrentPage(1) // 필터 변경 시 첫 페이지로 이동
  }, [orders, statusFilter, paymentStatusFilter, date, searchQuery])

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  // 새 주문 처리
  const handleNewOrder = (orderData: any) => {
    // PostgreSQL에서 자동 생성된 ID를 우선 사용
    if (!orderData.id && !orderData.order_id) {
      console.error('❌ 주문 데이터에 ID가 없습니다:', orderData)
      toast.error('주문 ID를 받아올 수 없습니다.')
      return
    }
    
    // 주문이 성공적으로 생성되었으므로 전체 목록을 새로고침
    const refreshOrders = async () => {
      try {
        const response = await orderApi.getAll()
        const ordersData = response.data || response || []
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setShowOrderForm(false)
        toast.success('주문이 성공적으로 등록되었습니다!')
      } catch (error) {
        console.error('주문 목록 새로고침 실패:', error)
        toast.error('주문 목록을 새로고침하는데 실패했습니다.')
      }
    }
    
    refreshOrders()
  }



  // 상세보기 처리
  const handleViewDetail = (orderId: number) => {
    if (!orderId || orderId === undefined || isNaN(orderId)) {
      console.error('잘못된 주문 ID:', orderId)
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
  const executeRefund = async (reason: string) => {
    if (!selectedOrderId) return

    try {
      setProcessingRefund(true)
      await paymentApi.refund({
        orderId: selectedOrderId,
        refundReason: reason
      })
      
      toast.success('환불이 성공적으로 처리되었습니다!')
      setShowRefundModal(false)
      
      // 주문 목록 새로고침
      const response = await orderApi.getAll()
      const ordersData = response.data || response || []
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      
    } catch (error: any) {
      console.error('환불 처리 실패:', error)
      toast.error(error.response?.data?.error || '환불 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingRefund(false)
    }
  }

  // 주문 취소 실행
  const executeCancel = async (reason: string) => {
    if (!selectedOrderId) return

    try {
      setProcessingCancel(true)
      await paymentApi.cancelOrder({
        orderId: selectedOrderId,
        cancelReason: reason
      })
      
      toast.success('주문이 성공적으로 취소되었습니다!')
      setShowCancelModal(false)
      
      // 주문 목록 새로고침
      const response = await orderApi.getAll()
      const ordersData = response.data || response || []
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      
    } catch (error: any) {
      console.error('주문 취소 실패:', error)
      toast.error(error.response?.data?.error || '주문 취소 중 오류가 발생했습니다.')
    } finally {
      setProcessingCancel(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="px-6 py-4 bg-white border-b border-gray-200">
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

      <div className="p-6">
        {/* 필터 바 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              필터 및 검색
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label className="text-sm font-medium text-gray-700">주문일자</Label>
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

              {/* 검색 */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  검색
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="거래처명, 주문번호, 메모"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주문 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>주문 목록 ({filteredOrders.length}건)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        조회된 주문이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentOrders.map((order, index) => (
                      <TableRow key={order.id} className={`hover:bg-gray-50 transition-colors ${order.has_stock_issues ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}>
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {order.has_stock_issues && (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="sr-only">재고 부족</span>
                              </>
                            )}
                            {startIndex + index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div 
                            className="font-semibold cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={() => handleViewDetail(order.id)}
                          >
                            {order.business?.business_name || '거래처명 없음'}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {format(new Date(order.order_datetime), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {order.delivery_datetime ? format(new Date(order.delivery_datetime), "yyyy-MM-dd") : "-"}
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-[200px] truncate">
                          {order.items_summary}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(order.id)}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              상세
                            </Button>

                            {/* 결제 버튼 - 미결제 상태일 때만 표시 */}
                            {(!order.payment || order.payment.payment_status !== 'paid') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayment(order.id)}
                                className="border-green-600 text-green-600 hover:bg-green-50"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                결제
                              </Button>
                            )}

                            {/* 환불 버튼 - 결제 완료 상태일 때만 표시 */}
                            {order.payment?.payment_status === 'paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRefund(order.id)}
                                className="border-orange-600 text-orange-600 hover:bg-orange-50"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                환불
                              </Button>
                            )}

                            {/* 주문 취소 버튼 - 결제되지 않았거나 대기 상태일 때만 표시 */}
                            {(!order.payment || order.payment.payment_status === 'pending') && 
                             order.order_status !== 'cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancel(order.id)}
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
                  {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} / {filteredOrders.length}건
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
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                  
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
        isLoading={processingRefund}
      />

      <RefundCancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={executeCancel}
        type="cancel"
        orderId={selectedOrderId || 0}
        isLoading={processingCancel}
      />
    </div>
  )
}

export default OrderList 