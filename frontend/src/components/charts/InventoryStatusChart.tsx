/**
 * 재고 현황 차트 컴포넌트
 * 어류 재고 상태를 시각적으로 표시하는 차트입니다
 * TODO: 실제 차트 라이브러리(Chart.js, Recharts 등) 연동 필요
 */
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Package, AlertTriangle, CheckCircle } from "lucide-react"

// 재고 데이터 타입 정의
interface InventoryData {
  name: string;
  quantity: number;
  status: "sufficient" | "moderate" | "low";
  lastUpdated: string;
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockInventoryData: InventoryData[] = [
  { name: "고등어", quantity: 150, status: "sufficient", lastUpdated: "2024-01-30" },
  { name: "갈치", quantity: 80, status: "moderate", lastUpdated: "2024-01-30" },
  { name: "오징어", quantity: 25, status: "low", lastUpdated: "2024-01-29" },
  { name: "명태", quantity: 200, status: "sufficient", lastUpdated: "2024-01-30" },
]

const InventoryStatusChart: React.FC = () => {
  // 재고 상태에 따른 아이콘 반환
  const getStatusIcon = (status: InventoryData['status']) => {
    switch (status) {
      case "sufficient":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "moderate":
        return <Package className="h-4 w-4 text-yellow-500" />
      case "low":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
  }

  // 재고 상태에 따른 텍스트 반환
  const getStatusText = (status: InventoryData['status']) => {
    switch (status) {
      case "sufficient":
        return "충분"
      case "moderate":
        return "보통"
      case "low":
        return "부족"
    }
  }

  // 재고 상태에 따른 색상 반환
  const getStatusColor = (status: InventoryData['status']) => {
    switch (status) {
      case "sufficient":
        return "text-green-600"
      case "moderate":
        return "text-yellow-600"
      case "low":
        return "text-red-600"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-500" />
          <span>재고 현황</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 재고 데이터 리스트 */}
        <div className="space-y-3">
          {mockInventoryData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {/* 아이템 정보 */}
              <div className="flex items-center space-x-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.quantity}박스</div>
                </div>
              </div>
              
              {/* 상태 정보 */}
              <div className="text-right">
                <div className={`font-medium ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </div>
                <div className="text-xs text-gray-500">{item.lastUpdated}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default InventoryStatusChart; 