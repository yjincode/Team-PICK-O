/**
 * 텍스트 입력 탭 컴포넌트
 * 텍스트를 입력하여 주문을 등록하는 탭입니다.
 */
import { useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { businessApi, fishTypeApi } from "../../../lib/api"
import { parseVoiceOrderWithAPI, validateAndCompleteOrder } from "../../../utils/orderParser"
import type { Business, FishType } from "../../../types"

interface ParsedOrderData {
  business_name?: string;
  phone_number?: string;
  transcribed_text: string;
  delivery_date?: string;
  items: Array<{
    fish_type_id: number;
    quantity: number;
    unit_price?: number;
    unit: string;
  }>;
  memo?: string;
}

interface TextInputTabProps {
  textInput: string
  setTextInput: (text: string) => void
  onParse?: () => void
  isProcessing: boolean
  transcribedText?: string
  selectedBusinessId?: number | null
  onBusinessChange?: (businessId: number | null) => void
  deliveryDate?: string
  onDeliveryDateChange?: (date: string) => void
  onOrderParsed?: (orderData: ParsedOrderData) => void
}

const TextInputTab: React.FC<TextInputTabProps> = ({
  textInput,
  setTextInput,
  onParse: _onParse,
  isProcessing,
  transcribedText: _transcribedText,
  selectedBusinessId,
  onBusinessChange,
  deliveryDate,
  onDeliveryDateChange,
  onOrderParsed
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null)
  const [isLocalProcessing, setIsLocalProcessing] = useState<boolean>(false)

  // 거래처 목록 로드
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await businessApi.getAll()
        let businessData: Business[] = []
        
        if (response && Array.isArray(response)) {
          businessData = response
        } else if (response && response.data && Array.isArray(response.data.results)) {
          businessData = response.data.results
        } else if (response && response.data && Array.isArray(response.data)) {
          businessData = response.data
        }
        
        setBusinesses(businessData)
      } catch (error) {
        console.error('거래처 목록 가져오기 실패:', error)
        setBusinesses([])
      }
    }

    fetchBusinesses()
  }, [])

  // 어종 목록 로드
  useEffect(() => {
    const fetchFishTypes = async () => {
      try {
        const response = await fishTypeApi.getAll()
        let fishData: FishType[] = []
        
        if (response && Array.isArray(response)) {
          fishData = response
        } else if (response && response.data && Array.isArray(response.data)) {
          fishData = response.data
        }
        
        setFishTypes(fishData)
      } catch (error) {
        console.error('어종 목록 가져오기 실패:', error)
        setFishTypes([])
      }
    }

    fetchFishTypes()
  }, [])

  // 텍스트 전용 파싱 함수
  const handleTextParsing = async () => {
    if (!textInput.trim()) return
    
    setIsLocalProcessing(true)
    setParsedOrder(null)
    
    try {
      console.log('📝 텍스트 파싱 시작 (API 연동):', textInput)
      const basicOrderData = await parseVoiceOrderWithAPI(textInput) // API 연동 버전 사용
      
      if (basicOrderData.items && basicOrderData.items.length > 0) {
        const validatedOrderData = validateAndCompleteOrder(basicOrderData)
        console.log('🎯 파싱된 주문 데이터:', validatedOrderData)
        
        setParsedOrder(validatedOrderData)
        onOrderParsed?.(validatedOrderData)
      } else {
        console.warn('⚠️ 주문 품목을 찾을 수 없습니다:', textInput)
        setParsedOrder(null)
      }
    } catch (error) {
      console.error('❌ 텍스트 파싱 실패:', error)
      setParsedOrder(null)
    } finally {
      setIsLocalProcessing(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text-input">주문 내용 입력</Label>
        <Textarea
          id="text-input"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="주문 내용을 텍스트로 입력하세요... 
예: 바다수산에 고등어 10박스, 갈치 5박스 주문합니다. 1월 20일까지 배송 부탁드립니다."
          className="min-h-[120px]"
        />
      </div>
      <Button 
        onClick={handleTextParsing} 
        className="w-full" 
        disabled={!textInput.trim() || isProcessing || isLocalProcessing}
      >
        {(isProcessing || isLocalProcessing) ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            파싱 중...
          </>
        ) : (
          "분석하기"
        )}
      </Button>
      
      {/* 주문 정보 - 파싱 후에만 표시 */}
      {parsedOrder && (
        <div className="space-y-4">
          {/* 거래처 선택 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3">📝 주문 정보:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 파싱된 거래처 표시 및 수정 */}
              <div className="space-y-2">
                <Label htmlFor="business-select">파싱된 거래처 (수정 가능)</Label>
                <Select 
                  value={selectedBusinessId?.toString() || ""} 
                  onValueChange={(value: string) => onBusinessChange?.(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="bg-white border-green-300">
                    <SelectValue placeholder="텍스트에서 파싱된 거래처를 확인하고 수정하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((business: Business) => (
                      <SelectItem key={business.id} value={business.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{business.business_name}</span>
                          <span className="text-xs text-gray-500">{business.phone_number}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBusinessId && (
                  <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                    ✓ 선택된 거래처: {businesses.find((b: Business) => b.id === selectedBusinessId)?.business_name}
                  </div>
                )}
              </div>
              
              {/* 파싱된 배송일 수정 */}
              <div className="space-y-2">
                <Label htmlFor="delivery_date">파싱된 배송일 (수정 가능)</Label>
                <Input
                  type="date"
                  value={deliveryDate || ''}
                  onChange={(e) => onDeliveryDateChange?.(e.target.value)}
                  className="bg-white border-green-300"
                  placeholder="텍스트에서 파싱된 배송일을 확인하고 수정하세요"
                />
              </div>
            </div>
            
            {/* 주문 품목들 */}
            {parsedOrder?.items && parsedOrder.items.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">🐟 파싱된 주문 품목:</h5>
                <div className="space-y-2">
                  {parsedOrder.items.map((item, index) => (
                    <div key={index} className="bg-white rounded-md p-4 border border-green-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">어종</label>
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
                            value={item.fish_type_id}
                            onChange={(e) => {
                              // TODO: 어종 변경 핸들러 구현
                              console.log('어종 변경:', e.target.value)
                            }}
                          >
                            {fishTypes.map((fish) => (
                              <option key={fish.id} value={fish.id}>
                                {fish.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">수량</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
                            value={item.quantity}
                            min="1"
                            onChange={(e) => {
                              // TODO: 수량 변경 핸들러 구현
                              console.log('수량 변경:', e.target.value)
                            }}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">단가(원)</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
                            value={item.unit_price || 0}
                            min="0"
                            onChange={(e) => {
                              // TODO: 단가 변경 핸들러 구현
                              console.log('단가 변경:', e.target.value)
                            }}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">단위</label>
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
                            value={item.unit}
                            onChange={(e) => {
                              // TODO: 단위 변경 핸들러 구현
                              console.log('단위 변경:', e.target.value)
                            }}
                          >
                            <option value="박스">박스</option>
                            <option value="kg">kg</option>
                            <option value="마리">마리</option>
                            <option value="개">개</option>
                            <option value="통">통</option>
                            <option value="팩">팩</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          소계: <span className="font-semibold text-green-600">
                            {((item.unit_price || 0) * item.quantity).toLocaleString()}원
                          </span>
                        </div>
                        <button
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                          onClick={() => {
                            // TODO: 항목 삭제 핸들러 구현
                            console.log('항목 삭제:', index)
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-900">총 합계:</span>
                    <span className="text-lg font-bold text-green-900">
                      {parsedOrder.items.reduce((total, item) => total + ((item.unit_price || 0) * item.quantity), 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 메모 */}
            {parsedOrder?.memo && (
              <div className="mt-4">
                <Label>메모</Label>
                <div className="bg-white rounded-md p-2 border mt-1">
                  <span className="text-gray-900">{parsedOrder.memo}</span>
                </div>
              </div>
            )}
            
            <p className="text-xs text-green-600 mt-3">
              ✅ 위 정보를 확인하고 수정한 후 주문을 등록해주세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TextInputTab 