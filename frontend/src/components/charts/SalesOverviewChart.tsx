/**
 * 매출 현황 차트 컴포넌트
 * 월별 매출 데이터를 표시하는 차트입니다
 * TODO: 실제 차트 라이브러리(Chart.js, Recharts 등) 연동 필요
 */
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

// 매출 데이터 타입 정의
interface SalesData {
  period: string;    // 기간 (월)
  revenue: number;   // 매출액
  growth: number;    // 성장률 (%)
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockSalesData: SalesData[] = [
  { period: "1월", revenue: 2400000, growth: 12.5 },
  { period: "2월", revenue: 2800000, growth: 16.7 },
  { period: "3월", revenue: 3200000, growth: 14.3 },
  { period: "4월", revenue: 3600000, growth: 12.5 },
]

const SalesOverviewChart: React.FC = () => {
  // 금액 포맷팅 함수
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
        {/* 매출 데이터 리스트 */}
        <div className="space-y-4">
          {mockSalesData.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {/* 매출 정보 */}
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <div className="font-semibold">{data.period}</div>
                  <div className="text-sm text-gray-600">{formatCurrency(data.revenue)}</div>
                </div>
              </div>
              
              {/* 성장률 표시 */}
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