"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react"

interface MonthlySales {
  month: string
  sales: number
  change: number
  isPositive: boolean
}

const mockMonthlySales: MonthlySales[] = [
  { month: "1월", sales: 45600000, change: 12.5, isPositive: true },
  { month: "2월", sales: 52300000, change: 14.7, isPositive: true },
  { month: "3월", sales: 48900000, change: -6.5, isPositive: false },
  { month: "4월", sales: 56700000, change: 15.9, isPositive: true },
  { month: "5월", sales: 61200000, change: 7.9, isPositive: true },
  { month: "6월", sales: 58400000, change: -4.6, isPositive: false },
]

const topProducts = [
  { name: "고등어", sales: 12800000, percentage: 28.1, trend: "상승" },
  { name: "갈치", sales: 9600000, percentage: 21.1, trend: "하락" },
  { name: "오징어", sales: 7200000, percentage: 15.8, trend: "상승" },
  { name: "참치", sales: 6400000, percentage: 14.0, trend: "상승" },
  { name: "연어", sales: 4800000, percentage: 10.5, trend: "하락" },
]

const paymentMethods = [
  { method: "카드", amount: 28400000, percentage: 45.2 },
  { method: "계좌이체", amount: 19800000, percentage: 31.5 },
  { method: "현금", amount: 8900000, percentage: 14.2 },
  { method: "외상", amount: 5700000, percentage: 9.1 },
]

export default function SalesChart() {
  const formatCurrency = (amount: number) => `₩${amount.toLocaleString()}`

  const totalSales = mockMonthlySales.reduce((sum, month) => sum + month.sales, 0)
  const avgMonthlySales = totalSales / mockMonthlySales.length

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-accent-blue" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">매출 통계</h1>
            <p className="text-gray-600 mt-1">월별 매출 현황 및 상세 분석</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            기간 선택
          </Button>
          <Button className="bg-accent-blue hover:bg-accent-blue/90">리포트 생성</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-accent-blue" />
              <div>
                <p className="text-sm text-gray-600">총 매출</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">월평균 매출</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(avgMonthlySales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">최고 매출월</p>
                <p className="text-xl font-bold text-blue-600">5월</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">성장률</p>
                <p className="text-xl font-bold text-purple-600">+8.2%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 bg-muted rounded-lg flex items-center justify-center mb-6">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">[Sales Chart Placeholder]</p>
              <p className="text-sm">월별 매출 추이 차트가 표시됩니다</p>
            </div>
          </div>

          {/* Monthly Sales Data */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {mockMonthlySales.map((month) => (
              <div key={month.month} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{month.month}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(month.sales)}</p>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  {month.isPositive ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${month.isPositive ? "text-green-600" : "text-red-600"}`}>
                    {month.isPositive ? "+" : ""}
                    {month.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">인기 어종 TOP 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent-blue/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-accent-blue">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(product.sales)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">
                      {product.percentage}%
                    </Badge>
                    <div className="flex items-center space-x-1">
                      {product.trend === "상승" ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs ${product.trend === "상승" ? "text-green-600" : "text-red-600"}`}>
                        {product.trend}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">결제 방법별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 bg-muted rounded-lg flex items-center justify-center mb-4">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">[Payment Methods Chart]</p>
              </div>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-accent-blue rounded-full"></div>
                    <span className="font-medium text-gray-900">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(method.amount)}</p>
                    <p className="text-sm text-gray-600">{method.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
