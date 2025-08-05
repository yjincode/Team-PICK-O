/**
 * 날씨 위젯 컴포넌트
 * 대시보드에서 현재 날씨 정보와 출항 주의사항을 표시합니다
 * TODO: 실제 날씨 API 연동 필요
 */
import React from "react"
import { Card, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"

export const WeatherWidget: React.FC = () => {
  return (
    <Card className="w-full sm:w-64 shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          {/* 온도 정보 */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-500 text-base sm:text-lg">🌡️</span>
              <span className="text-base sm:text-lg font-semibold">18°C</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">동해</p>
          </div>
          
          {/* 날씨 및 주의사항 */}
          <div className="text-right">
            <div className="flex items-center space-x-1 text-blue-600">
              <span className="text-base sm:text-lg">🌧️</span>
              <span className="text-xs sm:text-sm">비 예보</span>
            </div>
            <Badge variant="outline" className="text-xs mt-1">출항 주의</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 