"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Brain, Activity, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react"

const mockAILogs = [
  {
    logId: "AI-LOG-001",
    analyzedItem: "고등어 수요 예측",
    result: "다음 주 고등어 수요 30% 증가 예상",
    confidenceScore: 87.5,
    createdAt: "2024-01-30 14:30:25",
    status: "성공",
    category: "수요예측",
  },
  {
    logId: "AI-LOG-002",
    analyzedItem: "갈치 가격 동향 분석",
    result: "갈치 가격 15% 상승 예상 (공급량 감소)",
    confidenceScore: 92.3,
    createdAt: "2024-01-30 13:15:42",
    status: "성공",
    category: "가격분석",
  },
  {
    logId: "AI-LOG-003",
    analyzedItem: "오징어 재고 최적화",
    result: "현재 재고량 적정, 추가 발주 불필요",
    confidenceScore: 78.9,
    createdAt: "2024-01-30 12:00:15",
    status: "처리중",
    category: "재고최적화",
  },
  {
    logId: "AI-LOG-004",
    analyzedItem: "명태 주문 패턴 분석",
    result: "데이터 부족으로 분석 실패",
    confidenceScore: 0,
    createdAt: "2024-01-30 11:45:33",
    status: "실패",
    category: "패턴분석",
  },
]

export default function AiLogList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("전체")

  const categories = ["전체", "수요예측", "가격분석", "재고최적화", "패턴분석"]

  const getStatusIcon = (status) => {
    switch (status) {
      case "성공":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "실패":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "처리중":
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "성공":
        return "default"
      case "실패":
        return "destructive"
      case "처리중":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case "수요예측":
        return "bg-blue-100 text-blue-800"
      case "가격분석":
        return "bg-green-100 text-green-800"
      case "재고최적화":
        return "bg-purple-100 text-purple-800"
      case "패턴분석":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getConfidenceColor = (score) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const successCount = mockAILogs.filter((log) => log.status === "성공").length
  const avgConfidence =
    mockAILogs.filter((log) => log.status === "성공").reduce((sum, log) => sum + log.confidenceScore, 0) / successCount

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-accent-blue" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI 분석 로그</h1>
            <p className="text-gray-600 mt-1">인공지능 분석 결과 및 예측 로그</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-accent-blue" />
              <div>
                <p className="text-sm text-gray-600">총 분석 건수</p>
                <p className="text-xl font-bold text-gray-900">{mockAILogs.length}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">성공 분석</p>
                <p className="text-xl font-bold text-green-600">{successCount}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">평균 신뢰도</p>
                <p className="text-xl font-bold text-blue-600">{avgConfidence.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">처리중</p>
                <p className="text-xl font-bold text-yellow-600">
                  {mockAILogs.filter((log) => log.status === "처리중").length}건
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="분석 항목으로 검색..."
                className="pl-10 bg-white border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Logs List */}
      <div className="space-y-4">
        {mockAILogs.map((log) => (
          <Card key={log.logId} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(log.status)}
                    <h3 className="text-lg font-semibold text-gray-900">{log.logId}</h3>
                    <Badge variant={getStatusColor(log.status)} className="text-xs">
                      {log.status}
                    </Badge>
                    <Badge className={`text-xs ${getCategoryColor(log.category)}`}>{log.category}</Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-gray-800">분석 항목</p>
                      <p className="text-gray-700">{log.analyzedItem}</p>
                    </div>

                    <div>
                      <p className="font-medium text-gray-800">분석 결과</p>
                      <p className="text-gray-700">{log.result}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>분석 시간: {log.createdAt}</span>
                      {log.status === "성공" && (
                        <div className="flex items-center space-x-2">
                          <span>신뢰도:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  log.confidenceScore >= 80
                                    ? "bg-green-500"
                                    : log.confidenceScore >= 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${log.confidenceScore}%` }}
                              ></div>
                            </div>
                            <span className={`font-semibold ${getConfidenceColor(log.confidenceScore)}`}>
                              {log.confidenceScore}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    상세보기
                  </Button>
                  {log.status === "성공" && (
                    <Button size="sm" className="bg-accent-blue hover:bg-accent-blue/90">
                      적용
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 