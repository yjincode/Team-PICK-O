/**
 * 주문 목록 테이블 컴포넌트
 * 주문 목록을 테이블 형태로 표시합니다.
 */
import React from "react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"

// 주문 데이터 타입 정의
interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
  memo?: string;
  source_type: 'voice' | 'text' | 'manual' | 'image';
  transcribed_text?: string;
  delivery_date?: string;
  status: 'placed' | 'ready' | 'delivered' | 'cancelled';
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

interface OrderListTableProps {
  orders: Order[]
  loading: boolean
  currentPage: number
  itemsPerPage: number
  onViewDetail?: (orderId: number) => void
}

// 주문 상태 텍스트 변환
const getStatusText = (status: string) => {
  switch (status) {
    case "placed":
      return <Badge variant="secondary">주문접수</Badge>
    case "ready":
      return <Badge variant="default">출고준비</Badge>
    case "delivered":
      return <Badge variant="default">납품완료</Badge>
    case "cancelled":
      return <Badge variant="destructive">취소됨</Badge>
    default:
      return <Badge variant="outline">알 수 없음</Badge>
  }
}

// 결제 상태 텍스트 변환
const getPaymentStatusText = (status: string) => {
  switch (status) {
    case "placed":
      return <Badge variant="outline">미결제</Badge>
    case "paid":
      return <Badge variant="default">결제완료</Badge>
    case "refunded":
      return <Badge variant="destructive">환불됨</Badge>
    default:
      return <Badge variant="outline">알 수 없음</Badge>
  }
}

// 주문 항목 요약 생성
const getItemsSummary = (items?: Array<{ fish_type_id: number; quantity: number; unit?: string }>) => {
  if (!items || items.length === 0) return "항목 없음"
  
  return items.map(item => {
    const fishNames = ["고등어", "갈치", "오징어", "명태", "연어", "새우", "문어", "방어"]
    const fishName = fishNames[item.fish_type_id - 1] || "기타"
    return `${fishName} ${item.quantity}${item.unit || "개"}`
  }).join(", ")
}

const OrderListTable: React.FC<OrderListTableProps> = ({
  orders,
  loading,
  currentPage,
  itemsPerPage,
  onViewDetail
}) => {
  return (
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
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                로딩 중...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                주문 내역이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order, index) => (
              <TableRow key={order.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-900">
                  {(currentPage - 1) * itemsPerPage + index + 1}
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
                    onClick={() => onViewDetail?.(order.id)}
                  >
                    상세보기
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default OrderListTable 