/**
 * 주문 항목 리스트 컴포넌트
 * 주문 항목들을 테이블 형태로 표시하고 관리합니다.
 */
import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { Button } from "../../../components/ui/button"
import { Trash2 } from "lucide-react"

// 주문 항목 타입 정의
interface OrderItem {
  id: string
  fish_type_id: number
  fish_name: string
  quantity: number
  unit_price: number
  unit: string
  remarks?: string
  delivery_date: string
}

interface OrderItemListProps {
  items: OrderItem[]
  onRemoveItem: (itemId: string) => void
  totalPrice?: number
}

const OrderItemList: React.FC<OrderItemListProps> = ({
  items,
  onRemoveItem,
  totalPrice
}) => {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">주문 항목</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>어종</TableHead>
            <TableHead>수량</TableHead>
            <TableHead>단가</TableHead>
            <TableHead>단위</TableHead>
            <TableHead>요청사항</TableHead>
            <TableHead>납품일</TableHead>
            <TableHead>액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.fish_name}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>{item.unit_price.toLocaleString()}원</TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell>{item.remarks || "-"}</TableCell>
              <TableCell>{item.delivery_date}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* 총 가격 표시 */}
      {totalPrice !== undefined && (
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="text-lg font-semibold">총 가격:</span>
          <span className="text-2xl font-bold text-blue-600">
            {totalPrice.toLocaleString()}원
          </span>
        </div>
      )}
    </div>
  )
}

export default OrderItemList 