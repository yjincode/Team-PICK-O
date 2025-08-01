import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react"

interface AuctionPriceData {
  date: string;
  price: number;
  change: number;
  volume: number;
}

const mockAuctionData: AuctionPriceData[] = [
  { date: "2024-01-30", price: 48000, change: 5.2, volume: 150 },
  { date: "2024-01-29", price: 45600, change: -2.1, volume: 120 },
  { date: "2024-01-28", price: 46500, change: 3.8, volume: 180 },
  { date: "2024-01-27", price: 44800, change: -1.5, volume: 90 },
  { date: "2024-01-26", price: 45500, change: 4.2, volume: 200 },
]

const AuctionPriceChart: React.FC = () => {
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
        <div className="space-y-3">
          {mockAuctionData.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="font-semibold">{data.date}</div>
                  <div className="text-sm text-gray-600">거래량: {data.volume}박스</div>
                </div>
              </div>
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