/**
 * 재고 관리 폼 페이지
 * 새로운 재고 정보를 등록하고 관리하는 폼 페이지입니다
 */
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Package, Save, X } from "lucide-react"

// 재고 폼 데이터 타입 정의
interface InventoryFormData {
  fish_type_id: number;    // 어종 ID
  stock_quantity: number;  // 재고 수량
  unit: string;           // 단위
  status: string;         // 상태
  aquarium_photo_path?: string; // 수족관 사진 경로
}

// 어종 선택을 위한 타입
interface FishType {
  id: number;
  fish_name: string;
  aliases?: string[];
}

const FishItemForm: React.FC = () => {
  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState<InventoryFormData>({
    fish_type_id: 0,
    stock_quantity: 0,
    unit: "박스",
    status: "available",
    aquarium_photo_path: "",
  })

  // 어종 목록 (실제로는 API에서 가져올 예정)
  const [fishTypes] = useState<FishType[]>([
    { id: 1, fish_name: "고등어", aliases: ["광어", "넙치"] },
    { id: 2, fish_name: "갈치", aliases: ["가자미"] },
    { id: 3, fish_name: "오징어", aliases: ["문어"] },
    { id: 4, fish_name: "명태", aliases: ["대구"] },
  ])

  // 입력 필드 변경 핸들러
  const handleInputChange = (field: keyof InventoryFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 백엔드 API 연동
    // POST /api/inventories
    // 요청 예시: { fish_type_id: number, stock_quantity: number, unit: string, status: string }
    // 응답 예시: { data: Inventory, success: true }
    console.log("Inventory form submitted:", formData)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">재고 관리</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">새로운 재고 정보 등록</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 기본 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>기본 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fish_type">어종 선택</Label>
                <select
                  id="fish_type"
                  value={formData.fish_type_id}
                  onChange={(e) => handleInputChange('fish_type_id', Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={0}>어종을 선택하세요</option>
                  {fishTypes.map((fishType) => (
                    <option key={fishType.id} value={fishType.id}>
                      {fishType.fish_name}
                      {fishType.aliases && fishType.aliases.length > 0 && 
                        ` (${fishType.aliases.join(', ')})`
                      }
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock_quantity">재고 수량</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => handleInputChange('stock_quantity', Number(e.target.value))}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit">단위</Label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="박스">박스</option>
                    <option value="kg">kg</option>
                    <option value="마리">마리</option>
                    <option value="개">개</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 상태 및 추가 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>상태 및 추가 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">재고 상태</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">사용 가능</option>
                  <option value="low">부족</option>
                  <option value="reserved">예약됨</option>
                  <option value="expired">만료됨</option>
                </select>
              </div>
              <div>
                <Label htmlFor="aquarium_photo_path">수족관 사진 경로</Label>
                <Input
                  id="aquarium_photo_path"
                  value={formData.aquarium_photo_path}
                  onChange={(e) => handleInputChange('aquarium_photo_path', e.target.value)}
                  placeholder="예: /photos/godeung-eo.jpg"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 추가 정보 카드 */}
        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle>추가 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="description">메모</Label>
              <Textarea
                id="description"
                placeholder="재고에 대한 추가 설명을 입력하세요..."
                className="mt-1"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* 폼 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </form>
    </div>
  )
}

export default FishItemForm; 