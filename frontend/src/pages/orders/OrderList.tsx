/**
 * 주문 목록 페이지
 * 주문 내역을 조회하고 관리하는 페이지입니다
 */
import React, { useState } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { CalendarDays, FileText, Home, Package, Search, Settings, ShoppingCart, Users, Plus } from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination"
import OrderForm from "./OrderForm"

// 주문 데이터 타입 정의
interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
  memo?: string;
  source_type: 'voice' | 'text' | 'manual';
  transcribed_text?: string;
  delivery_date?: string;
  status: 'success' | 'failed' | 'pending';
  business?: {
    id: number;
    business_name: string;
    phone_number: string;
  };
  items?: Array<{
    id: number;
    fish_type_id: number;
    quantity: number;
    unit_price?: number;
    unit?: string;
  }>;
}

// 목업 데이터를 테이블 형식에 맞게 변환
const mockOrders: Order[] = [
  {
    id: 1,
    business_id: 1,
    total_price: 2400000,
    order_datetime: "2024-01-15T10:30:00",
    memo: "급한 주문입니다",
    source_type: "voice",
    transcribed_text: "고등어 50박스, 갈치 30박스 주문해주세요",
    delivery_date: "2024-01-17",
    status: "pending",
    business: {
      id: 1,
      business_name: "해양수산 마트",
      phone_number: "010-1234-5678",
    },
    items: [
      {
        id: 1,
        fish_type_id: 1,
        quantity: 50,
        unit_price: 48000,
        unit: "박스",
      },
      {
        id: 2,
        fish_type_id: 2,
        quantity: 30,
        unit_price: 65000,
        unit: "박스",
      },
    ],
  },
  {
    id: 2,
    business_id: 2,
    total_price: 1200000,
    order_datetime: "2024-01-15T14:15:00",
    memo: "정기 주문",
    source_type: "text",
    transcribed_text: "오징어 25박스 주문",
    delivery_date: "2024-01-16",
    status: "success",
    business: {
      id: 2,
      business_name: "바다횟집",
      phone_number: "010-2345-6789",
    },
    items: [
      {
        id: 3,
        fish_type_id: 3,
        quantity: 25,
        unit_price: 48000,
        unit: "박스",
      },
    ],
  },
  {
    id: 3,
    business_id: 3,
    total_price: 1800000,
    order_datetime: "2024-01-14T09:00:00",
    memo: "신규 거래처",
    source_type: "voice",
    transcribed_text: "명태 40박스, 고등어 20박스 주문",
    delivery_date: "2024-01-18",
    status: "pending",
    business: {
      id: 3,
      business_name: "신선마켓",
      phone_number: "010-3456-7890",
    },
    items: [
      {
        id: 4,
        fish_type_id: 4,
        quantity: 40,
        unit_price: 45000,
        unit: "박스",
      },
      {
        id: 5,
        fish_type_id: 1,
        quantity: 20,
        unit_price: 48000,
        unit: "박스",
      },
    ],
  },
  {
    id: 4,
    business_id: 4,
    total_price: 1500000,
    order_datetime: "2024-01-14T11:00:00",
    memo: "신선도 중요",
    source_type: "manual",
    transcribed_text: "연어 3kg, 새우 2kg 주문",
    delivery_date: "2024-01-16",
    status: "success",
    business: {
      id: 4,
      business_name: "오션푸드",
      phone_number: "010-4567-8901",
    },
    items: [
      {
        id: 6,
        fish_type_id: 5,
        quantity: 3,
        unit_price: 500000,
        unit: "kg",
      },
      {
        id: 7,
        fish_type_id: 6,
        quantity: 2,
        unit_price: 75000,
        unit: "kg",
      },
    ],
  },
  {
    id: 5,
    business_id: 5,
    total_price: 800000,
    order_datetime: "2024-01-13T16:00:00",
    memo: "소량 주문",
    source_type: "voice",
    transcribed_text: "문어 1kg, 오징어 3kg 주문",
    delivery_date: "2024-01-15",
    status: "success",
    business: {
      id: 5,
      business_name: "프레시마트",
      phone_number: "010-5678-9012",
    },
    items: [
      {
        id: 8,
        fish_type_id: 7,
        quantity: 1,
        unit_price: 300000,
        unit: "kg",
      },
      {
        id: 9,
        fish_type_id: 8,
        quantity: 3,
        unit_price: 166667,
        unit: "kg",
      },
    ],
  },
]

// 상태별 글씨색 스타일
const getStatusText = (status: string) => {
  switch (status) {
    case "success":
      return <span className="text-green-600 font-medium">완료</span>
    case "pending":
      return <span className="text-yellow-600 font-medium">출고 준비</span>
    case "failed":
      return <span className="text-red-600 font-medium">실패</span>
    default:
      return <span className="text-gray-600 font-medium">등록</span>
  }
}

const getPaymentStatusText = (status: string) => {
  switch (status) {
    case "success":
      return <span className="text-blue-600 font-medium">결제 완료</span>
    case "pending":
      return <span className="text-red-600 font-medium">미결제</span>
    default:
      return <span className="text-red-600 font-medium">미결제</span>
  }
}

// 주문 아이템을 문자열로 변환
const getItemsSummary = (items?: Array<{ fish_type_id: number; quantity: number; unit?: string }>) => {
  if (!items || items.length === 0) return "품목 없음"
  
  return items.map(item => {
    const fishNames = ["고등어", "갈치", "오징어", "명태", "연어", "새우", "문어", "방어"]
    const fishName = fishNames[item.fish_type_id - 1] || "기타"
    return `${fishName} ${item.quantity}${item.unit || "개"}`
  }).join(", ")
}

const OrderList: React.FC = () => {
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orders, setOrders] = useState(mockOrders)
  const [date, setDate] = React.useState<Date>()
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState<string>("")

  // 새 주문 처리
  const handleNewOrder = (orderData: any) => {
    console.log('받은 주문 데이터:', orderData)
    
    const newOrder: Order = {
      id: orderData.order_id || Math.max(...orders.map(o => o.id)) + 1,
      business_id: orderData.business_id,
      total_price: orderData.total_price || 0,
      order_datetime: orderData.order_datetime || new Date().toISOString(),
      memo: orderData.memo || '',
      source_type: orderData.source_type || 'manual',
      transcribed_text: orderData.transcribed_text || '',
      delivery_date: orderData.delivery_date || '',
      status: orderData.status || 'pending',
      business: {
        id: orderData.business_id,
        business_name: orderData.business_name || '거래처명 없음',
        phone_number: orderData.phone_number || '연락처 없음',
      },
      items: orderData.order_items?.map((item: any, index: number) => ({
        id: index + 1,
        fish_type_id: item.fish_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit
      })) || []
    }
    
    setOrders(prev => [newOrder, ...prev])
    setShowOrderForm(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="px-6 py-4">
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
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                  주문 상태
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="등록">등록</SelectItem>
                    <SelectItem value="결제 완료">결제 완료</SelectItem>
                    <SelectItem value="출고 준비">출고 준비</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-700">주문일자</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[140px] justify-start text-left font-normal bg-transparent"
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="거래처명 또는 주문번호 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[280px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 주문 테이블 */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-900">번호</TableHead>
                <TableHead className="font-semibold text-gray-900">거래처명</TableHead>
                <TableHead className="font-semibold text-gray-900">주문일자</TableHead>
                <TableHead className="font-semibold text-gray-900">납기일</TableHead>
                <TableHead className="font-semibold text-gray-900">품목 요약</TableHead>
                <TableHead className="font-semibold text-gray-900">결제 상태</TableHead>
                <TableHead className="font-semibold text-gray-900">주문 상태</TableHead>
                <TableHead className="font-semibold text-gray-900 text-center">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{order.business?.business_name}</TableCell>
                  <TableCell className="text-gray-600">
                    {format(new Date(order.order_datetime), "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {order.delivery_date ? format(new Date(order.delivery_date), "yyyy-MM-dd") : "-"}
                  </TableCell>
                  <TableCell className="text-gray-600 max-w-[200px] truncate">
                    {getItemsSummary(order.items)}
                  </TableCell>
                  <TableCell>{getPaymentStatusText(order.status)}</TableCell>
                  <TableCell>{getStatusText(order.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                    >
                      상세보기
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
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