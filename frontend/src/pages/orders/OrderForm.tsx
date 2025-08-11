/**
 * 주문 폼 컴포넌트
 * 새 주문을 생성하는 폼입니다
 */
import React, { useState, useEffect } from "react"
import type { ChangeEvent, FormEvent } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { X, Plus, Save, CalendarDays } from "lucide-react"
import BusinessSearch from "../../components/BusinessSearch"
import { parseVoiceOrder, validateAndCompleteOrder } from "../../utils/orderParser"
import { formatPhoneNumber } from "../../utils/phoneFormatter"
import { 
  convertAudioToText, 
  isSupportedAudioFormat, 
  formatFileSize, 
  getAudioDuration,
  startRealTimeSpeechRecognition,
  AudioFileInfo 
} from "../../utils/audioProcessor"
import MinimalCalendar from "../../components/ui/MinimalCalendar"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

// 공통 컴포넌트들 import
import VoiceUploadTab from "./components/VoiceUploadTab"
import TextInputTab from "./components/TextInputTab"
import ManualInputTab from "./components/ManualInputTab"
import ImageUploadTab from "./components/ImageUploadTab"
import OrderItemList from "./components/OrderItemList"

// 타입 정의 - types/index.ts에서 가져온 타입 사용
import type { Business, FishType, OrderItem as ApiOrderItem } from "../../types"

// API 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (Firebase 토큰 사용)
api.interceptors.request.use(
  (config) => {
    const firebaseToken = localStorage.getItem('firebase_token')
    if (firebaseToken) {
      config.headers.Authorization = `Bearer ${firebaseToken}`
    }
    return config
  },
  (error) => {
    console.error('API 요청 오류:', error)
    return Promise.reject(error)
  }
)

// 한국 시간대로 날짜를 처리하는 함수들
const toKoreanDate = (date: Date): string => {
  const koreanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return koreanDate.toISOString().split('T')[0]
}

const fromKoreanDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 9, 0, 0) // 한국 시간 9시로 설정
}

const formatKoreanDate = (dateString: string): string => {
  if (!dateString) return ""
  const date = fromKoreanDate(dateString)
  return format(date, "yyyy-MM-dd", { locale: ko })
}

interface OrderFormProps {
  onClose: () => void;
  onSubmit: (orderData: any) => void;
  parsedOrderData?: {
    order: {
      business_id: number;
      contact: string;
      delivery_datetime: string;
      transcribed_text: string;
      raw_input_path?: string;
    };
    order_items: Array<{
      fish_type_id: number;
      quantity: number;
      unit_price: number;
      unit: string;
      remarks?: string;
    }>;
  };
}

interface OrderItem {
  id: string;
  fish_type_id: number;
  fish_name: string;
  quantity: number;
  unit_price: number;
  unit: string;
  remarks?: string;
  delivery_datetime: string;
}

interface FormData {
  business_name: string;
  phone_number: string;
  memo: string;
  source_type: "voice" | "text" | "manual" | "image";
  transcribed_text: string;
  raw_input_path: string;
  delivery_datetime: string;
  items: OrderItem[];
}

