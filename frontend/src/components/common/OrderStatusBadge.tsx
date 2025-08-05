/**
 * 주문 상태 배지 컴포넌트
 * 주문의 상태에 따라 적절한 색상의 배지를 표시합니다
 */
import React from "react"
import { Badge } from "../ui/badge"

interface OrderStatusBadgeProps {
  status: string;      // 주문 상태 (완료, 처리중, 대기 등)
  className?: string;  // 추가 CSS 클래스
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  // 주문 상태에 따른 배지 variant 결정
  const getVariant = (): "default" | "secondary" | "outline" => {
    switch (status) {
      case "완료":
        return "default"
      case "처리중":
        return "secondary"
      case "대기":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Badge variant={getVariant()} className={`text-xs sm:text-sm ${className || ''}`}>
      {status}
    </Badge>
  )
} 