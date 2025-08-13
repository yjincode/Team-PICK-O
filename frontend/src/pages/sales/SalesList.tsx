/**
 * 판매 내역 페이지
 * 매출 현황을 조회하고 관리하는 페이지입니다
 */
import React from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { TrendingUp, DollarSign, Calendar } from "lucide-react"

// 판매 기록 데이터 타입 정의
interface SalesRecord {
  id: number;
  date: string;
  businessName: string;  // 거래처명으로 변경
  items: string[];
  totalAmount: number;
  paymentStatus: string;
  deliveryStatus: string;
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockSalesRecords: SalesRecord[] = [
  {
    id: 1,
    date: "2024-01-30",
    businessName: "동해수산",
    items: ["고등어 50박스", "갈치 30박스"],
    totalAmount: 2400000,
    paymentStatus: "완료",
    deliveryStatus: "배송완료",
  },
  {
    id: 2,
    date: "2024-01-29",
    businessName: "바다마트",
    items: ["오징어 25박스"],
    totalAmount: 1200000,
    paymentStatus: "완료",
    deliveryStatus: "배송완료",
  },
  {
    id: 3,
    date: "2024-01-28",
    businessName: "해양식품",
    items: ["명태 40박스", "고등어 20박스"],
    totalAmount: 1800000,
    paymentStatus: "대기",
    deliveryStatus: "배송중",
  },
]

const SalesList: React.FC = () => {
  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  // 결제 상태에 따른 배지 색상 결정
  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      "완료": "default",
      "대기": "secondary",
      "연체": "destructive",
    } as const
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
  }

  // 배송 상태에 따른 배지 색상 결정
  const getDeliveryStatusBadge = (status: string) => {
    const variants = {
      "배송완료": "default",
      "배송중": "secondary",
      "배송대기": "outline",
    } as const
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">판매 내역</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">매출 현황 및 관리</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
          <TrendingUp className="h-4 w-4 mr-2" />매출 리포트
        </Button>
      </div>

      {/* 판매 기록 목록 */}
      <div className="space-y-4">
        {mockSalesRecords.map((record) => (
          <Card key={record.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  {/* 판매 헤더: 거래처명과 상태 */}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{record.businessName}</h3>
                    <div className="flex space-x-2">
                      {getPaymentStatusBadge(record.paymentStatus)}
                      {getDeliveryStatusBadge(record.deliveryStatus)}
                    </div>
                  </div>

                  {/* 판매 상세 정보 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">판매일:</span>
                      <span className="font-medium">{record.date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-gray-500">총 금액:</span>
                      <span className="font-semibold text-lg">{formatCurrency(record.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">주요 품목:</span>
                      <div className="mt-1">
                        {record.items.map((item, index) => (
                          <div key={index} className="text-gray-700">{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">상세보기</Button>
                  <Button variant="outline" size="sm">수정</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default SalesList; 