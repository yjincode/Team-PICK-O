import React from "react"
import { Badge } from "../ui/badge"

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
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