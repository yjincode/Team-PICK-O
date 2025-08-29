/**
 * 음성 업로드 탭 컴포넌트
 * 음성 파일을 업로드하여 주문을 등록하는 탭입니다.
 */
import { useRef, useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Mic, Upload, Play, Pause, Trash2, AlertCircle } from "lucide-react"
import { sttApi, businessApi } from "../../../lib/api"
import { validateAndCompleteOrder, parseVoiceOrderWithBusiness, fetchParsedOrder } from "../../../utils/orderParser"
import type { Business, FishType } from "../../../types"
import { fishTypeApi } from "../../../lib/api"

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

interface VoiceUploadTabProps {
  onTranscriptionComplete?: (text: string) => void
  onOrderParsed?: (orderData: ParsedOrderData & { business?: Business }) => void
  onError?: (error: string) => void
  selectedBusinessId?: number | null
  onBusinessChange?: (businessId: number | null) => void
  deliveryDate?: string
  onDeliveryDateChange?: (date: string) => void
}

const VoiceUploadTab: React.FC<VoiceUploadTabProps> = ({
  onTranscriptionComplete,
  onOrderParsed,
  onError,
  selectedBusinessId,
  onBusinessChange,
  deliveryDate,
  onDeliveryDateChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null)
  const [error, setError] = useState<string>('')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [fishTypes, setFishTypes] = useState<FishType[]>([])



  
  // 거래처 목록 로드
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await businessApi.getAll()
        let businessData: Business[] = []
        
        if (response && Array.isArray(response)) {
          businessData = response
        } else if (response && Array.isArray(response.results)) {
          businessData = response.results
        } else if (response && Array.isArray(response.results)) {
          businessData = response.results
        }
        
        setBusinesses(businessData)
      } catch (error) {
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
        setFishTypes([])
      }
    }

    fetchFishTypes()
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 검증
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      const errorMsg = '지원되지 않는 파일 형식입니다. MP3, WAV, M4A 파일만 업로드 가능합니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = '파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setUploadedFile(file)
    setError('')
    setTranscribedText('')
    
    // STT 처리 시작
    await parseVoiceFile(file)
  }

  // const transcribeAudio = async (file: File) => {
  //   setIsProcessing(true)
  //   setError('')
  //   setParsedOrder(null)
    
  //   try {
  //     // const result = await sttApi.transcribe(file, 'ko')
      
  //     // setTranscribedText(result.transcription)
  //     // onTranscriptionComplete?.(result.transcription)
      
// <<<<<<< feature/cdtest4
//       // 음성 텍스트를 주문 데이터로 파싱 시도 (거래처 매칭 포함)
//       try {
//         const fullOrderData = await parseVoiceOrderWithBusiness(result.transcription)
        
//         if (fullOrderData.items && fullOrderData.items.length > 0) {
//           const validatedOrderData = validateAndCompleteOrder(fullOrderData)
// =======
  //     // 음성 텍스트를 주문 데이터로 파싱 시도 (거래처 매칭 포함)
  //     try {
  //       // console.log('📝 주문 데이터 및 거래처 파싱 시작:', result.transcription)
  //       const fullOrderData = await fetchParsedOrder(file)
        
  //       if (fullOrderData.items && fullOrderData.items.length > 0) {
  //         const validatedOrderData = validateAndCompleteOrder(fullOrderData)
  //         console.log('🎯 파싱된 주문 데이터:', validatedOrderData)
  //         console.log('🏢 매칭된 거래처:', fullOrderData.business)

          
  //         setParsedOrder(validatedOrderData)
          
  //         // 거래처가 매칭된 경우 자동 선택
  //         if (fullOrderData.business) {
  //           onBusinessChange?.(fullOrderData.business.id)
  //         }
          
  //         // 배송일이 파싱된 경우 자동 설정
  //         if (validatedOrderData.delivery_date) {
  //           onDeliveryDateChange?.(validatedOrderData.delivery_date)
  //         }
          
