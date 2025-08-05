/**
 * 통계 카드 컴포넌트
 * 대시보드에서 통계 정보를 표시하는 카드 형태의 컴포넌트입니다
 */
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

interface StatsCardProps {
  title: string;           // 카드 제목
  value: string | number;  // 주요 통계 값
  subtitle?: string;       // 부제목 (선택사항)
  icon: React.ComponentType<{ className?: string }>;  // 아이콘 컴포넌트
  iconColor?: string;      // 아이콘 색상 (기본값: text-accent-blue)
  valueColor?: string;     // 값 색상 (기본값: text-gray-900)
  subtitleColor?: string;  // 부제목 색상 (기본값: text-gray-600)
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-accent-blue",
  valueColor = "text-gray-900",
  subtitleColor = "text-gray-600",
}) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm sm:text-base font-medium text-gray-700">{title}</CardTitle>
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl sm:text-3xl font-bold ${valueColor}`}>{value}</div>
        {subtitle && <p className={`text-xs sm:text-sm mt-1 ${subtitleColor}`}>{subtitle}</p>}
      </CardContent>
    </Card>
  )
} 