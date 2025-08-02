import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Package, AlertTriangle, CheckCircle } from "lucide-react"

interface InventoryData {
  name: string;
  quantity: number;
  status: "sufficient" | "moderate" | "low";
  lastUpdated: string;
}

const mockInventoryData: InventoryData[] = [
  { name: "고등어", quantity: 150, status: "sufficient", lastUpdated: "2024-01-30" },
  { name: "갈치", quantity: 80, status: "moderate", lastUpdated: "2024-01-30" },
  { name: "오징어", quantity: 25, status: "low", lastUpdated: "2024-01-29" },
  { name: "명태", quantity: 200, status: "sufficient", lastUpdated: "2024-01-30" },
]

const InventoryStatusChart: React.FC = () => {
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
        <div className="space-y-3">
          {mockInventoryData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.quantity}박스</div>
                </div>
              </div>
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