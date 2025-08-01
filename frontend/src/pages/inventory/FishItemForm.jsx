"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Fish, Save, RotateCcw } from "lucide-react"

const initialFormData = {
  fishName: "",
  unit: "",
  basePrice: "",
  expirationPeriod: "",
  category: "",
  origin: "",
  storageTemp: "",
  description: "",
}

export default function FishItemForm() {
  const [formData, setFormData] = useState(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    alert("어종 정보가 등록되었습니다.")
    // Reset form
    setFormData(initialFormData)
  }

  const handleReset = () => {
    setFormData(initialFormData)
  }

  const formatCurrency = (value) => {
    const number = Number.parseInt(value.replace(/[^0-9]/g, ""))
    return isNaN(number) ? "" : number.toLocaleString()
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-light-blue-gray min-h-screen">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Fish className="h-8 w-8 text-accent-blue" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">어종 정보 등록</h1>
          <p className="text-gray-600 mt-1">새로운 어종 정보를 등록하거나 기존 정보를 수정합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fish Name */}
              <div className="space-y-2">
                <Label htmlFor="fishName" className="text-base font-medium">
                  어종명 *
                </Label>
                <Input
                  id="fishName"
                  placeholder="예: 고등어, 갈치, 오징어"
                  className="h-12 text-base"
                  value={formData.fishName}
                  onChange={(e) => handleInputChange("fishName", e.target.value)}
                  required
                />
              </div>

              {/* Category and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-base font-medium">
                    카테고리 *
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="생선">생선</SelectItem>
                      <SelectItem value="조개류">조개류</SelectItem>
                      <SelectItem value="갑각류">갑각류</SelectItem>
                      <SelectItem value="해조류">해조류</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-base font-medium">
                    단위 *
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("unit", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="단위를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="박스">박스</SelectItem>
                      <SelectItem value="마리">마리</SelectItem>
                      <SelectItem value="팩">팩</SelectItem>
                      <SelectItem value="개">개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Base Price */}
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-base font-medium">
                  기준가 *
                </Label>
                <Input
                  id="basePrice"
                  placeholder="예: 15000"
                  className="h-12 text-base"
                  value={formData.basePrice}
                  onChange={(e) => handleInputChange("basePrice", formatCurrency(e.target.value))}
                  required
                />
              </div>

              {/* Origin and Storage Temperature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin" className="text-base font-medium">
                    원산지
                  </Label>
                  <Input
                    id="origin"
                    placeholder="예: 부산, 제주, 포항"
                    className="h-12 text-base"
                    value={formData.origin}
                    onChange={(e) => handleInputChange("origin", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storageTemp" className="text-base font-medium">
                    보관 온도
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("storageTemp", value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="보관 온도를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="냉동">냉동 (-18°C 이하)</SelectItem>
                      <SelectItem value="냉장">냉장 (0~4°C)</SelectItem>
                      <SelectItem value="상온">상온</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expiration Period */}
              <div className="space-y-2">
                <Label htmlFor="expirationPeriod" className="text-base font-medium">
                  유통기한
                </Label>
                <Input
                  id="expirationPeriod"
                  placeholder="예: 7일, 14일"
                  className="h-12 text-base"
                  value={formData.expirationPeriod}
                  onChange={(e) => handleInputChange("expirationPeriod", e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium">
                  설명
                </Label>
                <Textarea
                  id="description"
                  placeholder="어종에 대한 추가 설명을 입력하세요"
                  className="min-h-[100px] text-base"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-accent-blue hover:bg-accent-blue/90"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>저장 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="h-5 w-5" />
                      <span>저장</span>
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-12"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  초기화
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Items */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">최근 등록된 어종</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">고등어</p>
                <p className="text-sm text-gray-600">₩15,000/kg</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">갈치</p>
                <p className="text-sm text-gray-600">₩25,000/kg</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">오징어</p>
                <p className="text-sm text-gray-600">₩18,000/kg</p>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">등록 팁</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>• 어종명은 정확하고 일관성 있게 입력하세요</p>
              <p>• 기준가는 시장 가격을 참고하여 설정하세요</p>
              <p>• 보관 온도는 품질 유지에 중요합니다</p>
              <p>• 유통기한은 안전한 판매를 위해 정확히 입력하세요</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 