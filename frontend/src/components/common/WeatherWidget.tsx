import React from "react"
import { Card, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"

export const WeatherWidget: React.FC = () => {
  return (
    <Card className="w-full sm:w-64 shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-500 text-base sm:text-lg">🌡️</span>
              <span className="text-base sm:text-lg font-semibold">18°C</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">동해</p>
          </div>
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