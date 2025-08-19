/**
 * 재고 부족 경고 모달 컴포넌트
 * 출고 준비/출고 완료 시 재고 부족 상황을 상세하게 표시
 */
import React from "react"
import { Button } from "../ui/button"
import { AlertTriangle, Package, X } from "lucide-react"

interface InsufficientItem {
  fish_name: string
  required_quantity: number
  current_stock: number
  shortage: number
  unit: string
}

interface StockShortageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insufficientItems: InsufficientItem[]
  actionType: 'ready' | 'delivered' // 출고준비 or 출고완료
}

const StockShortageModal: React.FC<StockShortageModalProps> = ({
  open,
  onOpenChange,
  insufficientItems,
  actionType
}) => {
  if (!open || !insufficientItems?.length) return null

  const actionText = actionType === 'ready' ? '출고 준비' : '출고 완료'
  const totalShortageCount = insufficientItems.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h2 className="text-lg font-semibold text-red-800">재고 부족 경고</h2>
              <p className="text-sm text-red-600">
                {actionText} 처리가 불가능합니다
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4">
          {/* 요약 정보 */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <Package className="h-5 w-5" />
              부족 현황 요약
            </div>
            <p className="text-red-700">
              총 <span className="font-semibold">{totalShortageCount}개 어종</span>의 재고가 부족합니다.
              {actionText} 전에 재고를 보충해주세요.
            </p>
          </div>

          {/* 상세 목록 */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">부족 상세 내역</h3>
            <div className="space-y-3">
              {insufficientItems.map((item, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{item.fish_name}</h4>
                    <span className="text-sm px-2 py-1 bg-red-100 text-red-800 rounded">
                      {item.shortage}{item.unit} 부족
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">필요 수량:</span>
                      <div className="font-medium text-orange-600">
                        {item.required_quantity}{item.unit}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">현재 재고:</span>
                      <div className="font-medium text-blue-600">
                        {item.current_stock}{item.unit}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">부족 수량:</span>
                      <div className="font-medium text-red-600">
                        {item.shortage}{item.unit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 권장 사항 */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">권장 사항</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 재고 관리 페이지에서 부족한 어종의 재고를 보충하세요</li>
              <li>• 또는 주문 수량을 현재 재고에 맞게 조정하세요</li>
              <li>• 긴급한 경우 거래처에 납기 연기를 협의하세요</li>
            </ul>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              onOpenChange(false)
              // 재고 관리 페이지로 이동하는 로직을 여기에 추가할 수 있습니다
              // window.location.href = '/inventory'
            }}
          >
            재고 관리하러 가기
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StockShortageModal