"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart"

const data = [
  { day: "월", sales: 2400 },
  { day: "화", sales: 1800 },
  { day: "수", sales: 3200 },
  { day: "목", sales: 2800 },
  { day: "금", sales: 3800 },
  { day: "토", sales: 4200 },
  { day: "일", sales: 3600 },
]

const chartConfig = {
  sales: {
    label: "매출액",
    color: "#3483F7",
  },
}

export function SalesOverviewChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <LineChart data={data}>
        <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={<ChartTooltipContent />}
          formatter={(value) => [`₩${value.toLocaleString()}만원`, "매출액"]}
        />
        <Line dataKey="sales" stroke={chartConfig.sales.color} />
      </LineChart>
    </ChartContainer>
  )
} 