/**
 * 주문 목록 페이지
 * 주문 내역을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import axios from "axios"
import { 
  CalendarDays, 
  Search, 
  Plus, 
  Eye, 
  CreditCard,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"

import { OrderListItem } from "../../types"
import toast from 'react-hot-toast'
import MinimalCalendar from "../../components/ui/MinimalCalendar"
import OrderForm from "./OrderForm"

// API 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (Firebase 토큰 사용)
api.interceptors.request.use(
  (config) => {
    const firebaseToken = localStorage.getItem('firebase_token')
    if (firebaseToken) {
      config.headers.Authorization = `Bearer ${firebaseToken}`
    }
    return config
  },
  (error) => {
    console.error('API 요청 오류:', error)
    return Promise.reject(error)
  }
)


// 주문 데이터 타입 정의 (OrderListSerializer 반영)
interface Order extends OrderListItem {
  // OrderListItem에서 확장하여 필요한 필드 추가

// 한국 시간대로 날짜를 처리하는 함수들
const toKoreanDate = (date: Date): string => {
  const koreanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return koreanDate.toISOString().split('T')[0]
}

const fromKoreanDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 9, 0, 0) // 한국 시간 9시로 설정
}

const formatKoreanDate = (dateString: string): string => {
  if (!dateString) return "-"
  try {
    const date = new Date(dateString)
    const koreanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
    return format(koreanDate, "yyyy-MM-dd", { locale: ko })
  } catch (error) {
    return dateString
  }
}

// 주문 데이터 타입 정의 (DB 구조 반영)
interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
  delivery_datetime?: string;

  memo?: string;
  source_type?: 'manual' | 'voice' | 'text';
  transcribed_text?: string;

  last_updated_at?: string;
}




  order_status: 'placed' | 'ready' | 'delivered' | 'cancelled';
  is_urgent: boolean;
  last_updated_at: string;
  business?: {
    id: number;
    business_name: string;
    phone_number: string;
  };
  items_summary?: string;
  items?: Array<{
    id: number;
    fish_type_id: number;
    item_name_snapshot: string;
    quantity: number;
    unit_price?: number;
    unit?: string;
    remarks?: string;
  }>;
  payment?: {
    id: number;
    payment_status: 'pending' | 'paid' | 'refunded';
    amount: number;
    method: 'cash' | 'bank_transfer' | 'card';
    paid_at?: string;
  };
}


// 상태별 배지 컴포넌트
const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "placed":
        return { text: "등록", color: "bg-gray-100 text-gray-800" }
      case "ready":
        return { text: "출고 준비", color: "bg-yellow-100 text-yellow-800" }
      case "delivered":
        return { text: "완료", color: "bg-green-100 text-green-800" }
      case "cancelled":
        return { text: "취소", color: "bg-red-100 text-red-800" }
      default:
        return { text: "등록", color: "bg-gray-100 text-gray-800" }
    }
  }

  const config = getStatusConfig(status)
  return (
    <Badge className={`${config.color} font-medium`}>
      {config.text}
    </Badge>
  )
}

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return { text: "결제 완료", color: "bg-blue-100 text-blue-800" }
      case "pending":
        return { text: "미결제", color: "bg-red-100 text-red-800" }
      case "refunded":
        return { text: "환불됨", color: "bg-orange-100 text-orange-800" }
      default:
        return { text: "미결제", color: "bg-red-100 text-red-800" }
    }
  }

  const config = getStatusConfig(status)
  return (
    <Badge className={`${config.color} font-medium`}>
      {config.text}
    </Badge>
  )
}

// 금액 포맷팅
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price)
}

const OrderList: React.FC = () => {
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [date, setDate] = useState<Date>()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(true)

  // 주문 목록 가져오기 (직접 API 호출)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const response = await api.get('/order/')
        console.log('주문 목록 응답:', response.data)
        setOrders(response.data || [])
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
      // OrderListSerializer에는 payment_status가 없으므로 필터링 제거
      // 대신 주문 상태에 따라 필터링
      if (paymentStatusFilter === "paid") {
        filtered = filtered.filter(order => order.order_status === "delivered" || order.order_status === "cancelled")
      } else if (paymentStatusFilter === "pending") {
        filtered = filtered.filter(order => order.order_status === "placed")
      } else if (paymentStatusFilter === "refunded") {
        filtered = filtered.filter(order => order.order_status === "cancelled")
      }
    }

    // 날짜 필터링
    if (date) {
      const selectedDate = format(date, "yyyy-MM-dd")
      filtered = filtered.filter(order => 
        formatKoreanDate(order.order_datetime) === selectedDate
      )
    }

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.business_name.toLowerCase().includes(query) ||
        order.id.toString().includes(query) ||
        order.memo?.toLowerCase().includes(query)
      )
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
    console.log('받은 주문 데이터:', orderData)
    
    const newOrder: Order = {
      id: orderData.order_id || Math.max(...orders.map(o => o.id)) + 1,
      business_id: orderData.business_id,
      business_name: orderData.business_name || '거래처명 없음',
      business_phone: orderData.phone_number || '연락처 없음',
      total_price: orderData.total_price || 0,
      order_datetime: orderData.order_datetime || new Date().toISOString(),
      delivery_datetime: orderData.delivery_datetime || '',
      order_status: 'placed',
      is_urgent: orderData.is_urgent || false,
      items_summary: orderData.order_items?.map((item: any) => `${item.item_name_snapshot || '품목명 없음'} ${item.quantity}${item.unit}`).join(', ') || '주문 항목 없음',
      memo: orderData.memo || '',
      source_type: orderData.source_type || 'manual',
      transcribed_text: orderData.transcribed_text || '',
      last_updated_at: new Date().toISOString()
    }
    
    setOrders(prev => [newOrder, ...prev])
    setShowOrderForm(false)
  }

  // 결제 처리 (OrderListSerializer에는 payment 정보가 없으므로 주문 상태만 변경)
  const handlePayment = (orderId: number) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          order_status: 'delivered' as const
        }
      }
      return order
    }))
    toast.success('주문이 배송 완료로 변경되었습니다.')
  }

  // 상세보기 처리
  const handleViewDetail = (orderId: number) => {
    console.log('상세보기:', orderId)
    // TODO: 상세보기 페이지로 이동 또는 모달 열기
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
                    <SelectItem value="placed">등록</SelectItem>
                    <SelectItem value="ready">출고 준비</SelectItem>
                    <SelectItem value="delivered">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
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
                    <SelectItem value="paid">결제 완료</SelectItem>
                    <SelectItem value="pending">미결제</SelectItem>
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
                    <MinimalCalendar 
                      value={date} 
                      onChange={(date) => setDate(date || undefined)} 
                      placeholder="날짜 선택"
                    />
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
                    <TableHead className="font-semibold text-gray-900 text-center">작업</TableHead>
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
                      <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">

                          <div>
                            <div className="font-semibold">{order.business_name}</div>
                            <div className="text-sm text-gray-500">{order.business_phone}</div>
                          </div>

                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatKoreanDate(order.order_datetime)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {order.delivery_datetime ? formatKoreanDate(order.delivery_datetime) : "-"}
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-[200px] truncate">

                          {order.items_summary || "품목 없음"}

                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {formatPrice(order.total_price)}원
                        </TableCell>
                        <TableCell>
                          {/* OrderListSerializer에는 payment_status가 없으므로 필터링 제거 */}
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
                              상세보기
                            </Button>
                            {/* OrderListSerializer에는 payment_status가 없으므로 필터링 제거 */}
                            {(order.order_status === 'placed' || order.order_status === 'ready') && (
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
    </div>
  )
}

export default OrderList 