const OrderForm: React.FC<OrderFormProps> = ({ onClose, onSubmit, parsedOrderData }) => {
  const [showBusinessSearch, setShowBusinessSearch] = useState<boolean>(false)
  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false)
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  
  // 어종 목록 상태 (API에서 가져올 예정)
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [isLoadingFishTypes, setIsLoadingFishTypes] = useState<boolean>(false)

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null)
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false)

  // 어종 목록 가져오기 (직접 API 호출)
  useEffect(() => {
    const fetchFishTypes = async () => {
      try {
        setIsLoadingFishTypes(true)
        const response = await api.get('/fish-registry/fish-types/')
        console.log('어종 목록 응답:', response.data)
        
        // API 응답 구조에 따라 데이터 추출
        let fishTypeData: FishType[] = []
        
        if (response.data && Array.isArray(response.data)) {
          fishTypeData = response.data
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          fishTypeData = response.data.results
        } else if (response.data && typeof response.data === 'object') {
          // 단일 객체인 경우 배열로 변환
          fishTypeData = [response.data]
        }
        
        setFishTypes(fishTypeData)
      } catch (error) {
        console.error('어종 목록 가져오기 실패:', error)
        setFishTypes([])
      } finally {
        setIsLoadingFishTypes(false)
      }
    }

    fetchFishTypes()
  }, [])

  // 거래처 목록 가져오기 (직접 API 호출)
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setIsLoadingBusinesses(true)
        const response = await api.get('/business/customers/')
        console.log('거래처 목록 응답:', response.data)
        
        // API 응답 구조에 따라 데이터 추출
        let businessData: Business[] = []
        
        if (response.data && Array.isArray(response.data)) {
          businessData = response.data
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          businessData = response.data.results
        }
        
        setBusinesses(businessData)
      } catch (error) {
        console.error('거래처 목록 가져오기 실패:', error)
        setBusinesses([])
      } finally {
        setIsLoadingBusinesses(false)
      }
    }

    fetchBusinesses()
  }, [])

  // business_id로 거래처 정보 찾기
  const findBusinessById = (businessId: number): Business | undefined => {
    return businesses.find((business: Business) => business.id === businessId)
  }

  const [formData, setFormData] = useState<FormData>(() => {
    return {
      business_name: "",
      phone_number: "",
      memo: "",
      source_type: "text" as "voice" | "text" | "manual" | "image",
      transcribed_text: "",
      raw_input_path: "",
      delivery_datetime: "",
      items: [] as OrderItem[]
    }
  })

  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    fish_type_id: 1,
    quantity: 1,
    unit_price: 0,
    unit: "박스",
    remarks: "",
    delivery_datetime: ""
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: FormData) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBusinessSelect = (business: Business) => {
    setFormData((prev: FormData) => ({
      ...prev,
      business_name: business.business_name,
      phone_number: business.phone_number
    }))
    setShowBusinessSearch(false)
  }

  // 음성 파일 업로드 처리
  const handleVoiceFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isSupportedAudioFormat(file)) {
      alert('지원하지 않는 오디오 파일 형식입니다. WAV, MP3, OGG, WEBM, M4A, AAC 파일을 사용해주세요.')
      return
    }

    try {
      const duration = await getAudioDuration(file)
      const audioInfo: AudioFileInfo = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        duration
      }
      
      setAudioFile(audioInfo)
      setFormData((prev: FormData) => ({ ...prev, source_type: 'voice' }))
      
      setIsProcessingAudio(true)
      const transcribedText = await convertAudioToText(file)
      setFormData((prev: FormData) => ({ ...prev, transcribed_text: transcribedText }))
      setIsProcessingAudio(false)
      
      alert('음성 파일이 성공적으로 업로드되고 텍스트로 변환되었습니다!')
    } catch (error) {
      setIsProcessingAudio(false)
      alert(`음성 파일 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 이미지 파일 업로드 처리
  const handleImageFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다. JPG, PNG, GIF 파일을 사용해주세요.')
      return
    }

    try {
      setIsProcessingImage(true)
      setImageFile(file)
      setFormData((prev: FormData) => ({ ...prev, source_type: 'image' }))
      
      // 이미지에서 텍스트 추출 (OCR 기능)
      const extractedText = await extractTextFromImage(file)
      setFormData((prev: FormData) => ({ ...prev, transcribed_text: extractedText }))
      setIsProcessingImage(false)
      
      alert('이미지에서 텍스트가 성공적으로 추출되었습니다!')
    } catch (error) {
      setIsProcessingImage(false)
      alert(`이미지 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 이미지에서 텍스트 추출 함수 (OCR)
  const extractTextFromImage = async (file: File): Promise<string> => {
    // 실제로는 OCR API를 사용해야 하지만, 여기서는 모의 구현
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("이미지에서 추출된 텍스트: 도미 10kg, 방어 5마리 주문합니다. 납품은 8월 5일 오전 중으로 부탁드립니다.")
      }, 2000)
    })
  }

  // 음성 파싱 처리
  const handleVoiceParse = () => {
    if (formData.transcribed_text.trim()) {
      try {
        const parsedData = parseVoiceOrder(formData.transcribed_text)
        const validatedData = validateAndCompleteOrder(parsedData)
        
        setFormData((prev: FormData) => ({
          ...prev,
          delivery_datetime: validatedData.delivery_date || prev.delivery_datetime,
          memo: validatedData.memo || prev.memo,
          items: validatedData.items.map((item: any) => ({
            id: Date.now().toString(),
            fish_type_id: item.fish_type_id,
            fish_name: fishTypes.find((f: FishType) => f.id === item.fish_type_id)?.name || '',
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            unit: item.unit,
            delivery_datetime: formData.delivery_datetime
          }))
        }))
        
        alert('음성 파싱이 완료되었습니다!')
      } catch (error) {
        alert(`파싱 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    } else {
      alert('음성 원문을 먼저 입력해주세요.')
    }
  }

  // 텍스트 파싱 처리
  const handleTextParse = () => {
    if (formData.transcribed_text.trim()) {
      try {
        const parsedData = parseVoiceOrder(formData.transcribed_text)
        const validatedData = validateAndCompleteOrder(parsedData)
        
        setFormData((prev: FormData) => ({
          ...prev,
          delivery_datetime: validatedData.delivery_date || prev.delivery_datetime,
          memo: validatedData.memo || prev.memo,
          items: validatedData.items.map((item: any) => ({
            id: Date.now().toString(),
            fish_type_id: item.fish_type_id,
            fish_name: fishTypes.find((f: FishType) => f.id === item.fish_type_id)?.name || '',
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            unit: item.unit,
            delivery_datetime: formData.delivery_datetime
          }))
        }))
        
        alert('텍스트 파싱이 완료되었습니다!')
      } catch (error) {
        alert(`파싱 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    } else {
      alert('텍스트를 먼저 입력해주세요.')
    }
  }

  // 주문 항목 추가
  const addItem = () => {
    if (newItem.quantity && newItem.quantity > 0 && newItem.unit_price && newItem.unit_price > 0) {
      const fishType = fishTypes.find((f: FishType) => f.id === newItem.fish_type_id)
      const item: OrderItem = {
        id: Date.now().toString(),
        fish_type_id: newItem.fish_type_id || 1,
        fish_name: fishType?.name || '',
        quantity: newItem.quantity || 0,
        unit_price: newItem.unit_price || 0,
        unit: newItem.unit || "박스",
        remarks: newItem.remarks,
        delivery_datetime: newItem.delivery_datetime || formData.delivery_datetime
      }
      
      setFormData((prev: FormData) => ({
        ...prev,
        items: [...prev.items, item]
      }))
      
      setNewItem({
        fish_type_id: 1,
        quantity: 1,
        unit_price: 0,
        unit: "박스",
        remarks: "",
        delivery_datetime: ""
      })
    }
  }

  // 주문 항목 제거
  const removeItem = (itemId: string) => {
    setFormData((prev: FormData) => ({
      ...prev,
      items: prev.items.filter((item: OrderItem) => item.id !== itemId)
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!selectedBusinessId) {
      alert('거래처를 선택해주세요.')
      return
    }
    
    const total_price = formData.items.reduce((sum: number, item: OrderItem) => sum + (item.quantity * item.unit_price), 0)
    
    // delivery_date가 비어있으면 null로 설정
    let delivery_datetime = null
    if (formData.delivery_datetime) {
      try {
        // 한국 시간대로 날짜 처리
        const koreanDate = fromKoreanDate(formData.delivery_datetime)
        delivery_datetime = koreanDate.toISOString()
      } catch (error) {
        console.error('날짜 변환 오류:', error)
      }
    }
    
    // Order 타입에 맞게 데이터 변환
    const orderData = {
      business_id: selectedBusinessId,
      total_price: parseInt(total_price.toString()),
      memo: formData.memo || '',
      source_type: formData.source_type === 'manual' || formData.source_type === 'image' ? 'manual' : formData.source_type as 'voice' | 'text',
      raw_input_path: formData.raw_input_path || '',
      transcribed_text: formData.transcribed_text || '',
      delivery_datetime: delivery_datetime,
      order_status: "placed",
      order_items: formData.items.map((item: OrderItem) => ({
        fish_type_id: item.fish_type_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price.toString()),
        unit: item.unit || '',
        remarks: item.remarks || ""
      }))
    }
    
    try {
      console.log('전송할 주문 데이터:', orderData)
      // API를 사용하여 주문 저장
      const response = await api.post('/order/upload/', orderData)
      
      if (response.data) {
        alert('주문이 성공적으로 저장되었습니다!')
        onSubmit(response.data)
      } else {
        throw new Error('주문 저장에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('주문 저장 오류:', error)
      if (error.response && error.response.data) {
        console.error('서버 응답 오류:', error.response.data)
        alert(`주문 저장 오류: ${JSON.stringify(error.response.data)}`)
      } else {
        alert(`주문 저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>새 주문 생성</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 거래처 선택 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-900">거래처 선택</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-select">거래처</Label>
                  <Select 
                    value={selectedBusinessId?.toString() || ""} 
                    onValueChange={(value: string) => setSelectedBusinessId(parseInt(value))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="거래처를 선택하세요" />
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
                    <div className="mt-2 text-sm text-blue-700">
                      ✓ 선택된 거래처: {businesses.find((b: Business) => b.id === selectedBusinessId)?.business_name}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delivery_date">납품일</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {formData.delivery_datetime ? (
                          formatKoreanDate(formData.delivery_datetime)
                        ) : (
                          "납품일 선택"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <MinimalCalendar
                        value={formData.delivery_datetime ? fromKoreanDate(formData.delivery_datetime) : null}
                        onChange={(date: Date | null) => handleInputChange("delivery_datetime", date ? toKoreanDate(date) : "")}
                        placeholder="납품일 선택"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* 주문 입력 방식 탭 */}
            <div>
              <Label>주문 입력 방식</Label>
              <Tabs value={formData.source_type} onValueChange={(value: string) => handleInputChange("source_type", value)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="voice">음성</TabsTrigger>
                  <TabsTrigger value="text">텍스트</TabsTrigger>
                  <TabsTrigger value="manual">수동</TabsTrigger>
                  <TabsTrigger value="image">이미지</TabsTrigger>
                </TabsList>
                
                <TabsContent value="voice">
                  <VoiceUploadTab
                    onFileUpload={handleVoiceFileUpload}
                    isProcessing={isProcessingAudio}
                    transcribedText={formData.transcribed_text}
                    uploadedFile={audioFile?.file || null}
                    onRemoveFile={() => {
                      setAudioFile(null)
                      setFormData((prev: FormData) => ({ ...prev, transcribed_text: '' }))
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="text">
                  <TextInputTab
                    textInput={formData.transcribed_text}
                    setTextInput={(text: string) => handleInputChange("transcribed_text", text)}
                    onParse={handleTextParse}
                    isProcessing={isProcessingAudio}
                    transcribedText={formData.transcribed_text}
                  />
                </TabsContent>
                
                <TabsContent value="manual">
                  <ManualInputTab
                    currentItem={newItem}
                    setCurrentItem={setNewItem}
                    onAddItem={addItem}
                    fishTypes={fishTypes}
                  />
                </TabsContent>
                
                <TabsContent value="image">
                  <ImageUploadTab
                    onFileUpload={handleImageFileUpload}
                    isProcessing={isProcessingImage}
                    transcribedText={formData.transcribed_text}
                    uploadedFile={imageFile}
                    onRemoveFile={() => {
                      setImageFile(null)
                      setFormData((prev: FormData) => ({ ...prev, transcribed_text: '' }))
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* 메모 */}
            <div>
              <Label htmlFor="memo">메모</Label>
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange("memo", e.target.value)}
                placeholder="추가 메모를 입력하세요"
                rows={2}
              />
            </div>

            {/* 주문 품목 목록 */}
            <OrderItemList
              items={formData.items}
              onRemoveItem={removeItem}
              totalPrice={formData.items.reduce((sum: number, item: OrderItem) => sum + (item.quantity * item.unit_price), 0)}
            />

            {/* 버튼 */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={formData.items.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                주문 생성
              </Button>
            </div>
          </form>
        </CardContent>

        {/* 거래처 검색 모달 */}
        {showBusinessSearch && (
          <BusinessSearch
            onSelect={handleBusinessSelect}
            onClose={() => setShowBusinessSearch(false)}
          />
        )}
      </Card>
    </div>
  )
}

export default OrderForm 