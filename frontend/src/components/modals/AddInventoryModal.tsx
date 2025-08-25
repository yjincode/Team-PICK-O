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

// 재고 데이터 타입
interface FishStock {
  id: number;
  fish_type_id: number;
  fish_type_name: string;
  stock_quantity: number;
  ordered_quantity?: number;
  unit: string;
  status: string;
  unit_price?: number;
  updated_at: string;
}

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
  selectedFishType?: { id: number; name: string; unit?: string };
  mode?: 'create' | 'edit';  // 생성/수정 모드
  inventory?: FishStock;     // 수정할 재고 정보
}

const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  selectedFishType,
  mode = 'create',
  inventory
}) => {
  const [loading, setLoading] = useState(false)
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [loadingFishTypes, setLoadingFishTypes] = useState(false)
  const [isEditing, setIsEditing] = useState(false) // 수정 모드 상태

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    fish_type_id: '',
    stock_quantity: '',
    unit: '',
    status: 'available',
    unit_price: '',
    add_quantity: '',  // 추가할 수량 필드
  });

  // 단가 변경
  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      unit_price: e.target.value
    }));
  };

  // 수량 변경
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      stock_quantity: e.target.value
    }));
  };

  // +/- 버튼으로 수량 조정
  const handleQuantityAdjust = (amount: number) => {
    const currentAddQuantity = parseFloat(formData.add_quantity) || 0;
    const newQuantity = Math.max(0, currentAddQuantity + amount); // 음수 방지
    
    setFormData(prev => ({
      ...prev,
      add_quantity: newQuantity.toString()
    }));
  };

  // 빠른 수량 설정 버튼들 (누적 방식)
  const quickAmounts = [10, 20, 50, 100];
  
  const handleQuickAmount = (amount: number) => {
    const currentAddQuantity = parseFloat(formData.add_quantity) || 0;
    const newQuantity = currentAddQuantity + amount;
    
    setFormData(prev => ({
      ...prev,
      add_quantity: newQuantity.toString()
    }));
  };

  // 모달이 열릴 때마다 실행
  useEffect(() => {
    if (open) {
      console.log('🚪 모달 열림, selectedFishType:', selectedFishType)
      // body 스크롤 방지
      document.body.style.overflow = 'hidden'
      loadFishTypes()
      
      // selectedFishType이 없으면 폼 초기화
      if (!selectedFishType || !selectedFishType.id) {
        console.log('🔄 selectedFishType이 없어서 폼 초기화')
        resetForm()
      }
    } else {
      // 모달이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = 'unset'
    }

    // 컴포넌트 언마운트 시 body 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  // 모드에 따른 폼 초기화
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && inventory) {
        // 수정 모드: 기존 재고 정보로 초기화 (읽기 전용으로 시작)
        setFormData({
          fish_type_id: inventory.fish_type_id.toString(),
          stock_quantity: inventory.stock_quantity.toString(),
          unit: inventory.unit,
          status: inventory.status,
          unit_price: inventory.unit_price?.toString() || '',
          add_quantity: '0'  // 기본값 0으로 설정
        });
        setIsEditing(false); // 초기에는 읽기 전용
      } else {
        // 생성 모드: 빈 폼으로 초기화
        resetForm();
        setIsEditing(true); // 생성 시에는 바로 편집 가능
      }
    }
  }, [open, mode, inventory]);

  // 수정 모드로 전환
  const handleEditMode = () => {
    setIsEditing(true);
  };

  // 편집 모드 취소 (읽기 모드로 돌아가기)
  const handleCancelEdit = () => {
    if (inventory) {
      // 기존 데이터로 복원
      setFormData({
        fish_type_id: inventory.fish_type_id.toString(),
        stock_quantity: inventory.stock_quantity.toString(),
        unit: inventory.unit,
        status: inventory.status,
        unit_price: inventory.unit_price?.toString() || '',
        add_quantity: '0'
      });
    }
    setIsEditing(false);
  };

  // 선택된 어종이 있으면 초기값 설정 (먼저 실행)
  useEffect(() => {
    console.log('🔄 useEffect 실행 - selectedFishType:', selectedFishType, 'open:', open)
    
    if (selectedFishType && selectedFishType.id !== undefined && selectedFishType.id !== null) {
      console.log('🎯 선택된 어종으로 초기값 설정:', selectedFishType)
      setFormData(prev => {
        const newData = {
          ...prev,
          fish_type_id: selectedFishType.id.toString(),
          unit: selectedFishType.unit || "박스"
        }
        console.log('📝 폼 데이터 업데이트:', newData)
        return newData
      })
    } else if (open) {
      // selectedFishType이 없고 모달이 열려있으면 폼 초기화
      console.log('🔄 빈 상태로 폼 초기화')
      resetForm()
    }
  }, [selectedFishType, open]) // selectedFishType과 open 모두 의존

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
        fish_type_id: selectedFishType.id.toString(),
        unit: selectedFishType.unit || "박스" // 어종의 기본 단위 사용
      }))
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      fish_type_id: '',
      stock_quantity: '',
      unit: '',
      status: 'available',
      unit_price: '',
      add_quantity: ''
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

    if (mode === 'edit') {
      // 수정 모드: add_quantity 체크
      if (formData.add_quantity === '') {
        toast.error('변경 수량을 입력해주세요')
        return
      }
    } else {
      // 생성 모드: add_quantity 체크
      if (formData.add_quantity === '') {
        toast.error('재고 수량을 입력해주세요')
        return
      }
    }

    if (formData.unit_price === '') {
      toast.error('단가를 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const submitData = {
        fish_type_id: parseInt(formData.fish_type_id),
        stock_quantity: parseFloat(formData.add_quantity), // 항상 add_quantity 사용
        unit: formData.unit,
        status: "registered",
        unit_price: parseFloat(formData.unit_price)
      }
      
      let response;
      if (mode === 'edit' && inventory) {
        // 수정 모드: 기존 재고에 수량 추가
        console.log('📤 재고 추가 요청:', submitData)
        response = await inventoryApi.create(submitData) // 기존 API 재사용 (백엔드에서 중복 처리)
        console.log('✅ 재고 추가 성공:', response)
        const quantity = parseFloat(formData.add_quantity)
        const action = quantity >= 0 ? '추가' : '수정'
        toast.success(`재고가 성공적으로 ${action}되었습니다: ${formData.add_quantity}`)
      } else {
        // 생성 모드: 새 재고 생성
        console.log('📤 재고 추가 요청:', submitData)
        response = await inventoryApi.create(submitData)
        console.log('✅ 재고 추가 성공:', response)
        const quantity = parseFloat(formData.add_quantity)
        const action = quantity >= 0 ? '추가' : '수정'
        toast.success(`재고가 성공적으로 ${action}되었습니다: ${formData.add_quantity}`)
      }
      
      handleClose()
      onSuccess?.()
    } catch (error: any) {
      console.error('❌ 재고 처리 에러:', error)
      
      let errorMessage = mode === 'edit' ? '재고 수정에 실패했습니다' : '재고 추가에 실패했습니다'
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

  // selectedFishType이 없으면 빈 상태로 렌더링
  if (!selectedFishType || !selectedFishType.id) {
    console.log('⚠️ selectedFishType이 없어서 빈 상태로 렌더링')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4" style={{ margin: 0, padding: 0 }}>
      <div className={`bg-white rounded-lg w-full max-w-2xl shadow-xl relative ${
        mode === 'edit' ? 'max-h-[90vh]' : 'max-h-[85vh]'
      } overflow-hidden`}>
        {/* 로딩 오버레이 */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600 font-medium">재고를 추가하고 있습니다</p>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              {mode === 'edit' ? (isEditing ? '재고 수정' : '재고 정보') : '재고 추가'}
            </h2>
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
            {mode === 'edit' ? (
              <Input
                value={fishTypes.find(ft => ft.id === parseInt(formData.fish_type_id))?.name || ''}
                readOnly
                className="bg-gray-50"
              />
            ) : (
              loadingFishTypes ? (
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
                  value={formData.fish_type_id || ""}
                  onValueChange={handleFishTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="어종을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="z-[999999]">
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
              )
            )}
          </div>

          {/* 기존 재고 수량 (수정 모드에서만 표시) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="current_stock">현재 재고</Label>
              <Input
                id="current_stock"
                value={`${formData.stock_quantity}${formData.unit}`}
                readOnly
                className="bg-gray-50"
              />
            </div>
          )}

          {/* 추가할 수량 */}
          <div className="space-y-2">
            <Label htmlFor="add_quantity">
              {mode === 'edit' ? '변경 수량 *' : '재고 수량 *'}
            </Label>
            {mode === 'edit' && isEditing ? (
              // 편집 모드: +/- 버튼과 빠른 수량 설정
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuantityAdjust(-1)}
                    disabled={loading || parseFloat(formData.add_quantity) <= 0}
                    className="w-10 h-10 flex items-center justify-center"
                  >
                    -
                  </Button>
                  <Input
                    id="add_quantity"
                    type="number"
                    min={mode === 'edit' ? undefined : "0"}
                    step="1"
                    value={formData.add_quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 소수점 입력 방지
                      if (value.includes('.')) {
                        const intValue = value.split('.')[0];
                        setFormData(prev => ({ ...prev, add_quantity: intValue }));
                      } else {
                        setFormData(prev => ({ ...prev, add_quantity: value }));
                      }
                    }}
                    placeholder="변경할 수량을 입력하세요 (음수 가능)"
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuantityAdjust(1)}
                    disabled={loading}
                    className="w-10 h-10 flex items-center justify-center"
                  >
                    +
                  </Button>
                </div>
                
                {/* 빠른 수량 설정 버튼들 */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      disabled={loading}
                      className="text-xs"
                    >
                      +{amount}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, add_quantity: '0' }))}
                    disabled={loading}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    초기화
                  </Button>
                </div>
              </>
            ) : mode === 'edit' ? (
              // 읽기 모드: 변경 수량 표시만
              <Input
                id="add_quantity"
                value={`${formData.add_quantity}${formData.unit}`}
                readOnly
                className="bg-gray-50"
              />
            ) : (
              // 생성 모드: 일반 입력
              <Input
                id="add_quantity"
                type="number"
                min="0"
                step="1"
                value={formData.add_quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  // 소수점 입력 방지
                  if (value.includes('.')) {
                    const intValue = value.split('.')[0];
                    setFormData(prev => ({ ...prev, add_quantity: intValue }));
                  } else {
                    setFormData(prev => ({ ...prev, add_quantity: value }));
                  }
                }}
                placeholder="재고 수량을 입력하세요"
                required
              />
            )}
          </div>

          {/* 최종 재고 미리보기 (편집 모드에서만 표시) */}
          {mode === 'edit' && isEditing && formData.add_quantity !== '' && (
            <div className="space-y-2">
              <Label>최종 재고</Label>
              <div className={`p-3 rounded-lg font-medium ${
                parseFloat(formData.add_quantity) >= 0 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {formData.stock_quantity} {formData.unit} 
                {parseFloat(formData.add_quantity) >= 0 ? ' + ' : ' - '} 
                {Math.abs(parseFloat(formData.add_quantity))} {formData.unit} 
                = {parseFloat(formData.stock_quantity || '0') + parseFloat(formData.add_quantity || '0')} {formData.unit}
              </div>
            </div>
          )}

          {/* 단가 */}
          <div className="space-y-2">
            <Label htmlFor="unit_price">단가 *</Label>
            {mode === 'edit' && isEditing ? (
              // 편집 모드: 수정 가능
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="1"
                value={formData.unit_price}
                onChange={handleUnitPriceChange}
                placeholder="단가를 입력하세요"
                required
              />
            ) : (
              // 읽기 모드 또는 생성 모드
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="1"
                value={formData.unit_price}
                onChange={handleUnitPriceChange}
                placeholder="단가를 입력하세요"
                required
                readOnly={mode === 'edit' && !isEditing}
                className={mode === 'edit' && !isEditing ? 'bg-gray-50' : ''}
              />
            )}
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
            {mode === 'edit' && !isEditing && (
              // 읽기 모드: 수정하기 버튼
              <>
                <Button
                  type="button"
                  onClick={handleEditMode}
                  className="w-full sm:w-auto"
                >
                  수정하기
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="w-full sm:w-auto"
                >
                  닫기
                </Button>
              </>
            )}
            {mode === 'edit' && isEditing && (
              // 편집 모드: 저장/취소 버튼
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
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
                      재고 수정 중...
                    </>
                  ) : (
                    '재고 수정'
                  )}
                </Button>
              </>
            )}
            {mode === 'create' && (
              // 생성 모드: 추가/취소 버튼
              <>
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
                      재고 추가 중...
                    </>
                  ) : (
                    '재고 추가'
                  )}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddInventoryModal