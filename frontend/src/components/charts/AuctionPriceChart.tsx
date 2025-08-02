/**
 * 경매 시세 차트 컴포넌트
 * 어류 경매 가격 동향을 표시하는 차트입니다
 * TODO: 실제 차트 라이브러리(Chart.js, Recharts 등) 연동 필요
 */
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react"

// 경매 가격 데이터 타입 정의
interface AuctionPriceData {
  date: string;
  price: number;
  change: number;
  volume: number;
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockAuctionData: AuctionPriceData[] = [
  { date: "2024-01-30", price: 48000, change: 5.2, volume: 150 },
  { date: "2024-01-29", price: 45600, change: -2.1, volume: 120 },
  { date: "2024-01-28", price: 46500, change: 3.8, volume: 180 },
  { date: "2024-01-27", price: 44800, change: -1.5, volume: 90 },
  { date: "2024-01-26", price: 45500, change: 4.2, volume: 200 },
]

const AuctionPriceChart: React.FC = () => {
  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          <span>경매 시세</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 경매 데이터 리스트 */}
        <div className="space-y-3">
          {mockAuctionData.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {/* 날짜 및 거래량 정보 */}
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="font-semibold">{data.date}</div>
                  <div className="text-sm text-gray-600">거래량: {data.volume}박스</div>
                </div>
              </div>
              
              {/* 가격 및 변동률 */}
              <div className="text-right">
                <div className="font-semibold text-lg">{formatCurrency(data.price)}</div>
                <div className="flex items-center space-x-1">
                  {data.change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.change > 0 ? '+' : ''}{data.change}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default AuctionPriceChart; 