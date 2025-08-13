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
  ChevronRight
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
import { orderApi } from "../../lib/api"
import toast from 'react-hot-toast'
import OrderForm from "./OrderForm"

// 주문 데이터 타입 정의 (OrderListSerializer 반영)
interface Order extends OrderListItem {
  // OrderListItem에서 확장하여 필요한 필드 추가
  memo?: string;
  source_type?: 'manual' | 'voice' | 'text';
  transcribed_text?: string;
  last_updated_at?: string;
}

// 목업 데이터 (OrderListSerializer 구조 반영)
// const mockOrders: Order[] = [
//   {
//     id: 1,
//     business_id: 1,
//     total_price: 2400000,
//     order_datetime: "2024-01-15T10:30:00",
//     delivery_datetime: "2024-01-17T09:00:00",
//     memo: "급한 주문입니다",
//     source_type: "voice",
//     transcribed_text: "고등어 50박스, 갈치 30박스 주문해주세요",
//     order_status: "ready",
//     is_urgent: true,
//     last_updated_at: "2024-01-15T10:30:00",
//     business: {
//       id: 1,
//       business_name: "해양수산 마트",
//       phone_number: "010-1234-5678",
//     },
//     items: [
//       {
//         id: 1,
//         fish_type_id: 1,
//         item_name_snapshot: "고등어",
//         quantity: 50,
//         unit_price: 48000,
//         unit: "박스",
//       },
//       {
//         id: 2,
//         fish_type_id: 2,
//         item_name_snapshot: "갈치",
//         quantity: 30,
//         unit_price: 65000,
//         unit: "박스",
//       },
//     ],
//     payment: {
//       id: 1,
//       payment_status: "paid",
//       amount: 2400000,
//       method: "bank_transfer",
//       paid_at: "2024-01-15T11:00:00",
//     },
//   },
//   {
//     id: 2,
//     business_id: 2,
//     total_price: 1200000,
//     order_datetime: "2024-01-15T14:15:00",
//     delivery_datetime: "2024-01-16T09:00:00",
//     memo: "정기 주문",
//     source_type: "text",
//     transcribed_text: "오징어 25박스 주문",
//     order_status: "delivered",
//     is_urgent: false,
//     last_updated_at: "2024-01-16T09:00:00",
//     business: {
//       id: 2,
//       business_name: "바다횟집",
//       phone_number: "010-2345-6789",
//     },
//     items: [
//       {
//         id: 3,
//         fish_type_id: 3,
//         item_name_snapshot: "오징어",
//         quantity: 25,
//         unit_price: 48000,
//         unit: "박스",
//       },
//     ],
//     payment: {
//       id: 2,
//       payment_status: "paid",
//       amount: 1200000,
//       method: "card",
//       paid_at: "2024-01-15T14:30:00",
//     },
//   },
//   {
//     id: 3,
//     business_id: 3,
//     total_price: 1800000,
//     order_datetime: "2024-01-14T09:00:00",
//     delivery_datetime: "2024-01-18T09:00:00",
//     memo: "신규 거래처",
//     source_type: "voice",
//     transcribed_text: "명태 40박스, 고등어 20박스 주문",
//     order_status: "placed",
//     is_urgent: false,
//     last_updated_at: "2024-01-14T09:00:00",
//     business: {
//       id: 3,
//       business_name: "신선마켓",
//       phone_number: "010-3456-7890",
//     },
//     items: [
//       {
//         id: 4,
//         fish_type_id: 4,
//         item_name_snapshot: "명태",
//         quantity: 40,
//         unit_price: 45000,
//         unit: "박스",
//       },
//       {
//         id: 5,
//         fish_type_id: 1,
//         item_name_snapshot: "고등어",
//         quantity: 20,
//         unit_price: 48000,
//         unit: "박스",
//       },
//     ],
//     payment: {
//       id: 3,
//       payment_status: "pending",
//       amount: 1800000,
//       method: "cash",
//     },
//   },
//   {
//     id: 4,
//     business_id: 4,
//     total_price: 1500000,
//     order_datetime: "2024-01-14T11:00:00",
//     delivery_datetime: "2024-01-16T09:00:00",
//     memo: "신선도 중요",
//     source_type: "manual",
//     transcribed_text: "연어 3kg, 새우 2kg 주문",
//     order_status: "delivered",
//     is_urgent: false,
//     last_updated_at: "2024-01-16T09:00:00",
//     business: {
//       id: 4,
//       business_name: "오션푸드",
//       phone_number: "010-4567-8901",
//     },
//     items: [
//       {
//         id: 6,
//         fish_type_id: 5,
//         item_name_snapshot: "연어",
//         quantity: 3,
//         unit_price: 500000,
//         unit: "kg",
//       },
//       {
//         id: 7,
//         fish_type_id: 6,
//         item_name_snapshot: "새우",
//         quantity: 2,
//         unit_price: 75000,
//         unit: "kg",
//       },
//     ],
//     payment: {
//       id: 4,
//       payment_status: "paid",
//       amount: 1500000,
//       method: "bank_transfer",
//       paid_at: "2024-01-14T12:00:00",
//     },
//   },
//   {
//     id: 5,
//     business_id: 5,
//     total_price: 800000,
//     order_datetime: "2024-01-13T16:00:00",
//     delivery_datetime: "2024-01-15T09:00:00",
//     memo: "소량 주문",
//     source_type: "voice",
//     transcribed_text: "문어 1kg, 오징어 3kg 주문",
//     order_status: "cancelled",
//     is_urgent: false,
//     last_updated_at: "2024-01-14T10:00:00",
//     business: {
//       id: 5,
//       business_name: "프레시마트",
//       phone_number: "010-5678-9012",
//     },
//     items: [
//       {
//         id: 8,
//         fish_type_id: 7,
//         item_name_snapshot: "문어",
//         quantity: 1,
//         unit_price: 300000,
//         unit: "kg",
//       },
//       {
//         id: 9,
//         fish_type_id: 8,
//         item_name_snapshot: "오징어",
//         quantity: 3,
//         unit_price: 166667,
//         unit: "kg",
//       },
//     ],
//     payment: {
//       id: 5,
//       payment_status: "refunded",
//       amount: 800000,
//       method: "card",
//       paid_at: "2024-01-13T16:30:00",
//     },
//   },
// ]

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

