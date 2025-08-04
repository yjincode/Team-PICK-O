/**
 * 주문 목록 페이지
 * 주문 내역을 조회하고 관리하는 페이지입니다
 */
import React, { useState } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Plus, Eye, Edit, Phone, Calendar } from "lucide-react"
import OrderForm from "./OrderForm"

// 주문 데이터 타입 정의 (새로운 DB 스키마 기반)
interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
  memo?: string;
  source_type: 'voice' | 'text' | 'manual';
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
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orders, setOrders] = useState(mockOrders)

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return '₩0'
    return `₩${amount.toLocaleString()}`
  }

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
    if (sourceType === 'voice') return '🎤'
    if (sourceType === 'manual') return '✏️'
    return '📝'
  }

  // 새 주문 처리
  const handleNewOrder = (orderData: any) => {
    console.log('받은 주문 데이터:', orderData) // 디버깅용
    
    // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
    const newOrder: Order = {
      id: orderData.order_id || Math.max(...orders.map(o => o.id)) + 1,
      business_id: orderData.business_id,
      total_price: orderData.total_price || 0,
      order_datetime: orderData.order_datetime || new Date().toISOString(),
      memo: orderData.memo || '',
      source_type: orderData.source_type || 'manual',
      transcribed_text: orderData.transcribed_text || '',
      delivery_date: orderData.delivery_date || '',
      status: orderData.status || 'pending',
      business: {
        id: orderData.business_id,
        business_name: orderData.business_name || '거래처명 없음',
        phone_number: orderData.phone_number || '연락처 없음',
      },
      items: orderData.order_items?.map((item: any, index: number) => ({
        id: index + 1,
        fish_type_id: item.fish_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit
      })) || []
    }
    
    console.log('변환된 주문 데이터:', newOrder) // 디버깅용
    
    setOrders(prev => [newOrder, ...prev])
    setShowOrderForm(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">주문 내역</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">주문 관리 및 현황</p>
        </div>
        <Button 
          className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto"
          onClick={() => setShowOrderForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />새 주문
        </Button>
      </div>

      {/* 주문 목록 */}
      <div className="space-y-4">
        {orders.map((order) => (
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
                       {getSourceTypeIcon(order.source_type)} {
                         order.source_type === 'voice' ? '음성' : 
                         order.source_type === 'manual' ? '수동' : '문자'
                       }
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

             {/* 주문 폼 모달 */}
       {showOrderForm && (
         <OrderForm
           onClose={() => setShowOrderForm(false)}
           onSubmit={handleNewOrder}
           // 테스트용 자동 주문 데이터 (주석 해제하여 테스트)
           parsedOrderData={{
             order: {
               business_id: 5678,
               contact: "010-1234-5678",
               delivery_date: "2025-08-05",
               transcribed_text: "안녕하세요, 이번에 도미 10kg이랑 방어 5마리 주문할게요. 납품은 8월 5일 오전 중으로 부탁드립니다."
             },
             order_items: [
               { fish_type_id: 201, quantity: 10, unit_price: 20000, unit: "kg" },
               { fish_type_id: 202, quantity: 5, unit_price: 15000, unit: "마리" }
             ]
           }}
         />
       )}
    </div>
  )
}

export default OrderList; 