import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Button } from './button'
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'

interface AnomalyData {
  type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  recommended_action: string
  anomaly_score: number
}

interface AnomalyDisplayProps {
  anomalies: {
    primary: AnomalyData
    secondary: AnomalyData[]
    total_count: number
    has_secondary: boolean
  }
  onResolve?: () => void
}

const AnomalyDisplay: React.FC<AnomalyDisplayProps> = ({ anomalies, onResolve }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          color: 'bg-red-600',
          icon: '🚨',
          text: '긴급',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800'
        }
      case 'HIGH':
        return {
          color: 'bg-orange-500',
          icon: '⚠️',
          text: '주의',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800'
        }
      case 'MEDIUM':
        return {
          color: 'bg-yellow-500',
          icon: '확인',
          text: '확인',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800'
        }
      default:
        return {
          color: 'bg-gray-500',
          icon: '',
          text: '정보',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800'
        }
    }
  }

  const primaryInfo = getSeverityInfo(anomalies.primary.severity)

  return (
    <div className="space-y-4">
      {/* 주요 이상탐지 (항상 표시) */}
      <Card className={`${primaryInfo.bgColor} ${primaryInfo.borderColor} border-2`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center space-x-3 ${primaryInfo.textColor} text-lg`}>
            <Badge className={`${primaryInfo.color} text-white text-sm px-3 py-1 font-bold`}>
              {primaryInfo.icon} {primaryInfo.text}
            </Badge>
            <span className="font-bold">{anomalies.primary.type}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className={`${primaryInfo.textColor} font-medium`}>
            {anomalies.primary.description}
          </p>
          <div className="bg-white p-3 rounded-lg border">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">권장 조치:</span> {anomalies.primary.recommended_action}
            </p>
          </div>
          {onResolve && (
            <Button 
              onClick={onResolve}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              확인 완료
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 추가 확인사항 (접기/펼치기) */}
      {anomalies.has_secondary && (
        <Card className="border border-gray-200">
          <CardHeader 
            className="pb-3 cursor-pointer hover:bg-gray-50"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">추가 확인사항</span>
                <Badge variant="outline" className="text-xs">
                  {anomalies.secondary.length}개
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="space-y-3 pt-0">
              {anomalies.secondary.map((anomaly, index) => {
                const info = getSeverityInfo(anomaly.severity)
                return (
                  <div key={index} className={`p-3 rounded-lg ${info.bgColor} border ${info.borderColor}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={`${info.color} text-white text-xs px-2 py-1`}>
                        {info.icon} {info.text}
                      </Badge>
                      <span className={`font-medium ${info.textColor}`}>
                        {anomaly.type}
                      </span>
                    </div>
                    <p className={`text-sm ${info.textColor} mb-2`}>
                      {anomaly.description}
                    </p>
                    <div className="bg-white p-2 rounded text-xs text-gray-600">
                      {anomaly.recommended_action}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

export default AnomalyDisplay
