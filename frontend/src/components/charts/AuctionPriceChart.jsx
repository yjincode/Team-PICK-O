"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart"

const data = [
  { date: "1월", 고등어: 12000, 갈치: 18000, 오징어: 15000 },
  { date: "2월", 고등어: 13500, 갈치: 19500, 오징어: 16200 },
  { date: "3월", 고등어: 11800, 갈치: 17800, 오징어: 14800 },
  { date: "4월", 고등어: 14200, 갈치: 20200, 오징어: 17100 },
  { date: "5월", 고등어: 15800, 갈치: 22000, 오징어: 18500 },
  { date: "6월", 고등어: 14500, 갈치: 21200, 오징어: 17800 },
]

const chartConfig = {
  고등어: {
    label: "고등어",
    color: "#3483F7",
  },
  갈치: {
    label: "갈치",
    color: "#10B981",
  },
  오징어: {
    label: "오징어",
    color: "#F59E0B",
  },
}

export function AuctionPriceChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}k`}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value) => [`₩${value.toLocaleString()}`, ""]}
        />
        <Line
          type="monotone"
          dataKey="고등어"
          stroke={chartConfig.고등어.color}
          strokeWidth={3}
          dot={{ fill: chartConfig.고등어.color, strokeWidth: 2, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="갈치"
          stroke={chartConfig.갈치.color}
          strokeWidth={3}
          dot={{ fill: chartConfig.갈치.color, strokeWidth: 2, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="오징어"
          stroke={chartConfig.오징어.color}
          strokeWidth={3}
          dot={{ fill: chartConfig.오징어.color, strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
} 