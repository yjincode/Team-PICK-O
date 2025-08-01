import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  valueColor?: string;
  subtitleColor?: string;
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