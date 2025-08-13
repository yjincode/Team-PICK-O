/**
 * 상태별 배지 컴포넌트들
 * 주문 상태와 결제 상태를 표시하는 배지들을 모아둔 파일입니다
 */
import React from "react"
import { Badge } from "../ui/badge"
import { getBadgeClass, getLabel } from "../../lib/labels"

// ==================== 주문 상태 배지 ====================
interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  const config = {
    text: getLabel('orderStatus', status, '등록'),
    color: getBadgeClass('orderStatus', status)
  }
  return (
    <Badge className={`${config.color} font-medium ${className || ''}`}>
      {config.text}
    </Badge>
  )
}

// ==================== 결제 상태 배지 ====================
interface PaymentStatusBadgeProps {
  status: 'pending' | 'paid' | 'refunded';
  className?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className }) => (
  <Badge className={`text-xs sm:text-sm ${getBadgeClass('paymentStatus', status)} ${className || ''}`}>
    {getLabel('paymentStatus', status)}
  </Badge>
)
