import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface SalesData {
  period: string;
  revenue: number;
  growth: number;
}

const mockSalesData: SalesData[] = [
  { period: "1월", revenue: 2400000, growth: 12.5 },
  { period: "2월", revenue: 2800000, growth: 16.7 },
  { period: "3월", revenue: 3200000, growth: 14.3 },
  { period: "4월", revenue: 3600000, growth: 12.5 },
]

const SalesOverviewChart: React.FC = () => {
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <span>매출 현황</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockSalesData.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <div className="font-semibold">{data.period}</div>
                  <div className="text-sm text-gray-600">{formatCurrency(data.revenue)}</div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {data.growth > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${data.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.growth > 0 ? '+' : ''}{data.growth}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SalesOverviewChart; 