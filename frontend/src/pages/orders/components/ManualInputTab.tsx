/**
 * 수동 입력 탭 컴포넌트
 * 주문 항목을 수동으로 입력하는 탭입니다.
 */
import React from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Plus } from "lucide-react"
import type { FishType } from "../../../types"

// 주문 항목 타입 정의
interface OrderItem {
  id: string
  fish_type_id: number
  fish_name: string
  quantity: number
  unit_price: number
  unit: string
  remarks?: string
  delivery_date: string
}

interface ManualInputTabProps {
  currentItem: Partial<OrderItem>
  setCurrentItem: (item: Partial<OrderItem>) => void
  onAddItem: () => void
  fishTypes: FishType[]
}

const ManualInputTab: React.FC<ManualInputTabProps> = ({
  currentItem,
  setCurrentItem,
  onAddItem,
  fishTypes
}) => {
  const handleFishTypeChange = (fishTypeId: string) => {
    const fishType = fishTypes.find(f => f.id === parseInt(fishTypeId))
    if (fishType) {
      setCurrentItem({
        ...currentItem,
        fish_type_id: fishType.id,
        fish_name: fishType.fish_name,
        unit_price: 0 // default_price가 없으므로 0으로 설정
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fish-type">어종 선택</Label>
          <Select onValueChange={handleFishTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="어종을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {fishTypes.map((fish) => (
                <SelectItem key={fish.id} value={fish.id.toString()}>
                  {fish.fish_name}
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
            value={currentItem.quantity || ""}
            onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) || 0 })}
            placeholder="수량을 입력하세요"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit-price">단가</Label>
          <Input
            id="unit-price"
            type="number"
            value={currentItem.unit_price || ""}
            onChange={(e) => setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) || 0 })}
            placeholder="단가를 입력하세요"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">단위</Label>
          <Input
            id="unit"
            value={currentItem.unit || ""}
            onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
            placeholder="kg, 마리 등"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="delivery-date">납품일</Label>
          <Input
            id="delivery-date"
            type="date"
            value={currentItem.delivery_date || ""}
            onChange={(e) => setCurrentItem({ ...currentItem, delivery_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">요청사항</Label>
          <Input
            id="remarks"
            value={currentItem.remarks || ""}
            onChange={(e) => setCurrentItem({ ...currentItem, remarks: e.target.value })}
            placeholder="요청사항을 입력하세요"
          />
        </div>
      </div>

      <Button 
        onClick={onAddItem} 
        className="w-full" 
        disabled={!currentItem.fish_type_id || !currentItem.quantity}
      >
        <Plus className="h-4 w-4 mr-2" />
        항목 추가
      </Button>
    </div>
  )
}

export default ManualInputTab 