/**
 * 주문 목록 페이지
 * 주문 내역을 조회하고 관리하는 페이지입니다
 */
import React from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Plus, Eye, Edit, Phone, Calendar } from "lucide-react"

// 주문 데이터 타입 정의 (새로운 DB 스키마 기반)
interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
  memo?: string;
  source_type: 'voice' | 'text';
  transcribed_text?: string;
  delivery_date?: string;
  status: 'success' | 'failed' | 'pending';
  // 조인된 데이터
  business?: {
    id: number;
    business_name: string;
    phone_number: string;
  };
  items?: Array<{
    id: number;
    fish_type_id: number;
    quantity: number;
    unit_price?: number;
    unit?: string;
  }>;
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockOrders: Order[] = [
  {
    id: 1,
    business_id: 1,
    total_price: 2400000,
    order_datetime: "2024-01-30T10:30:00",
    memo: "급한 주문입니다",
    source_type: "voice",
    transcribed_text: "고등어 50박스, 갈치 30박스 주문해주세요",
    delivery_date: "2024-02-05",
    status: "pending",
    business: {
      id: 1,
      business_name: "동해수산",
      phone_number: "010-1234-5678",
    },
    items: [
      {
        id: 1,
        fish_type_id: 1,
        quantity: 50,
        unit_price: 48000,
        unit: "박스",
      },
      {
        id: 2,
        fish_type_id: 2,
        quantity: 30,
        unit_price: 65000,
        unit: "박스",
      },
    ],
  },
  {
    id: 2,
    business_id: 2,
    total_price: 1200000,
    order_datetime: "2024-01-29T14:15:00",
    memo: "정기 주문",
    source_type: "text",
    transcribed_text: "오징어 25박스 주문",
    delivery_date: "2024-02-03",
    status: "success",
    business: {
      id: 2,
      business_name: "바다마트",
      phone_number: "010-2345-6789",
    },
    items: [
      {
        id: 3,
        fish_type_id: 3,
        quantity: 25,
        unit_price: 48000,
        unit: "박스",
      },
    ],
  },
  {
    id: 3,
    business_id: 3,
    total_price: 1800000,
    order_datetime: "2024-01-28T09:00:00",
    memo: "신규 거래처",
    source_type: "voice",
    transcribed_text: "명태 40박스, 고등어 20박스 주문",
    delivery_date: "2024-02-10",
    status: "pending",
    business: {
      id: 3,
      business_name: "해양식품",
      phone_number: "010-3456-7890",
    },
    items: [
      {
        id: 4,
        fish_type_id: 4,
        quantity: 40,
        unit_price: 45000,
        unit: "박스",
      },
      {
        id: 5,
        fish_type_id: 1,
        quantity: 20,
        unit_price: 48000,
        unit: "박스",
      },
    ],
  },
]

const OrderList: React.FC = () => {
  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  // 주문 상태에 따른 배지 색상 결정
  const getStatusBadge = (status: string) => {
    const variants = {
      "success": "default",
      "pending": "secondary",
      "failed": "destructive",
    } as const
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>
  }

  // 주문 소스 타입에 따른 아이콘
  const getSourceTypeIcon = (sourceType: string) => {
    return sourceType === 'voice' ? '🎤' : '📝'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">주문 내역</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">주문 관리 및 현황</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />새 주문
        </Button>
      </div>

      {/* 주문 목록 */}
      <div className="space-y-4">
        {mockOrders.map((order) => (
          <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  {/* 주문 헤더: 거래처명과 상태 */}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {order.business?.business_name}
                    </h3>
                    {getStatusBadge(order.status)}
                    <span className="text-sm text-gray-500">
                      {getSourceTypeIcon(order.source_type)} {order.source_type === 'voice' ? '음성' : '텍스트'}
                    </span>
                  </div>
                  
                  {/* 주문 상세 정보 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">연락처:</span>
                      <span className="font-medium">{order.business?.phone_number}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">주문일:</span>
                      <span className="font-medium">
                        {new Date(order.order_datetime).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">총 금액:</span>
                      <div className="font-semibold text-lg">{formatCurrency(order.total_price)}</div>
                    </div>
                  </div>

                  {/* 주문 메모 및 음성/텍스트 내용 */}
                  {order.memo && (
                    <div className="mt-2">
                      <span className="text-gray-500">메모:</span>
                      <p className="text-gray-700">{order.memo}</p>
                    </div>
                  )}
                  {order.transcribed_text && (
                    <div className="mt-2">
                      <span className="text-gray-500">원문:</span>
                      <p className="text-gray-700 italic">"{order.transcribed_text}"</p>
                    </div>
                  )}

                  {/* 주문 아이템 */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-500">주문 품목:</span>
                      <div className="mt-1 space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-gray-700">
                            • {item.quantity}{item.unit} (₩{item.unit_price?.toLocaleString()}/개)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 액션 버튼들 */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Eye className="h-4 w-4 mr-2" />상세보기
                  </Button>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Edit className="h-4 w-4 mr-2" />수정
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default OrderList; 