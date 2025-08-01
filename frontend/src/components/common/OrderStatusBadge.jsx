import { Badge } from "../ui/badge"

export function OrderStatusBadge({ status, className }) {
  const getVariant = () => {
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
    <Badge variant={getVariant()} className={`text-sm ${className}`}>
      {status}
    </Badge>
  )
} 