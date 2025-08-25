import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface InventoryCheckModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventory: {
    id: number
    fish_type_name: string
    stock_quantity: number
    unit: string
  } | null
  onSuccess: () => void
}

interface InventoryCheckData {
  actual_quantity: number
  quality: '상' | '중' | '하'
  packaging: '정상' | '훼손'
  memo: string
}

const InventoryCheckModal: React.FC<InventoryCheckModalProps> = ({
  open,
  onOpenChange,
  inventory,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<InventoryCheckData>({
    actual_quantity: 0,
    quality: '상',
    packaging: '정상',
    memo: ''
  })
  const [loading, setLoading] = useState(false)

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open && inventory) {
      setFormData({
        actual_quantity: inventory.stock_quantity,
        quality: '상',
        packaging: '정상',
        memo: ''
      })
      setCurrentStep(1)
    }
  }, [open, inventory])

  // 모달 열기/닫기 시 body 스크롤 제어
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  const handleQuantityChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setFormData(prev => ({
      ...prev,
      actual_quantity: numValue
    }))
  }

  const handleQualitySelect = (quality: '상' | '중' | '하') => {
    setFormData(prev => ({ ...prev, quality }))
  }

  const handlePackagingToggle = () => {
    setFormData(prev => ({
      ...prev,
      packaging: prev.packaging === '정상' ? '훼손' : '정상'
    }))
  }

  const handleMemoChange = (value: string) => {
    setFormData(prev => ({ ...prev, memo: value }))
  }

  const handleSubmit = async () => {
    if (!inventory) return

    try {
      setLoading(true)
      
      const response = await fetch(`/api/v1/inventory/${inventory.id}/adjust/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // 토스트 메시지는 onSuccess에서 처리하도록 제거
        // 이상탐지 정보만 콘솔에 로그
        
        if (result.anomaly_detected) {
          console.log('⚠️ 실사 차이 이상탐지 발생:', result)
        }
        
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast.error(error.error || '실사 조정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('실사 조정 오류:', error)
      toast.error('실사 조정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    const maxStep = getMaxStep()
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 최대 단계 수 계산
  const getMaxStep = () => {
    if (!inventory) return 4
    
    let maxStep = 4
    
    // 재고가 0이면 품질/포장 단계 건너뛰기
    if (inventory.stock_quantity === 0) {
      maxStep = 2 // 실제 수량 입력 + 특이사항만
    }
    // 포장 상태가 불필요하면 포장 단계 건너뛰기
    else if (!isPackagingRelevant()) {
      maxStep = 3 // 품질 상태까지만
    }
    
    return maxStep
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return '1️⃣ 실제 수량 입력'
      case 2: return '2️⃣ 품질 상태 선택'
      case 3: return '3️⃣ 포장 상태 확인'
      case 4: return '4️⃣ 특이사항 입력'
      default: return ''
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return '실제 창고에서 확인한 재고 수량을 입력해주세요.'
      case 2: return '재고의 품질 상태를 선택해주세요.'
      case 3: return '포장 상태를 확인해주세요.'
      case 4: return '특이사항이 있으면 입력해주세요. (선택사항)'
      default: return ''
    }
  }

  const getProgressPercentage = () => {
    const maxStep = getMaxStep()
    return (currentStep / maxStep) * 100
  }

  // 포장 상태가 해당사항 있는지 확인
  const isPackagingRelevant = () => {
    // 마리, kg 등은 포장 상태 확인 불필요
    const packagingUnits = ['박스', '통', '팩', '개']
    return packagingUnits.includes(inventory?.unit || '')
  }

  if (!open || !inventory) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">실사 입력</h2>
            <p className="text-gray-600 mt-1">
              🐟 {inventory.fish_type_name} - 📦 시스템 재고: {inventory.stock_quantity} {inventory.unit}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 진행률 바 */}
        <div className="px-6 pt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>1</span>
            {inventory.stock_quantity > 0 && <span>2</span>}
            {inventory.stock_quantity > 0 && isPackagingRelevant() && <span>3</span>}
            <span>{getMaxStep()}</span>
          </div>
        </div>

        {/* 단계별 내용 */}
        <div className="p-6">
          {/* 단계 제목 및 설명 */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {getStepTitle()}
            </h3>
            <p className="text-gray-600">{getStepDescription()}</p>
          </div>

          {/* 단계 1: 실제 수량 입력 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="actual_quantity" className="text-lg font-medium">
                  실제 수량 입력
                </Label>
                <div className="mt-2">
                  <div className="flex items-center space-x-3">
                    <Input
                      id="actual_quantity"
                      type="number"
                      value={formData.actual_quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className="text-lg h-12 flex-1"
                      placeholder="실제 수량을 입력하세요"
                    />
                    <span className="text-lg font-medium text-gray-700 min-w-[40px]">
                      {inventory.unit}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    시스템 재고: {inventory.stock_quantity} {inventory.unit}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 단계 2: 품질 상태 선택 (재고가 있을 때만) */}
          {currentStep === 2 && inventory.stock_quantity > 0 && (
            <div className="space-y-4">
              <Label className="text-lg font-medium">품질 상태 선택</Label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={formData.quality === '상' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleQualitySelect('상')}
                  className="h-16 text-lg"
                >
                  🟢 좋음
                </Button>
                <Button
                  variant={formData.quality === '중' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleQualitySelect('중')}
                  className="h-16 text-lg"
                >
                  🟡 보통
                </Button>
                <Button
                  variant={formData.quality === '하' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleQualitySelect('하')}
                  className="h-16 text-lg"
                >
                  🔴 나쁨
                </Button>
              </div>
            </div>
          )}

          {/* 재고 0일 때 안내 메시지 */}
          {currentStep === 2 && inventory.stock_quantity === 0 && (
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900">재고가 없습니다</h3>
              <p className="text-gray-600">
                현재 재고가 0{inventory.unit}이므로 품질 상태와 포장 상태를 확인할 수 없습니다.
                <br />
                실제 수량만 입력해주세요.
              </p>
            </div>
          )}

          {/* 단계 3: 포장 상태 확인 (재고가 있고 포장 관련 단위일 때만) */}
          {currentStep === 3 && inventory.stock_quantity > 0 && isPackagingRelevant() && (
            <div className="space-y-4">
              <Label className="text-lg font-medium">포장 상태 확인</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={formData.packaging === '정상' ? 'default' : 'outline'}
                  size="lg"
                  onClick={handlePackagingToggle}
                  className="h-16 text-lg"
                >
                  ✅ 정상
                </Button>
                <Button
                  variant={formData.packaging === '훼손' ? 'default' : 'outline'}
                  size="lg"
                  onClick={handlePackagingToggle}
                  className="h-16 text-lg"
                >
                  ❌ 훼손
                </Button>
              </div>
            </div>
          )}

          {/* 포장 상태가 해당사항 없을 때 */}
          {currentStep === 3 && (!isPackagingRelevant() || inventory.stock_quantity === 0) && (
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900">
                {inventory.stock_quantity === 0 ? '재고가 없습니다' : '포장 상태 해당사항 없음'}
              </h3>
              <p className="text-gray-600">
                {inventory.stock_quantity === 0 
                  ? '현재 재고가 0이므로 포장 상태를 확인할 수 없습니다.'
                  : `${inventory.unit} 단위는 포장 상태 확인이 필요하지 않습니다.`
                }
              </p>
            </div>
          )}

          {/* 단계 4: 특이사항 입력 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="memo" className="text-lg font-medium">
                  특이사항 (선택사항)
                </Label>
                <Input
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => handleMemoChange(e.target.value)}
                  className="text-lg h-12 mt-2"
                  placeholder="특이사항을 입력하세요..."
                />
              </div>
              
              {/* 실사자 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">실사자</span>
                </div>
                <p className="text-gray-600 mt-1">공용</p>
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="h-12 px-6 text-lg"
            >
              이전
            </Button>
            
                         {currentStep < getMaxStep() ? (
               <Button
                 onClick={nextStep}
                 className="h-12 px-6 text-lg"
               >
                 다음
               </Button>
             ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="h-12 px-6 text-lg"
              >
                {loading ? '저장 중...' : '💾 저장하기'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryCheckModal
