/**
 * 미수금 내역 페이지
 * 미수금 현황을 조회하고 관리하는 페이지입니다
 */
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { AlertTriangle, DollarSign, Calendar } from "lucide-react"

// 미수금 거래처 데이터 타입 정의
interface UnpaidBusiness {
  id: number;           // 거래처 ID
  business_name: string; // 거래처명
  phone_number: string;  // 연락처
  address?: string;      // 주소
  amount: number;        // 미수금액
  dueDate: string;       // 만기일
  daysOverdue: number;   // 연체일수
  // 추가 정보 (실제로는 별도 API에서 가져올 예정)
  contact?: string;      // 담당자
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockUnpaidBusinesses: UnpaidBusiness[] = [
  {
    id: 1,
    business_name: "동해수산",
    phone_number: "010-1234-5678",
    address: "강원도 동해시",
    amount: 2400000,
    dueDate: "2024-01-15",
    daysOverdue: 15,
    contact: "김철수",
  },
  {
    id: 2,
    business_name: "해양식품",
    phone_number: "010-3456-7890",
    address: "인천시 연수구",
    amount: 1800000,
    dueDate: "2024-01-20",
    daysOverdue: 10,
    contact: "박민수",
  },
  {
    id: 3,
    business_name: "신선수산",
    phone_number: "010-4567-8901",
    address: "경기도 시흥시",
    amount: 3200000,
    dueDate: "2024-01-10",
    daysOverdue: 20,
    contact: "최지훈",
  },
]

const UnpaidList: React.FC = () => {
  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">미수금 내역</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">미수금 현황 및 관리</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          <AlertTriangle className="h-4 w-4 mr-2" />
          긴급 연락
        </Button>
      </div>

      {/* 미수금 거래처 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mockUnpaidBusinesses.map((business) => (
          <Card key={business.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">{business.business_name}</CardTitle>
                {/* 연체 상태 배지 */}
                <Badge variant={business.daysOverdue > 15 ? "destructive" : "secondary"}>
                  {business.daysOverdue}일 연체
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 미수금액 표시 */}
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="font-semibold text-red-600">{formatCurrency(business.amount)}</span>
              </div>
              
              {/* 만기일 정보 */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>만기일: {business.dueDate}</span>
              </div>
              
              {/* 연락처 정보 */}
              <div className="text-sm">
                <p>연락처: {business.phone_number}</p>
                {business.address && <p>주소: {business.address}</p>}
                {business.contact && <p>담당자: {business.contact}</p>}
              </div>
              
              {/* 액션 버튼들 */}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  연락하기
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  정산하기
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default UnpaidList; 