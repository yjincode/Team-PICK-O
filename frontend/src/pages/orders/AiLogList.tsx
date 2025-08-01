import React from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Brain, Clock, TrendingUp } from "lucide-react"

interface AiLog {
  id: number;
  type: string;
  description: string;
  accuracy: number;
  timestamp: string;
  status: string;
}

const mockAiLogs: AiLog[] = [
  {
    id: 1,
    type: "가격 예측",
    description: "고등어 경매가 예측 분석 완료",
    accuracy: 85.2,
    timestamp: "2024-01-30 14:30:00",
    status: "완료",
  },
  {
    id: 2,
    type: "수요 예측",
    description: "다음 주 수요량 예측 분석",
    accuracy: 78.5,
    timestamp: "2024-01-30 13:15:00",
    status: "완료",
  },
  {
    id: 3,
    type: "재고 최적화",
    description: "재고 수준 최적화 권장사항 생성",
    accuracy: 92.1,
    timestamp: "2024-01-30 12:00:00",
    status: "처리중",
  },
]

const AiLogList: React.FC = () => {
  const getStatusBadge = (status: string) => {
    const variants = {
      "완료": "default",
      "처리중": "secondary",
      "오류": "destructive",
    } as const
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI 분석 로그</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">AI 분석 결과 및 로그</p>
      </div>

      <div className="space-y-4">
        {mockAiLogs.map((log) => (
          <Card key={log.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{log.type}</h3>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{log.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>정확도: <span className="font-semibold">{log.accuracy}%</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default AiLogList; 