// 주문 아이템을 문자열로 변환
const getItemsSummary = (items?: Array<{ item_name_snapshot: string; quantity: number; unit?: string }>) => {
  if (!items || items.length === 0) return "품목 없음"
  
  return items.map(item => {
    return `${item.item_name_snapshot} ${item.quantity}${item.unit || "개"}`
  }).join(", ")
}

// 금액 포맷팅
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price)
}

const OrderList: React.FC = () => {
  const navigate = useNavigate()
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

  // 주문 목록 가져오기 (orderApi 사용)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const response = await orderApi.getAll()
        console.log('전체 응답 객체:', response)
        console.log('response.data:', response.data)
        console.log('response 자체:', response)
        
        // API 응답 구조에 따라 적절한 데이터 추출
        const ordersData = response.data || response || []
        console.log('처리된 주문 데이터:', ordersData)
        console.log('첫 번째 주문 데이터:', ordersData?.[0])
        console.log('첫 번째 주문 ID:', ordersData?.[0]?.id, typeof ordersData?.[0]?.id)
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

    // 날짜별 필터
    if (date) {
      const selectedDate = format(date, "yyyy-MM-dd")
      filtered = filtered.filter(order => 
        format(new Date(order.order_datetime), "yyyy-MM-dd") === selectedDate
      )
    }

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.business?.business_name?.toLowerCase().includes(query) ||
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
        console.log('주문 목록 새로고침:', ordersData)
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setShowOrderForm(false)
        toast.success('주문이 성공적으로 등록되었습니다!')
      } catch (error) {
        console.error('주문 목록 새로고침 실패:', error)
        toast.error('주문 목록을 새로고침하는데 실패했습니다.')
      }
    }
    
    refreshOrders()
    return
    
    // 아래는 백업용 로컬 추가 로직 (사용하지 않음)
    const newOrder: OrderListItem = {
      id: orderData.id || orderData.order_id,
      business: orderData.business || { 
        id: orderData.business_id || 0,
        business_name: '거래처명 없음',
        phone_number: '연락처 없음'
      },
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
    navigate(`/orders/${orderId}/payment`)
  }

  // 상세보기 처리
  const handleViewDetail = (orderId: number) => {
    console.log('상세보기 클릭:', orderId, typeof orderId)
    if (!orderId || orderId === undefined || isNaN(orderId)) {
      console.error('잘못된 주문 ID:', orderId)
      toast.error('주문 ID가 올바르지 않습니다.')
      return
    }
    navigate(`/orders/${orderId}`)
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
                    currentOrders.map((order, index) => {
                      // 디버깅용 로그
                      if (index === 0) {
                        console.log('첫 번째 주문 렌더링:', { id: order.id, order })
                      }
                      return (
                      <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          {startIndex + index + 1}
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
                          {/* OrderListSerializer에는 payment_status가 없으므로 필터링 제거 */}
                          <OrderStatusBadge status={order.order_status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('버튼 클릭 시 주문 객체:', order)
                                console.log('버튼 클릭 시 order.id:', order.id, typeof order.id)
                                handleViewDetail(order.id)
                              }}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              상세
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
                      )
                    })
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