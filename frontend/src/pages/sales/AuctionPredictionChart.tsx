import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { TrendingUp, Brain, AlertTriangle } from "lucide-react"

interface PredictionData {
  date: string;
  predictedPrice: number;
  actualPrice?: number;
  confidence: number;
}

const mockPredictionData: PredictionData[] = [
  { date: "2024-02-01", predictedPrice: 48000, confidence: 85 },
  { date: "2024-02-02", predictedPrice: 52000, confidence: 78 },
  { date: "2024-02-03", predictedPrice: 49000, confidence: 82 },
  { date: "2024-02-04", predictedPrice: 55000, confidence: 75 },
  { date: "2024-02-05", predictedPrice: 51000, confidence: 80 },
]

const AuctionPredictionChart: React.FC = () => {
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">경매 시세 예측</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">AI 기반 고등어 경매가 예측</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <span>AI 예측 모델</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">85.2%</div>
                <div className="text-sm text-gray-600">예측 정확도</div>
              </div>
              <div className="text-sm text-gray-600">
                <p>• 최근 30일 평균 정확도</p>
                <p>• 시장 변동성 고려</p>
                <p>• 실시간 데이터 분석</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>다음 주 예측</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{formatCurrency(51000)}</div>
                <div className="text-sm text-gray-600">평균 예상가</div>
              </div>
              <div className="text-sm text-gray-600">
                <p>• 상승 추세 예상</p>
                <p>• ±5% 변동 가능</p>
                <p>• 계절성 요인 반영</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>주의사항</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <span>기상 악화 가능성</span>
              </div>
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <span>수요 증가 예상</span>
              </div>
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <span>공급량 감소 우려</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>예측 결과 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockPredictionData.map((prediction, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">{prediction.date}</span>
                    <span className="text-green-600 font-semibold">
                      {formatCurrency(prediction.predictedPrice)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                  <span className="text-sm text-gray-600">
                    신뢰도: <span className="font-semibold">{prediction.confidence}%</span>
                  </span>
                  {prediction.actualPrice && (
                    <span className="text-sm text-blue-600">
                      실제: <span className="font-semibold">{formatCurrency(prediction.actualPrice)}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuctionPredictionChart; 