// <<<<<<< feature/cdtest4
//           // 파싱된 데이터를 상위 컴포넌트로 전달
//           onOrderParsed?.({ ...validatedOrderData, business: fullOrderData.business })
//         } else {
//           // 파싱 실패해도 텍스트는 유지하고, 거래처만 있다면 표시
//           if (fullOrderData.business) {
//             setParsedOrder({ ...fullOrderData, items: [] })
//             onBusinessChange?.(fullOrderData.business.id)
//           } else {
//             setParsedOrder(null)
//           }
//         }
//       } catch (parseError) {
//         // 파싱 실패해도 STT 텍스트는 유지
//         setParsedOrder(null)
//       }
      
//     } catch (err) {
//       const errorMsg = err instanceof Error ? err.message : 'STT 변환 중 오류가 발생했습니다.'
//       setError(errorMsg)
//       onError?.(errorMsg)
//     } finally {
//       setIsProcessing(false)
//     }
//   }
// =======
  //         // 파싱된 데이터를 상위 컴포넌트로 전달
  //         onOrderParsed?.({ ...validatedOrderData, business: fullOrderData.business })
  //       } else {
  //         console.warn('⚠️ 주문 품목을 찾을 수 없습니다:', result.transcription)
  //         // 파싱 실패해도 텍스트는 유지하고, 거래처만 있다면 표시
  //         if (fullOrderData.business) {
  //           console.log('🏢 거래처만 매칭됨:', fullOrderData.business)
  //           setParsedOrder({ ...fullOrderData, items: [] })
  //           onBusinessChange?.(fullOrderData.business.id)
  //         } else {
  //           setParsedOrder(null)
  //         }
  //       }
  //     } catch (parseError) {
  //       console.error('❌ 주문 파싱 실패:', parseError)
  //       // 파싱 실패해도 STT 텍스트는 유지
  //       setParsedOrder(null)
  //     }
      
  //   } catch (err) {
  //     console.error('❌ STT 변환 또는 파싱 실패:', err)
  //     const errorMsg = err instanceof Error ? err.message : 'STT 변환 중 오류가 발생했습니다.'
  //     setError(errorMsg)
  //     onError?.(errorMsg)
  //   } finally {
  //     setIsProcessing(false)
  //   }
  // }


  const handleRemoveFile = () => {
    setUploadedFile(null)
    setTranscribedText('')
    setParsedOrder(null)
    setError('')
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  const parseVoiceFile = async (file: File) => {
    setIsProcessing(true)
    setError('')
    setParsedOrder(null)
  
    try {
      const fullOrderData = await fetchParsedOrder(file)
  
      // ✅ 변환된 텍스트 (있으면 표시)
      if (fullOrderData.transcribed_text) {
        setTranscribedText(fullOrderData.transcribed_text)
        onTranscriptionComplete?.(fullOrderData.transcribed_text)
      }
  
      // ✅ 주문 품목 확인
      if (fullOrderData.items && fullOrderData.items.length > 0) {
        const validatedOrderData = validateAndCompleteOrder(fullOrderData)
        setParsedOrder(validatedOrderData)
        onOrderParsed?.({ ...validatedOrderData, business: fullOrderData.business })
  
        if (fullOrderData.business) {
          onBusinessChange?.(fullOrderData.business.id)
        }
  
        if (validatedOrderData.delivery_date) {
          onDeliveryDateChange?.(validatedOrderData.delivery_date)
        }
      } else {
        setParsedOrder(null)
  
        // 거래처만 매칭된 경우
        if (fullOrderData.business) {
          onBusinessChange?.(fullOrderData.business.id)
        }
  
        setError("주문 품목을 파악할 수 없습니다. 텍스트 또는 파일을 다시 확인해 주세요.")
      }
  
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '파일 분석 중 오류가 발생했습니다.'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Mic className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            음성 파일을 업로드하세요
          </h3>
          <p className="text-gray-600 mb-4">
            MP3 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mx-auto"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                처리 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                파일 선택
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mic className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="text-red-500 hover:text-red-700"
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>일시정지</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>재생</span>
                </>
              )}
            </Button>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <audio
            ref={audioRef}
            src={uploadedFile ? URL.createObjectURL(uploadedFile) : ''}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        </div>
      )}
      
      {/* 로딩바 */}
      {isProcessing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-1">음성을 텍스트로 변환 중...</h4>
              <p className="text-sm text-yellow-700">잠시만 기다려 주세요. 처리 시간이 다소 소요될 수 있습니다.</p>
            </div>
          </div>
          <div className="relative overflow-hidden">
            <div className="bg-yellow-200 rounded-full h-2 relative overflow-hidden">
              {/* 메인 로딩바 */}
              <div 
                className="bg-yellow-500 h-2 rounded-full absolute will-change-transform"
                style={{
                  width: '25%',
                  animation: 'slideLeft 1.5s ease-out infinite',
                }}
              ></div>
              {/* 잔상 효과 - 메인 바 뒤쪽에 위치 */}
              <div 
                className="bg-yellow-400 h-2 rounded-full absolute opacity-60 will-change-transform"
                style={{
                  width: '15%',
                  animation: 'slideLeftTail 1.5s ease-out infinite',
                }}
              ></div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes slideLeft {
                0% { 
                  transform: translateX(-100%); 
                  opacity: 0;
                }
                10% {
                  opacity: 1;
                }
                90% {
                  opacity: 1;
                }
                100% { 
                  transform: translateX(400%); 
                  opacity: 0;
                }
              }
              @keyframes slideLeftTail {
                0% { 
                  transform: translateX(-115%); 
                  opacity: 0;
                }
                10% {
                  opacity: 0.6;
                }
                90% {
                  opacity: 0.6;
                }
                100% { 
                  transform: translateX(385%); 
                  opacity: 0;
                }
              }
            `
          }} />
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
      
      {/* 변환된 텍스트 */}
      {transcribedText && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">🎤 추출된 텍스트:</h4>
          <div className="bg-white rounded-md p-3 border">
            <p className="text-gray-800 leading-relaxed">{transcribedText}</p>
          </div>
          <p className="text-xs text-green-600 mt-2">
            ✅ 음성 변환이 완료되었습니다. 텍스트를 확인하고 필요시 수정해주세요.
          </p>
        </div>
      )}
      
      {/* 주문 정보 - 파싱 후에만 표시 */}
      {parsedOrder && !error && (
        <div className="space-y-4">
          {/* 거래처 선택 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">🎯 주문 정보:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 파싱된 거래처 표시 및 수정 */}
              <div className="space-y-2">
                <Label htmlFor="business-select">파싱된 거래처 (수정 가능)</Label>
                <Select 
                  value={selectedBusinessId?.toString() || ""} 
                  onValueChange={(value: string) => onBusinessChange?.(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="bg-white border-blue-300">
                    <SelectValue placeholder="음성에서 파싱된 거래처를 확인하고 수정하세요" />
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
                  <div className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
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
                  className="bg-white border-blue-300"
                  placeholder="음성에서 파싱된 배송일을 확인하고 수정하세요"
                />
              </div>
            </div>
            
            {/* 주문 품목들 */}
            {parsedOrder?.items && parsedOrder.items.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-900 mb-2">🐟 파싱된 주문 품목:</h5>
                <div className="space-y-2">
                  {parsedOrder.items.map((item, index) => (
                    <div key={index} className="bg-white rounded-md p-4 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">어종</label>
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                            value={item.fish_type_id}
                            onChange={(e) => {
                              // TODO: 어종 변경 핸들러 구현
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
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                            value={item.quantity}
                            min="1"
                            onChange={(e) => {
                              // TODO: 수량 변경 핸들러 구현
                            }}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">단가(원)</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                            value={item.unit_price || 0}
                            min="0"
                            onChange={(e) => {
                              // TODO: 단가 변경 핸들러 구현
                            }}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500 font-medium">단위</label>
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                            value={item.unit}
                            onChange={(e) => {
                              // TODO: 단위 변경 핸들러 구현
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
                          소계: <span className="font-semibold text-blue-600">
                            {((item.unit_price || 0) * item.quantity).toLocaleString()}원
                          </span>
                        </div>
                        <button
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                          onClick={() => {
                            // TODO: 항목 삭제 핸들러 구현
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">총 합계:</span>
                    <span className="text-lg font-bold text-blue-900">
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
            
            <p className="text-xs text-blue-600 mt-3">
              ✅ 위 정보를 확인하고 수정한 후 주문을 등록해주세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceUploadTab 