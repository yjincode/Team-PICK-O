import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Package, Save, X } from "lucide-react"

interface FishItemFormData {
  name: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
  description: string;
  supplier: string;
  location: string;
}

const FishItemForm: React.FC = () => {
  const [formData, setFormData] = useState<FishItemFormData>({
    name: "",
    type: "",
    quantity: 0,
    unit: "박스",
    price: 0,
    description: "",
    supplier: "",
    location: "",
  })

  const handleInputChange = (field: keyof FishItemFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Fish item form submitted:", formData)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">어종 정보 관리</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">새로운 어종 정보 등록</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>기본 정보</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">어종명</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="예: 고등어"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">분류</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">분류 선택</option>
                  <option value="생선">생선</option>
                  <option value="어류">어류</option>
                  <option value="조개류">조개류</option>
                  <option value="갑각류">갑각류</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">수량</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>가격 및 위치</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price">단가 (원)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', Number(e.target.value))}
                  placeholder="0"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="supplier">공급업체</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="공급업체명"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="location">보관 위치</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="예: A구역-1층"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle>추가 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="어종에 대한 추가 설명을 입력하세요..."
                className="mt-1"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

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