/**
 * 재고 추가 모달 컴포넌트
 * 새로운 재고를 추가할 때 사용하는 모달
 */
import React, { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Package, Loader2, X } from "lucide-react"
import toast from 'react-hot-toast'
import { inventoryApi } from '../../lib/api'

// 재고 추가 폼 데이터 타입
interface InventoryFormData {
  fish_type_id: number | null;
  stock_quantity: number;
  unit: string;
}

// 어종 타입
interface FishType {
  id: number;
  name: string;
  unit: string;
  aliases?: string;
}

interface AddInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [loadingFishTypes, setLoadingFishTypes] = useState(false)

  // 폼 데이터 상태
  const [formData, setFormData] = useState<InventoryFormData>({
    fish_type_id: null,
    stock_quantity: 0,
    unit: "박스"
  })

  // 어종 목록 불러오기
  useEffect(() => {
    if (open) {
      loadFishTypes()
    }
  }, [open])

  const loadFishTypes = async () => {
    console.log('🔄 어종 목록 로딩 시작...')
    setLoadingFishTypes(true)
    try {
      const response = await inventoryApi.getFishTypes()
      console.log('✅ 어종 데이터 수신:', response)
      
      // inventoryApi.getFishTypes()는 { data: FishType[] } 형태로 반환
      let fishTypeData: FishType[] = []
      
      if (response && response.data && Array.isArray(response.data)) {
        fishTypeData = response.data
      } else if (Array.isArray(response)) {
        // 직접 배열인 경우 (예외 처리)
        fishTypeData = response
      } else {
        console.warn('예상치 못한 응답 형태:', response)
      }
      
      console.log('📊 로드된 어종 개수:', fishTypeData.length)
      setFishTypes(fishTypeData)
    } catch (error: any) {
      console.error('❌ 어종 목록 로딩 에러:', error)
      toast.error('어종 목록을 불러오는데 실패했습니다')
      setFishTypes([])
    } finally {
      setLoadingFishTypes(false)
      console.log('🔄 어종 목록 로딩 완료')
    }
  }

  // 입력 값 변경 핸들러
  const handleInputChange = (field: keyof InventoryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 어종 선택 시 단위 자동 설정
  const handleFishTypeChange = (fishTypeId: string) => {
    const selectedFishType = fishTypes.find(ft => ft.id === parseInt(fishTypeId))
    if (selectedFishType) {
      setFormData(prev => ({
        ...prev,
        fish_type_id: selectedFishType.id,
        unit: selectedFishType.unit || "박스" // 어종의 기본 단위 사용
      }))
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      fish_type_id: null,
      stock_quantity: 0,
      unit: "박스"
    })
  }

  // 모달 닫기 핸들러
  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!formData.fish_type_id) {
      toast.error('어종을 선택해주세요')
      return
    }

    if (formData.stock_quantity <= 0) {
      toast.error('재고 수량은 0보다 커야 합니다')
      return
    }

    setLoading(true)

    try {
      // 백엔드에서 중복 처리하므로 단순하게 생성 요청
      const submitData = {
        fish_type_id: formData.fish_type_id!,
        stock_quantity: formData.stock_quantity,
        unit: formData.unit,
        status: "registered"  // 기본 상태를 "등록됨"으로 설정
      }
      
      console.log('📤 재고 추가 요청:', submitData)
      const response = await inventoryApi.create(submitData)
      console.log('✅ 재고 추가 성공:', response)
      
      toast.success(`재고가 성공적으로 추가되었습니다: ${formData.stock_quantity}${formData.unit}`)
      
      handleClose()
      onSuccess?.()
    } catch (error: any) {
      console.error('❌ 재고 추가 에러:', error)
      console.error('❌ 에러 응답:', error.response?.data)
      console.error('❌ 에러 상태:', error.response?.status)
      
      let errorMessage = '재고 추가에 실패했습니다'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[85vh] overflow-y-auto shadow-lg relative my-4">
        {/* 로딩 오버레이 */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600 font-medium">재고를 추가하는 중...</p>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h2 className="text-lg font-semibold">재고 추가</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 폼 내용 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 어종 선택 */}
          <div className="space-y-2">
            <Label htmlFor="fish_type">어종 선택 *</Label>
            {loadingFishTypes ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                어종 목록 로딩 중...
              </div>
            ) : fishTypes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                어종 데이터가 없습니다. 콘솔을 확인해주세요.
              </div>
            ) : (
              <Select
                value={formData.fish_type_id?.toString() || ""}
                onValueChange={handleFishTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="어종을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {fishTypes.map((fishType) => {
                    console.log('🐟 렌더링 어종:', fishType)
                    return (
                      <SelectItem key={fishType.id} value={fishType.id.toString()}>
                        {fishType.name} ({fishType.unit})
                        {fishType.aliases && ` - ${fishType.aliases}`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 재고 수량 */}
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">재고 수량 *</Label>
            <Input
              id="stock_quantity"
              type="number"
              min="0"
              step="0.1"
              value={formData.stock_quantity === 0 ? '' : formData.stock_quantity}
              onChange={(e) => handleInputChange('stock_quantity', parseFloat(e.target.value) || 0)}
              placeholder="재고 수량을 입력하세요"
              required
            />
          </div>

          {/* 단위 (읽기 전용) */}
          <div className="space-y-2">
            <Label htmlFor="unit">단위</Label>
            <Input
              id="unit"
              value={formData.unit}
              readOnly
              className="bg-gray-50"
              placeholder="어종 선택 후 자동 설정됩니다"
            />
          </div>

          {/* 버튼 */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingFishTypes}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  추가 중...
                </>
              ) : (
                "추가"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddInventoryModal