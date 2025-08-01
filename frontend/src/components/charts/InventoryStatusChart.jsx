"use client"

import { PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart.jsx"

const data = [
  { name: "고등어", value: 35, color: "#3483F7" },
  { name: "갈치", value: 25, color: "#10B981" },
  { name: "오징어", value: 20, color: "#F59E0B" },
  { name: "명태", value: 15, color: "#EF4444" },
  { name: "기타", value: 5, color: "#8B5CF6" },
]

const chartConfig = {
  value: {
    label: "재고량",
  },
}

export function InventoryStatusChart() {
  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="h-[200px]">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => [`${value}%`, ""]} />
        </PieChart>
      </ChartContainer>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <span className="font-medium">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
} 