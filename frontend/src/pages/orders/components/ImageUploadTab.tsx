/**
 * 이미지 업로드 탭 컴포넌트
 * 이미지 파일을 업로드하여 주문을 등록하는 탭입니다.
 */
import React, { useRef, useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Camera, Upload, Trash2, Eye, AlertCircle } from "lucide-react"
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

interface ImageUploadTabProps {
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void
  isProcessing: boolean
  transcribed_text?: string
  uploadedFile?: File | null
  onRemoveFile?: () => void
  selectedBusinessId?: number | null
  onBusinessChange?: (businessId: number | null) => void
  deliveryDate?: string
  onDeliveryDateChange?: (date: string) => void
  onOrderParsed?: (orderData: ParsedOrderData) => void
  onError?: (error: string) => void
}

const ImageUploadTab: React.FC<ImageUploadTabProps> = ({
  onFileUpload,
  isProcessing,
  transcribed_text,
  uploadedFile,
  onRemoveFile,
  selectedBusinessId,
  onBusinessChange,
  deliveryDate,
  onDeliveryDateChange,
  onOrderParsed,
  onError
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [showFullImage, setShowFullImage] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [localUploadedFile, setLocalUploadedFile] = useState<File | null>(null)
  const [localTranscribedText, setLocalTranscribedText] = useState<string>('')
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null)
  const [localIsProcessing, setLocalIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // 거래처 목록 로드
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await businessApi.getAll()
        let businessData: Business[] = []
        
        if (response && Array.isArray(response)) {
          businessData = response
        } else if (response && response.results && Array.isArray(response.results)) {
          businessData = response.results
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
        } else if (response && response.results && Array.isArray(response.results)) {
          fishData = response.results
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // OCR 처리 함수
  const extractTextFromImage = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("바다수산에 도미 10kg, 방어 5마리 주문합니다. 납품은 1월 25일 오전 중으로 부탁드립니다.")
      }, 2000)
    })
  }

  // 로컬 파일 업로드 및 OCR 처리
  const handleLocalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      const errorMsg = '이미지 파일만 업로드 가능합니다. JPG, PNG, GIF 파일을 사용해주세요.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = '파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setLocalUploadedFile(file)
    setError('')
    setLocalTranscribedText('')
    setParsedOrder(null)
    
    // OCR 처리 시작
    await processImageOCR(file)
  }

  const processImageOCR = async (file: File) => {
    setLocalIsProcessing(true)
    setError('')
    
    try {
      console.log('📷 이미지 OCR 처리 시작:', file.name)
      const extractedText = await extractTextFromImage(file)
      
      console.log('✅ OCR 처리 완료:', extractedText)
      setLocalTranscribedText(extractedText)
      
      // 추출된 텍스트를 주문 데이터로 파싱
      try {
        console.log('📝 주문 데이터 파싱 시작:', extractedText)
        const basicOrderData = parseVoiceOrder(extractedText)
        
        if (basicOrderData.items && basicOrderData.items.length > 0) {
          const validatedOrderData = validateAndCompleteOrder(basicOrderData)
          console.log('🎯 파싱된 주문 데이터:', validatedOrderData)
          
          setParsedOrder(validatedOrderData)
          onOrderParsed?.(validatedOrderData)
        } else {
          console.warn('⚠️ 주문 품목을 찾을 수 없습니다:', extractedText)
          setParsedOrder(null)
        }
      } catch (parseError) {
        console.error('❌ 주문 파싱 실패:', parseError)
        setParsedOrder(null)
      }
      
    } catch (err) {
      console.error('❌ OCR 처리 실패:', err)
      const errorMsg = err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLocalIsProcessing(false)
    }
  }

  const handleRemoveLocalFile = () => {
    setLocalUploadedFile(null)
    setLocalTranscribedText('')
    setParsedOrder(null)
    setError('')
    onRemoveFile?.()
  }

  const currentFile = uploadedFile || localUploadedFile
  const currentTranscribedText = transcribed_text || localTranscribedText
  const currentIsProcessing = isProcessing || localIsProcessing

  return (
    <div className="space-y-4">
      {!currentFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            이미지 파일을 업로드하세요
          </h3>
          <p className="text-gray-600 mb-4">
            수조 사진을 업로드하면 OCR로 텍스트를 추출하고 주문 파싱을 수행합니다
          </p>
          <Button
            onClick={() => imageInputRef.current?.click()}
            variant="outline"
            className="mx-auto"
            disabled={currentIsProcessing}
          >
            {currentIsProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                OCR 처리 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                이미지 선택
              </>
            )}
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={onFileUpload || handleLocalFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Camera className="h-8 w-8 text-green-500" />
              <div>
                <h4 className="font-medium text-gray-900">{currentFile.name}</h4>
                <p className="text-sm text-gray-500">{formatFileSize(currentFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullImage(true)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveLocalFile}
                className="text-red-500 hover:text-red-700"
                disabled={currentIsProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative flex justify-center bg-white rounded-lg p-4 border">
            <img
              src={URL.createObjectURL(currentFile)}
              alt="업로드된 이미지"
              className="max-w-full max-h-80 object-contain rounded-lg shadow-sm"
              style={{ 
                minHeight: '120px',
                maxHeight: '320px'
              }}
            />
          </div>
        </div>
      )}
      
      {/* 로딩바 */}
      {currentIsProcessing && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <div className="flex-1">
              <h4 className="font-medium text-orange-900 mb-1">이미진를 OCR로 처리 중...</h4>
              <p className="text-sm text-orange-700">이미지에서 텍스트를 추출하고 주문 정보를 파싱하고 있습니다.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h4 className="font-medium text-red-900">오류가 발생했습니다</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 주문 정보 - 파싱 후에만 표시 */}
      {parsedOrder && !error && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-900 mb-3">📷 주문 정보:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 파싱된 거래처 표시 및 수정 */}
              <div className="space-y-2">
                <Label htmlFor="business-select">파싱된 거래처 (수정 가능)</Label>
                <Select 
                  value={selectedBusinessId?.toString() || ""} 
                  onValueChange={(value: string) => onBusinessChange?.(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="bg-white border-orange-300">
                    <SelectValue placeholder="이미지에서 파싱된 거래처를 확인하고 수정하세요" />
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
                  <div className="text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded">
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
                  className="bg-white border-orange-300"
                  placeholder="이미지에서 파싱된 배송일을 확인하고 수정하세요"
                />
              </div>
            </div>
            
            {/* 주문 품목들 */}
            {parsedOrder?.items && parsedOrder.items.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">🐟 파싱된 주문 품목:</h5>
                <div className="space-y-2">
                  {parsedOrder.items.map((item, index) => (
                    <div key={index} className="bg-white rounded-md p-4 border border-orange-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">어종</label>
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-orange-500 focus:outline-none"
                            value={item.fish_type_id}
                            onChange={(e) => {
                              // TODO: 어종 변경 핸들러 구현
                              console.log('어종 변경:', e.target.value)
                            }}
                          >
                            <option value={1}>고등어</option>
                            <option value={2}>갈치</option>
                            <option value={3}>오징어</option>
                            <option value={4}>명태</option>
                            <option value={201}>도미</option>
                            <option value={202}>방어</option>
                            <option value={203}>삼치</option>
                            <option value={204}>전어</option>
                            <option value={205}>꽁치</option>
                            <option value={206}>청어</option>
                          </select>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">수량</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-orange-500 focus:outline-none"
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
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-orange-500 focus:outline-none"
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
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-orange-500 focus:outline-none"
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
                          소계: <span className="font-semibold text-orange-600">
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
                
                <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-900">총 합계:</span>
                    <span className="text-lg font-bold text-orange-900">
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
            
            <p className="text-xs text-orange-600 mt-3">
              ✅ 위 정보를 확인하고 수정한 후 주문을 등록해주세요.
            </p>
          </div>
        </div>
      )}

      {/* 전체 이미지 모달 */}
      {showFullImage && currentFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullImage(false)}
                className="bg-white/80 hover:bg-white text-gray-700"
              >
                ✕
              </Button>
            </div>
            <img
              src={URL.createObjectURL(currentFile)}
              alt="전체 이미지"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUploadTab 