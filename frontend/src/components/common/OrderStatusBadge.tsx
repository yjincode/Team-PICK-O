/**
 * 주문 상태 배지 컴포넌트
 * 주문의 상태에 따라 적절한 색상의 배지를 표시합니다
 */
import React from "react"
import { Badge } from "../ui/badge"

interface OrderStatusBadgeProps {
  status: 'placed' | 'ready' | 'delivered' | 'cancelled';  // 주문 상태
  className?: string;  // 추가 CSS 클래스
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  // 주문 상태에 따른 배지 variant와 텍스트 결정
  const getStatusInfo = (): { variant: "default" | "secondary" | "outline" | "destructive", text: string } => {
    switch (status) {
      case "delivered":
        return { variant: "default", text: "배송완료" }
      case "ready":
        return { variant: "secondary", text: "준비중" }
      case "placed":
        return { variant: "outline", text: "주문접수" }
      case "cancelled":
        return { variant: "destructive", text: "취소됨" }
      default:
        return { variant: "outline", text: "알 수 없음" }
    }
  }

  const { variant, text } = getStatusInfo()

  return (
    <Badge variant={variant} className={`text-xs sm:text-sm ${className || ''}`}>
      {text}
    </Badge>
  )
} 