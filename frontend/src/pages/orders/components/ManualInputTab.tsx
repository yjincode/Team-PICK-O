/**
 * 수동 입력 탭 컴포넌트
 * 주문 항목을 수동으로 입력하는 탭입니다.
 */
import React, { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Textarea } from "../../../components/ui/textarea"
import { OrderItem } from "../../../types"

interface ManualInputTabProps {

  businessId: number | null;
  fishTypes: Array<{ id: number; name: string; unit: string }>;
  currentItem: Partial<OrderItem>;
  setCurrentItem: (item: Partial<OrderItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  items: OrderItem[];
}

const ManualInputTab: React.FC<ManualInputTabProps> = ({
  currentItem,
  setCurrentItem,
  onAddItem,
  fishTypes,
  onItemChange
}) => {
  const handleFishTypeChange = (fishTypeId: string) => {
    const fishType = fishTypes?.find(f => f.id === parseInt(fishTypeId))
    if (fishType) {
      const updatedItem = {
        ...currentItem,
        fish_type: fishType.id,
        item_name_snapshot: fishType.name,
        unit_price: 0 // default_price가 없으므로 0으로 설정
      }
      setCurrentItem(updatedItem)
      onItemChange?.(updatedItem) // 아이템 변경 알림
    }
  }

  const handleQuantityChange = (value: string) => {
    const quantity = parseInt(value) || 0
    const updatedItem = { ...currentItem, quantity }
    setCurrentItem(updatedItem)
    onItemChange?.(updatedItem) // 아이템 변경 알림
  }

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = parseFloat(value) || 0
    const updatedItem = { ...currentItem, unit_price: unitPrice }
    setCurrentItem(updatedItem)
    onItemChange?.(updatedItem) // 아이템 변경 알림
  }

  // fishTypes가 배열인지 확인하고 안전하게 처리
  const safeFishTypes = Array.isArray(fishTypes) ? fishTypes : []

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-4">✏️ 수동 주문 입력</h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fish-type">어종 선택</Label>
            <Select onValueChange={handleFishTypeChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="어종을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {safeFishTypes.map((fish) => (
                  <SelectItem key={fish.id} value={fish.id.toString()}>
                    <div className="flex justify-between items-center w-full">
                      <span>{fish.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({fish.unit})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">수량</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={currentItem.quantity || ""}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="수량을 입력하세요"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-price">단가(원)</Label>
            <Input
              id="unit-price"
              type="number"
              min="0"
              value={currentItem.unit_price || ""}
              onChange={(e) => handleUnitPriceChange(e.target.value)}
              placeholder="단가를 입력하세요"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">단위</Label>
            <div className="flex items-center h-10 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
              {currentItem.unit || "어종을 먼저 선택하세요"}
            </div>
            <p className="text-xs text-gray-500">* 어종 등록 시 설정된 단위가 자동으로 적용됩니다</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">요청사항</Label>
          <Input
            id="remarks"
            value={currentItem.remarks || ""}
            onChange={(e) => setCurrentItem({ ...currentItem, remarks: e.target.value })}
            placeholder="특별한 요청사항이 있으시면 입력하세요"
            className="w-full bg-white"
          />
        </div>

        <Button 
          onClick={onAddItem} 
          className="w-full bg-gray-700 hover:bg-gray-800" 
          disabled={!currentItem.fish_type || !currentItem.quantity || !currentItem.unit_price}

        >
          <Plus className="h-4 w-4 mr-2" />
          항목 추가
        </Button>
        
        <p className="text-xs text-gray-600 mt-2">
          필수: 어종, 수량, 단가를 모두 입력해주세요. (단위는 어종 선택 시 자동 설정)
        </p>
      </div>
    </div>
  )
}

export default ManualInputTab 