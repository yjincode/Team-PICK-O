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
  status: string;
  aquarium_photo_path: string;
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
    unit: "박스", 
    status: "registered",
    aquarium_photo_path: ""
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

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      fish_type_id: null,
      stock_quantity: 0,
      unit: "박스",
      status: "registered",
      aquarium_photo_path: ""
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
      const submitData = {
        fish_type_id: formData.fish_type_id!,
        stock_quantity: formData.stock_quantity,
        unit: formData.unit,
        status: formData.status,
        ...(formData.aquarium_photo_path && { aquarium_photo_path: formData.aquarium_photo_path })
      }
      const response = await inventoryApi.create(submitData)
      console.log('✅ 재고 추가 성공:', response)
      toast.success('재고가 성공적으로 추가되었습니다')
      
      // 재고 업데이트 이벤트 발생 (실시간 재고 체크 갱신용)
      window.dispatchEvent(new CustomEvent('stockUpdated', { 
        detail: { 
          action: 'added', 
          fishTypeId: formData.fish_type_id, 
          quantity: formData.stock_quantity 
        }
      }))
      
      handleClose()
      onSuccess?.()
    } catch (error: any) {
      console.error('재고 추가 에러:', error)
      toast.error(error.response?.data?.message || error.message || '재고 추가에 실패했습니다')
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
                onValueChange={(value) => {
                  console.log('🐟 어종 선택:', value)
                  handleInputChange('fish_type_id', parseInt(value))
                }}
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

          {/* 단위 */}
          <div className="space-y-2">
            <Label htmlFor="unit">단위</Label>
            <Select
              value={formData.unit}
              onValueChange={(value) => handleInputChange('unit', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="박스">박스</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="마리">마리</SelectItem>
                <SelectItem value="개">개</SelectItem>
                <SelectItem value="톤">톤</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상태 */}
          <div className="space-y-2">
            <Label htmlFor="status">상태</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registered">등록됨</SelectItem>
                <SelectItem value="normal">정상</SelectItem>
                <SelectItem value="low">부족</SelectItem>
                <SelectItem value="abnormal">이상</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 사진 경로 */}
          <div className="space-y-2">
            <Label htmlFor="aquarium_photo_path">수족관 사진 경로</Label>
            <Input
              id="aquarium_photo_path"
              value={formData.aquarium_photo_path}
              onChange={(e) => handleInputChange('aquarium_photo_path', e.target.value)}
              placeholder="사진 경로를 입력하세요 (선택사항)"
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