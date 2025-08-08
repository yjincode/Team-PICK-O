/**
 * 주문 상세 정보 컴포넌트
 * 
 * 선택된 주문의 상세 정보를 모달로 표시합니다.
 */
import React from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { X } from "lucide-react"
import { format } from "date-fns"
import { formatPhoneNumber } from "../../utils/phoneFormatter"

interface OrderDetailProps {
  order: any
  onClose: () => void
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, onClose }) => {
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: "대기중",
      paid: "결제완료", 
      ready: "출고준비",
      delivered: "출고완료",
      cancelled: "취소됨"
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-blue-100 text-blue-800",
      ready: "bg-orange-100 text-orange-800", 
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    }
    return colorMap[status] || "bg-gray-100 text-gray-800"
  }

  const totalAmount = order.items?.reduce((sum: number, item: any) => 
    sum + (item.quantity * item.unit_price), 0
  ) || order.total_price || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">
              주문 상세 정보 #{order.id}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">거래처 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">거래처명:</span>
                    <span className="ml-2">{order.business?.business_name || "정보 없음"}</span>
                  </div>
                  <div>
                    <span className="font-medium">연락처:</span>
                    <span className="ml-2">{order.business?.phone_number ? formatPhoneNumber(order.business.phone_number) : "정보 없음"}</span>
                  </div>
                  <div>
                    <span className="font-medium">주소:</span>
                    <span className="ml-2">{order.business?.address || "정보 없음"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">주문 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">주문일시:</span>
                    <span className="ml-2">
                      {format(new Date(order.order_datetime), "yyyy-MM-dd HH:mm")}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">배송일:</span>
                    <span className="ml-2">
                      {order.delivery_date ? format(new Date(order.delivery_date), "yyyy-MM-dd") : "미정"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">주문 상태:</span>
                    <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                  {order.is_urgent && (
                    <div>
                      <Badge className="bg-red-100 text-red-800">
                        🚨 긴급 주문
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 주문 항목 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">주문 항목</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">품목</th>
                        <th className="text-right p-2">수량</th>
                        <th className="text-right p-2">단가</th>
                        <th className="text-right p-2">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">
                            {item.item_name_snapshot || `어종 ID: ${item.fish_type_id}`}
                            {item.remarks && (
                              <div className="text-sm text-gray-500">비고: {item.remarks}</div>
                            )}
                          </td>
                          <td className="text-right p-2">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="text-right p-2">
                            {item.unit_price?.toLocaleString()}원
                          </td>
                          <td className="text-right p-2 font-medium">
                            {(item.quantity * item.unit_price).toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td colSpan={3} className="p-2 font-bold text-right">총 금액:</td>
                        <td className="p-2 font-bold text-right text-blue-600">
                          {totalAmount.toLocaleString()}원
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 메모 */}
            {order.memo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">메모</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.memo}</p>
                </CardContent>
              </Card>
            )}

            {/* 원본 텍스트 */}
            {order.transcribed_text && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">원본 텍스트</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.transcribed_text}</p>
                </CardContent>
              </Card>
            )}

            {/* 닫기 버튼 */}
            <div className="flex justify-end pt-4">
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
                닫기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OrderDetail