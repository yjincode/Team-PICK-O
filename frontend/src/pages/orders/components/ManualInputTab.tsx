/**
 * 수동 입력 탭 컴포넌트
 * 주문 항목을 수동으로 입력하는 탭입니다.
 */
import type { FC } from "react"
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
  delivery_datetime: string
}

interface ManualInputTabProps {
  currentItem: Partial<OrderItem>
  setCurrentItem: (item: Partial<OrderItem>) => void
  onAddItem: () => void
  fishTypes: FishType[]
}

const ManualInputTab: FC<ManualInputTabProps> = ({
  currentItem,
  setCurrentItem,
  onAddItem,
  fishTypes
}) => {
  const handleFishTypeChange = (fishTypeId: string) => {
    const fishType = fishTypes?.find(f => f.id === parseInt(fishTypeId))
    if (fishType) {
      setCurrentItem({
        ...currentItem,
        fish_type_id: fishType.id,
        fish_name: fishType.name,  // fish_name에서 name으로 변경
        unit_price: 0 // default_price가 없으므로 0으로 설정
      })
    }
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
                    {fish.name}
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
              onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 0 })}
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
              onChange={(e) => setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) || 0 })}
              placeholder="단가를 입력하세요"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">단위</Label>
            <Select onValueChange={(value) => setCurrentItem({ ...currentItem, unit: value })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="단위 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="박스">박스</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="마리">마리</SelectItem>
                <SelectItem value="개">개</SelectItem>
                <SelectItem value="통">통</SelectItem>
                <SelectItem value="팩">팩</SelectItem>
              </SelectContent>
            </Select>
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
          disabled={!currentItem.fish_type_id || !currentItem.quantity || !currentItem.unit_price}
        >
          <Plus className="h-4 w-4 mr-2" />
          항목 추가
        </Button>
        
        <p className="text-xs text-gray-600 mt-2">
          필수: 어종, 수량, 단가를 모두 입력해주세요.
        </p>
      </div>
    </div>
  )
}

export default ManualInputTab 