"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { TrendingUp, TrendingDown, Activity, Brain, Calendar, RefreshCw } from "lucide-react"

const mockPredictions = [
  {
    fishName: "고등어",
    currentPrice: 12000,
    predictedPrice: 13800,
    change: 15.0,
    trend: "상승",
    confidence: 87.5,
    lastUpdated: "2024-01-30 14:30",
  },
  {
    fishName: "갈치",
    currentPrice: 18000,
    predictedPrice: 16200,
    change: -10.0,
    trend: "하락",
    confidence: 92.3,
    lastUpdated: "2024-01-30 14:25",
  },
  {
    fishName: "오징어",
    currentPrice: 15000,
    predictedPrice: 17250,
    change: 15.0,
    trend: "상승",
    confidence: 78.9,
    lastUpdated: "2024-01-30 14:20",
  },
  {
    fishName: "명태",
    currentPrice: 22000,
    predictedPrice: 20900,
    change: -5.0,
    trend: "하락",
    confidence: 84.2,
    lastUpdated: "2024-01-30 14:15",
  },
  {
    fishName: "참치",
    currentPrice: 35000,
    predictedPrice: 35700,
    change: 2.0,
    trend: "보합",
    confidence: 76.8,
    lastUpdated: "2024-01-30 14:10",
  },
  {
    fishName: "연어",
    currentPrice: 28000,
    predictedPrice: 25200,
    change: -10.0,
    trend: "하락",
    confidence: 89.1,
    lastUpdated: "2024-01-30 14:05",
  },
]

const marketFactors = [
  { factor: "계절적 요인", impact: "높음", description: "겨울철 수요 증가로 인한 가격 상승 예상" },
  { factor: "공급량 변화", impact: "중간", description: "어획량 감소로 인한 공급 부족" },
  { factor: "수출 동향", impact: "낮음", description: "해외 수출 증가로 인한 국내 공급 감소" },
  { factor: "유가 변동", impact: "중간", description: "연료비 상승으로 인한 운송비 증가" },
]

export default function AuctionPredictionChart() {
  const formatCurrency = (amount) => `₩${amount.toLocaleString()}`

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "상승":
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case "하락":
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case "보합":
        return <Activity className="h-5 w-5 text-gray-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getTrendColor = (trend) => {
    switch (trend) {
      case "상승":
        return "text-green-600"
      case "하락":
        return "text-red-600"
      case "보합":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return "text-green-600"
    if (confidence >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case "높음":
        return "bg-red-100 text-red-800"
      case "중간":
        return "bg-yellow-100 text-yellow-800"
      case "낮음":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const avgConfidence = mockPredictions.reduce((sum, pred) => sum + pred.confidence, 0) / mockPredictions.length
  const upTrends = mockPredictions.filter((pred) => pred.trend === "상승").length
  const downTrends = mockPredictions.filter((pred) => pred.trend === "하락").length

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-accent-blue" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">경매 시세 예측</h1>
            <p className="text-gray-600 mt-1">AI 기반 실시간 경매가 예측 및 시장 분석</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            예측 기간
          </Button>
          <Button className="bg-accent-blue hover:bg-accent-blue/90">
            <RefreshCw className="h-4 w-4 mr-2" />
            업데이트
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-accent-blue" />
              <div>
                <p className="text-sm text-gray-600">분석 어종</p>
                <p className="text-xl font-bold text-gray-900">{mockPredictions.length}종</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">상승 예상</p>
                <p className="text-xl font-bold text-green-600">{upTrends}종</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">하락 예상</p>
                <p className="text-xl font-bold text-red-600">{downTrends}종</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Brain className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">평균 신뢰도</p>
                <p className="text-xl font-bold text-purple-600">{avgConfidence.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Prediction Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">시세 예측 차트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 bg-muted rounded-lg flex items-center justify-center mb-6">
            <div className="text-center text-gray-500">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">[Auction Prediction Chart Placeholder]</p>
              <p className="text-sm">경매 시세 예측 트렌드 차트가 표시됩니다</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockPredictions.map((prediction) => (
          <Card key={prediction.fishName} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{prediction.fishName}</h3>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(prediction.trend)}
                  <Badge
                    variant={
                      prediction.trend === "상승"
                        ? "default"
                        : prediction.trend === "하락"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-sm"
                  >
                    {prediction.trend}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">현재 시세</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(prediction.currentPrice)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">예상 시세</span>
                  <span className={`font-bold ${getTrendColor(prediction.trend)}`}>
                    {formatCurrency(prediction.predictedPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">변동률</span>
                  <div className="flex items-center space-x-1">
                    <span className={`font-medium ${getTrendColor(prediction.trend)}`}>
                      {prediction.change > 0 ? "+" : ""}
                      {prediction.change}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">신뢰도</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          prediction.confidence >= 85
                            ? "bg-green-500"
                            : prediction.confidence >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${prediction.confidence}%` }}
                      ></div>
                    </div>
                    <span className={`font-semibold text-sm ${getConfidenceColor(prediction.confidence)}`}>
                      {prediction.confidence}%
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-2 border-t">최종 업데이트: {prediction.lastUpdated}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Factors */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">시장 영향 요인</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketFactors.map((factor, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{factor.factor}</h4>
                  <Badge className={`text-xs ${getImpactColor(factor.impact)}`}>{factor.impact}</Badge>
                </div>
                <p className="text-sm text-gray-600">{factor.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 