import React from "react"
import { Card, CardContent } from "../ui/card.jsx"
import { Badge } from "../ui/badge.jsx"

export function WeatherWidget() {
  return (
    <Card className="w-64 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-500 text-lg">🌡️</span>
              <span className="text-lg font-semibold">18°C</span>
            </div>
            <p className="text-sm text-gray-600">동해</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 text-blue-600">
              <span className="text-lg">🌧️</span>
              <span className="text-sm">비 예보</span>
            </div>
            <Badge variant="outline" className="text-xs mt-1">출항 주의</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 