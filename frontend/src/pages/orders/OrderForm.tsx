/**
 * 주문 폼 컴포넌트
 * 새 주문을 생성하는 폼입니다
 */

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from "react"
import { useParams } from "react-router-dom"
import { Plus, Trash2, Upload, Mic, FileText, X, Save, CalendarDays } from "lucide-react"
import { toast, Toaster } from "react-hot-toast"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Badge } from "../../components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { parseVoiceOrder, validateAndCompleteOrder } from "../../utils/orderParser"
import { OrderItem } from "../../types"
import OrderItemList from "./components/OrderItemList"
import MinimalCalendar from "../../components/ui/MinimalCalendar"
import BusinessSearch from "../../components/BusinessSearch"

// 공통 컴포넌트들 import
import VoiceUploadTab from "./components/VoiceUploadTab"
import TextInputTab from "./components/TextInputTab"
import ManualInputTab from "./components/ManualInputTab"
import ImageUploadTab from "./components/ImageUploadTab"

// 타입 정의 - types/index.ts에서 가져온 타입 사용
import type { Business, FishType } from "../../types"

// API import
import { fishTypeApi, businessApi, inventoryApi } from "../../lib/api"
import { TokenManager } from "../../lib/tokenManager"

// JWT 토큰 기반 API 사용 (../../lib/api.ts에서 import)

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
  return date.toISOString().split('T')[0] // date-fns format 대신 직접 포맷
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
      fish_type: number;
      quantity: number;
      unit_price: number;
      unit: string;
      remarks?: string;
    }>;
  };
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

// STT 상태를 폴링하는 함수 (중복 요청 방지)
const pollTranscriptionStatus = async (transcriptionId: string, _businessId: number, setFormDataCallback: React.Dispatch<React.SetStateAction<FormData>>, onSubmitCallback: (data: any) => void): Promise<void> => {
  const maxAttempts = 20 // 최대 20번 시도 (10분)
  let attempts = 0
  let isPolling = true
  
  const poll = async () => {
    if (!isPolling) return // 폴링 중단된 경우
    
    try {
      attempts++
      console.log(`폴링 시도 ${attempts}/${maxAttempts}: transcriptionId=${transcriptionId}`)
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/transcription/${transcriptionId}/status/`, {
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`STT 상태: ${data.status}`)
      
      if (data.status === 'completed') {
        isPolling = false // 폴링 중단
        
        // STT 완료 - 텍스트 표시 후 주문 생성
        if (data.transcribed_text) {
          setFormDataCallback(prev => ({ ...prev, transcribed_text: data.transcribed_text }))
          toast.success(`음성 인식 완료: "${data.transcribed_text.substring(0, 50)}..."`)
          
          // 주문 생성
          try {
            const orderResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/transcription/${transcriptionId}/create-order/`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${TokenManager.getAccessToken()}`
              }
            })
            const orderResult = await orderResponse.json()
            
            if (orderResponse.ok && orderResult.data) {
              toast.success('주문이 성공적으로 생성되었습니다!')
              onSubmitCallback(orderResult.data)
            } else {
              toast.error(orderResult.error || '주문 생성에 실패했습니다.')
            }
          } catch (orderError) {
            console.error('주문 생성 오류:', orderError)
            toast.error('주문 생성 중 오류가 발생했습니다.')
          }
        } else {
          toast.error('음성 인식 텍스트가 비어있습니다.')
        }
      } else if (data.status === 'failed') {
        isPolling = false // 폴링 중단
        toast.error('음성 인식에 실패했습니다. 다시 시도해주세요.')
      } else if (data.status === 'processing' && attempts < maxAttempts) {
        // 계속 폴링 - 5초 간격으로 증가
        const delay = Math.min(5000, 3000 + (attempts * 500)) // 3초에서 시작해서 점진적 증가
        setTimeout(poll, delay)
      } else if (attempts >= maxAttempts) {
        isPolling = false // 폴링 중단
        toast.error('음성 인식 처리 시간이 초과되었습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error(`폴링 오류 (시도 ${attempts}):`, error)
      
      if (attempts < maxAttempts && isPolling) {
        // 오류 시 더 긴 간격으로 재시도
        setTimeout(poll, 5000)
      } else {
        isPolling = false
        toast.error('음성 인식 상태 확인 중 오류가 발생했습니다.')
      }
    }
  }
  
  // 첫 번째 폴링은 2초 후 시작 (STT 처리 시작 시간 고려)
  setTimeout(poll, 2000)
}

const OrderForm: React.FC<OrderFormProps> = ({ onClose, onSubmit, parsedOrderData: _parsedOrderData }) => {
  const [showBusinessSearch, setShowBusinessSearch] = useState<boolean>(false)
  // const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  // const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false)
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false)
  // const [isRecording, setIsRecording] = useState<boolean>(false)
  
  // 재고 체크 관련 상태
  const [stockWarnings, setStockWarnings] = useState<string[]>([])
  const [stockErrors, setStockErrors] = useState<any[]>([])
  const [isCheckingStock, setIsCheckingStock] = useState<boolean>(false)
  const [tempStockInfo, setTempStockInfo] = useState<{warnings: string[], errors: any[]}>({warnings: [], errors: []})
  
  // 주문 완료 후 재고 이슈 상태
  const [completedOrderStockIssue, setCompletedOrderStockIssue] = useState<boolean>(false)
  
  // 어종 목록 상태 (API에서 가져올 예정)
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  // const [isLoadingFishTypes, setIsLoadingFishTypes] = useState<boolean>(false)

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null)
  // const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false)

  // Form 데이터 상태 정의 (useEffect에서 사용하므로 먼저 선언)
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

  // 어종 목록 가져오기 (JWT 토큰 기반 API 사용)
  useEffect(() => {
    const fetchFishTypes = async () => {
      try {
        // setIsLoadingFishTypes(true)
        const response = await fishTypeApi.getAll()
        console.log('어종 목록 응답:', response.data)
        
        setFishTypes(response.data || [])
      } catch (error) {
        console.error('어종 목록 가져오기 실패:', error)
        setFishTypes([])
      } finally {
        // setIsLoadingFishTypes(false)
      }
    }

    fetchFishTypes()
  }, [])

  // 재고 체크 함수를 별도로 분리 (외부에서 호출 가능)
  const checkStockForAllItems = async () => {
    if (formData.items.length === 0) {
      setStockWarnings([])
      setStockErrors([])
      return
    }

    try {
      console.log('🔍 실시간 재고 체크 시작...')
      const stockCheckItems = formData.items.map((item: OrderItem) => ({
        fish_type_id: item.fish_type,
        quantity: item.quantity,
        unit: item.unit || '박스'
      }))
      
      const stockResult = await inventoryApi.checkStock(stockCheckItems)
      console.log('📦 재고 체크 결과:', stockResult)
      
      setStockWarnings(stockResult.warnings || [])
      setStockErrors(stockResult.errors || [])
      
    } catch (error) {
      console.error('재고 체크 실패:', error)
      setStockWarnings([])
      setStockErrors([])
    }
  }

  // 주문 아이템이 변경될 때마다 재고 체크
  useEffect(() => {
    // 디바운스를 위해 500ms 지연
    const timeoutId = setTimeout(checkStockForAllItems, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.items])

  // 전역 이벤트를 통한 재고 체크 갱신 (재고 추가 시 호출)
  useEffect(() => {
    const handleStockUpdate = () => {
      console.log('📦 재고 업데이트 이벤트 수신, 재고 체크 재실행')
      checkStockForAllItems()
    }

    window.addEventListener('stockUpdated', handleStockUpdate)
    return () => window.removeEventListener('stockUpdated', handleStockUpdate)
  }, [formData.items])

  // 거래처 목록 가져오기 (JWT 토큰 기반 API 사용)
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        console.log('🔍 거래처 목록 요청 시작...')
        // setIsLoadingBusinesses(true)
        const response = await businessApi.getAll()
        console.log('✅ 거래처 목록 응답:', response)
        console.log('📊 응답 타입:', typeof response)
        console.log('📋 응답 구조:', Object.keys(response || {}))
        
        // API 응답 구조에 따라 데이터 추출
        let businessData: Business[] = []
        
        if (response && Array.isArray(response)) {
          console.log('📁 응답이 배열 형태')
          businessData = response
        } else if (response && Array.isArray((response as any).results)) {
          console.log('📁 페이지네이션 응답 형태 (results)')
          businessData = (response as any).results
        } else if (response && response.data && Array.isArray(response.data.results)) {
          console.log('📁 페이지네이션 응답 형태 (data.results)')
          businessData = response.data.results
        } else if (response && response.data && Array.isArray(response.data)) {
          console.log('📁 데이터 래핑 응답 형태 (data)')
          businessData = response.data
        } else {
          console.log('❓ 알 수 없는 응답 형태:', response)
        }
        
        console.log('💼 추출된 거래처 데이터:', businessData)
        console.log('🔢 거래처 개수:', businessData.length)
        setBusinesses(businessData)
      } catch (error: any) {
        console.error('❌ 거래처 목록 가져오기 실패:', error)
        console.error('📄 오류 상세:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        })
        setBusinesses([])
      } finally {
        // setIsLoadingBusinesses(false)
      }
    }

    fetchBusinesses()
  }, [])

  // business_id로 거래처 정보 찾기
  // const findBusinessById = (businessId: number): Business | undefined => {
  //   return businesses.find((business: Business) => business.id === businessId)
  // }

  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    fish_type: 1,
    quantity: 1,
    unit_price: 0,
    unit: "박스",
    remarks: ""
  })

  const handleInputChange = (field: string, value: string) => {
    // 등록 방법 전환시 재고 알림 초기화
    if (field === "source_type") {
      setStockWarnings([])
      setStockErrors([])
      setTempStockInfo({warnings: [], errors: []})
    }
    
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

  // 음성 파일 업로드 처리 (백엔드 STT 사용)
  // const handleVoiceFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (!file) return

  //   if (!isSupportedAudioFormat(file)) {
  //     toast.error('지원하지 않는 오디오 파일 형식입니다. WAV, MP3, OGG, WEBM, M4A, AAC, FLAC 파일을 사용해주세요.')
  //     return
  //   }

  //   try {
  //     const duration = await getAudioDuration(file)
  //     const audioInfo: AudioFileInfo = {
  //       file,
  //       name: file.name,
  //       size: file.size,
  //       type: file.type,
  //       duration
  //     }
      
  //     setAudioFile(audioInfo)
  //     setFormData((prev: FormData) => ({ 
  //       ...prev, 
  //       source_type: 'voice',
  //       raw_input_path: file.name // 파일명 저장
  //     }))
      
  //     toast.success('음성 파일이 업로드되었습니다. 주문 생성 시 음성 인식이 처리됩니다.')
  //   } catch (error) {
  //     toast.error(`음성 파일 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  //   }
  // }

  // 이미지 파일 업로드 처리
  const handleImageFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다. JPG, PNG, GIF 파일을 사용해주세요.')
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
      
      toast.success('이미지에서 텍스트가 성공적으로 추출되었습니다!')
    } catch (error) {
      setIsProcessingImage(false)
      toast.error(`이미지 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 이미지에서 텍스트 추출 함수 (OCR)
  const extractTextFromImage = async (_file: File): Promise<string> => {
    // 실제로는 OCR API를 사용해야 하지만, 여기서는 모의 구현
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("이미지에서 추출된 텍스트: 도미 10kg, 방어 5마리 주문합니다. 납품은 8월 5일 오전 중으로 부탁드립니다.")
      }, 2000)
    })
  }

  // 음성 파싱 처리
  // const handleVoiceParse = () => {
  //   if (formData.transcribed_text.trim()) {
  //     try {
  //       const parsedData = parseVoiceOrder(formData.transcribed_text)
  //       const validatedData = validateAndCompleteOrder(parsedData)
        
  //       setFormData((prev: FormData) => ({
  //         ...prev,
  //         delivery_datetime: validatedData.delivery_date || prev.delivery_datetime,
  //         memo: validatedData.memo || prev.memo,
  //         items: validatedData.items.map((item: any) => ({
  //           id: Date.now().toString(),
  //           fish_type_id: item.fish_type_id,
  //           fish_name: fishTypes.find((f: FishType) => f.id === item.fish_type_id)?.name || '',
  //           quantity: item.quantity,
  //           unit_price: item.unit_price || 0,
  //           unit: item.unit,
  //           delivery_datetime: formData.delivery_datetime
  //         }))
  //       }))
        
  //       toast.success('음성 파싱이 완료되었습니다!')
  //     } catch (error) {
  //       toast.error(`파싱 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  //     }
  //   } else {
  //     toast.error('음성 원문을 먼저 입력해주세요.')
  //   }
  // }

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
            id: Date.now(),
                    fish_type: item.fish_type,
        item_name_snapshot: fishTypes.find((f) => f.id === item.fish_type)?.name || '',
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            unit: item.unit,
            remarks: ''
          }))
        }))
        
        toast.success('텍스트 파싱이 완료되었습니다!')
      } catch (error) {
        toast.error(`파싱 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    } else {
      toast.error('텍스트를 먼저 입력해주세요.')
    }
  }

  // 주문 항목 추가
  const addItem = () => {
    if (newItem.quantity && newItem.quantity > 0 && newItem.unit_price && newItem.unit_price > 0) {
      const fishType = fishTypes.find((f: FishType) => f.id === newItem.fish_type)
      const item: OrderItem = {
        id: Date.now(),
        fish_type: newItem.fish_type || 1,
        item_name_snapshot: fishType?.name || '',
        quantity: newItem.quantity || 0,
        unit_price: newItem.unit_price || 0,
        unit: newItem.unit || "박스",
        remarks: newItem.remarks
      }
      
      setFormData((prev: FormData) => ({
        ...prev,
        items: [...prev.items, item]
      }))
      
      setNewItem({
        fish_type: 1,
        quantity: 1,
        unit_price: 0,
        unit: "박스",
        remarks: ""
      })
      
      // 임시 재고 정보 초기화
      setTempStockInfo({warnings: [], errors: []})
      
      // 주문 항목이 추가되었으므로 재고 체크
      setTimeout(() => {
        checkStockForCurrentItems()
      }, 100)
    }
  }

  // 주문 항목 제거
  const removeItem = (index: number) => {
    setFormData((prev: FormData) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
    
    // 주문 항목이 변경되었으므로 재고 체크
    setTimeout(() => {
      checkStockForCurrentItems()
    }, 100)
  }

  // 재고 체크 함수
  const checkStockForCurrentItems = async () => {
    if (formData.items.length === 0) {
      setStockWarnings([])
      setStockErrors([])
      return
    }

    setIsCheckingStock(true)
    try {
      const orderItems = formData.items.map(item => ({
        fish_type: item.fish_type,
        quantity: item.quantity,
        unit: item.unit
      }))

      // const result = await inventoryApi.checkStock(orderItems) // inventoryApi 사용 제거
      
      // setStockWarnings(result.warnings || [])
      // setStockErrors(result.errors || [])
      
      // 재고 체크 기능 비활성화
      // if (result.status === 'insufficient') {
      //   toast.warning('일부 어종의 재고가 부족하지만 주문은 가능합니다.')
      // } else if (result.status === 'warning') {
      //   toast.warning('일부 어종의 재고가 부족할 수 있습니다.')
      // } else if (result.status === 'error') {
      //   toast.error('재고 확인 중 오류가 발생했습니다.')
      // }
    } catch (error) {
      console.error('재고 체크 오류:', error)
      setStockWarnings([])
      setStockErrors([])
    } finally {
      setIsCheckingStock(false)
    }
  }

  // 임시 아이템에 대한 재고 체크 (수동 입력 중)
  const checkTempStock = async (tempItem: Partial<OrderItem>) => {
    if (!tempItem.fish_type || !tempItem.quantity || tempItem.quantity <= 0) {
      setTempStockInfo({warnings: [], errors: []})
      return
    }

    try {
      const orderItems = [{
        fish_type_id: tempItem.fish_type,
        quantity: tempItem.quantity,
        unit: tempItem.unit || '박스'
      }]

      const result = await inventoryApi.checkStock(orderItems)
      
      setTempStockInfo({
        warnings: result.warnings || [],
        errors: result.errors || []
      })
    } catch (error) {
      console.error('임시 재고 체크 오류:', error)
      setTempStockInfo({warnings: [], errors: []})
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!selectedBusinessId) {
      toast.error('거래처를 선택해주세요!', {
        duration: 3000,
        style: {
          background: '#dc2626',
          color: '#fff'
        }
      })
      return
    }
    
    if (formData.items.length === 0) {
      toast.error('주문할 어종을 최소 1개 이상 입력해주세요!', {
        duration: 3000,
        style: {
          background: '#dc2626',
          color: '#fff'
        }
      })
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
    
    // 재고 체크 먼저 실행
    try {
      setIsCheckingStock(true)
      const stockCheckItems = formData.items.map((item: OrderItem) => ({
        fish_type_id: item.fish_type,
        quantity: item.quantity,
        unit: item.unit || '박스'
      }))
      
      const stockResult = await inventoryApi.checkStock(stockCheckItems)
      
      // 재고 체크 결과를 상태에 저장
      setStockWarnings(stockResult.warnings || [])
      setStockErrors(stockResult.errors || [])
      
      // 재고 부족 메시지 표시 (주문은 계속 진행)
      if (stockResult.warnings.length > 0) {
        console.log('재고 부족 경고:', stockResult.warnings)
      }
      
    } catch (stockError) {
      console.error('재고 체크 실패:', stockError)
    } finally {
      setIsCheckingStock(false)
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
        fish_type_id: item.fish_type,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price.toString()),
        unit: item.unit || '',
        remarks: item.remarks || ""
      }))
    }
    
    try {
      console.log('전송할 주문 데이터:', orderData)
      
      // 음성 파일이 있는 경우 FormData로 전송
      if (false && formData.source_type === 'voice') { // audioFile이 주석처리됨
        const formDataToSend = new FormData()
        
        // 음성 파일 추가
        // formDataToSend.append('audio_file', audioFile.file)
        
        // 주문 데이터를 JSON으로 추가
        Object.entries(orderData).forEach(([key, value]) => {
          if (key === 'order_items') {
            formDataToSend.append(key, JSON.stringify(value))
          } else {
            formDataToSend.append(key, String(value))
          }
        })
        
        // JWT 토큰으로 multipart/form-data 전송
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/upload/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TokenManager.getAccessToken()}`
          },
          body: formDataToSend
        })
        
        const result = await response.json()
        
        if (response.status === 202 && result.data) {
          // STT 처리 중 - 폴링 시작
          toast.success('음성 파일 업로드 완료! 음성 인식 처리 중입니다...')
          
          const transcriptionId = result.data.transcription_id
          const businessId = result.data.business_id
          
          // STT 상태를 폴링하여 확인
          pollTranscriptionStatus(transcriptionId, businessId, setFormData, onSubmit)
        } else if (response.ok && result.data) {
          toast.success('주문이 성공적으로 저장되었습니다!')
          onSubmit(result.data)
        } else {
          throw new Error(result.error || '주문 저장에 실패했습니다.')
        }
      } else {
        // 일반 JSON 요청 (수동, 텍스트, 이미지) - fetchWithAuth 사용
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/upload/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TokenManager.getAccessToken()}`
          },
          body: JSON.stringify(orderData)
        })
        
        const result = await response.json()
        
        if (response.ok && result.data) {
          // 주문 등록 성공 시 재고 업데이트 이벤트 발생
          window.dispatchEvent(new CustomEvent('stockUpdated', { 
            detail: { 
              action: 'order_created', 
              orderId: result.data.id,
              orderItems: orderData.order_items
            }
          }))
          
          // 재고 이슈 확인
          if (result.data.has_stock_issues) {
            setCompletedOrderStockIssue(true)
            toast.success('주문이 등록되었습니다. (재고 부족 주문 포함)', {
              duration: 5000,
              style: {
                background: '#f59e0b',
                color: '#fff'
              }
            })
          } else {
            toast.success('주문이 성공적으로 저장되었습니다!')
          }
          
          onSubmit(result.data)
        } else {
          throw new Error(result.error || '주문 저장에 실패했습니다.')
        }
      }
    } catch (error: any) {
      console.error('주문 저장 오류:', error)
      
      // 에러 메시지를 상세하게 처리
      let errorMessage = '주문 저장 중 오류가 발생했습니다.'
      
      if (error.response) {
        // 서버에서 응답한 오류
        const status = error.response.status
        const data = error.response.data
        
        if (status === 400 && data?.error) {
          // 유효성 검사 오류 - 상세 메시지 표시
          if (typeof data.error === 'object') {
            // Django serializer 오류 형식
            const errorFields = Object.keys(data.error)
            errorMessage = `입력 오류: ${errorFields.map(field => `${field}: ${data.error[field]}`).join(', ')}`
          } else {
            errorMessage = `입력 오류: ${data.error}`
          }
        } else if (status === 401) {
          errorMessage = '인증이 필요합니다. 다시 로그인해주세요.'
        } else if (status === 500 && data?.error) {
          errorMessage = `서버 오류: ${data.error}`
        } else {
          errorMessage = `서버 오류 (${status}): ${data?.error || error.message}`
        }
        
        console.error('API 오류 상세:', {
          status,
          data,
          url: error.config?.url,
          method: error.config?.method
        })
      } else if (error.message) {
        errorMessage = error.message
      }
      
      if (error.response?.data?.error) {
        // 백엔드에서 보낸 에러 메시지가 있는 경우
        if (typeof error.response.data.error === 'object') {
          // Serializer 에러인 경우 첫 번째 에러만 표시
          const firstError = Object.values(error.response.data.error)[0]
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
        } else {
          errorMessage = error.response.data.error
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    }
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#22c55e',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 주문 입력 방식 탭 - 최상단 배치, 패딩 제거 */}
        <div className="px-0 mb-4">
          <Tabs value={formData.source_type} onValueChange={(value: string) => handleInputChange("source_type", value)}>
            <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-transparent rounded-none border-b-2 border-gray-200">
              <TabsTrigger 
                value="voice" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 h-16 font-medium transition-all duration-200 border-r border-gray-200 last:border-r-0 rounded-tl-lg first:rounded-tl-lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <Mic className="h-5 w-5" />
                  <span className="text-sm">음성</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="text" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 h-16 font-medium transition-all duration-200 border-r border-gray-200 last:border-r-0 rounded-none"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg font-bold">Aa</span>
                  <span className="text-sm">텍스트</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="manual" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 h-16 font-medium transition-all duration-200 border-r border-gray-200 last:border-r-0 rounded-none"
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">수동</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="image" 
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 h-16 font-medium transition-all duration-200 border-r border-gray-200 last:border-r-0 rounded-tr-lg last:rounded-tr-lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">이미지</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 거래처 선택 - 수동 탭에서만 표시 */}
            {formData.source_type === "manual" && (
              <div className={`p-4 rounded-lg border-2 ${!selectedBusinessId ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-lg font-semibold ${!selectedBusinessId ? 'text-red-900' : 'text-blue-900'}`}>
                    거래처 선택 {!selectedBusinessId && '(필수)'}
                  </h3>
                  {!selectedBusinessId && (
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full font-medium">
                      필수 선택
                    </span>
                  )}
                </div>
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
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">{business.phone_number}</span>
                                <span className="text-xs text-red-600 font-medium">
                                  미수금: {business.outstanding_balance?.toLocaleString() || '0'}원
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBusinessId && (
                      <div className="mt-2 text-sm">
                        <div className="text-blue-700">
                          ✓ 선택된 거래처: {businesses.find((b: Business) => b.id === selectedBusinessId)?.business_name}
                        </div>
                        <div className="text-red-600 font-medium">
                          현재 미수금: {businesses.find((b: Business) => b.id === selectedBusinessId)?.outstanding_balance?.toLocaleString() || '0'}원
                        </div>
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
            )}

            {/* 거래처 미선택 경고 */}
            {!selectedBusinessId && formData.source_type === "manual" && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                  <h3 className="text-lg font-semibold text-red-800">거래처 선택 필요</h3>
                </div>
                <p className="text-red-700 text-sm mb-2">
                  주문을 등록하려면 먼저 거래처를 선택해주세요.
                </p>
                <p className="text-red-600 text-xs font-medium">
                  ⚠️ 위의 '거래처 선택' 섹션에서 거래처를 선택하신 후 주문을 진행하세요.
                </p>
              </div>
            )}

            {/* 주문 완료 후 재고 부족 경고 */}
            {completedOrderStockIssue && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                  <h3 className="text-lg font-semibold text-red-800">재고 부족 주문 등록됨</h3>
                </div>
                <p className="text-red-700 text-sm mb-2">
                  이 주문에 재고가 부족한 어종이 포함되어 있습니다. 주문은 등록되었으나 출고 전에 재고 보충이 필요합니다.
                </p>
                <p className="text-red-600 text-xs font-medium">
                  ⚠️ 재고 관리 페이지에서 해당 어종의 재고를 확인하고 필요시 추가 입고를 진행하세요.
                </p>
              </div>
            )}

            {/* 재고 체크 중 경고 메시지 */}
            {(stockWarnings.length > 0 || tempStockInfo.warnings.length > 0) && (
              <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <h3 className="text-lg font-semibold text-orange-800">재고 부족 경고</h3>
                </div>
                <div className="space-y-1">
                  {[...stockWarnings, ...tempStockInfo.warnings].map((warning, index) => (
                    <p key={index} className="text-orange-700 text-sm">• {warning}</p>
                  ))}
                </div>
                <p className="text-orange-600 text-xs font-medium mt-2">
                  ⚠️ 재고가 부족하지만 주문은 등록 가능합니다.
                </p>
              </div>
            )}

            {/* 탭 콘텐츠 영역 */}
            <div className="min-h-[300px]">
              <Tabs value={formData.source_type} onValueChange={(value: string) => handleInputChange("source_type", value)}>
                <TabsContent value="voice" className="mt-0">
                  <VoiceUploadTab
                    onTranscriptionComplete={(text: string) => {
                      setFormData((prev: FormData) => ({ ...prev, transcribed_text: text }))
                    }}
                    onOrderParsed={(orderData: any) => {
                      // 파싱된 주문 데이터로 폼 자동 업데이트
                      setFormData((prev: FormData) => ({
                        ...prev,
                        transcribed_text: orderData.transcribed_text,
                        delivery_datetime: orderData.delivery_date || prev.delivery_datetime,
                        memo: orderData.memo || prev.memo,
                        items: orderData.items?.map((item: any, index: number) => ({
                          id: Date.now() + index,
                                  fish_type: item.fish_type,
        item_name_snapshot: fishTypes.find((f) => f.id === item.fish_type)?.name || '',
                          quantity: item.quantity,
                          unit_price: item.unit_price || 0,
                          unit: item.unit,
                          remarks: ''
                        })) || prev.items
                      }))
                      
                      // 거래처가 매칭된 경우 선택된 거래처도 업데이트
                      if (orderData.business) {
                        setSelectedBusinessId(orderData.business.id)
                        toast.success(`🎯 음성에서 주문 정보 추출 완료! 거래처: ${orderData.business.business_name}`)
                      } else {
                        toast.success('🎯 음성에서 주문 정보를 자동으로 추출했습니다!')
                      }
                    }}
                    onError={(error: string) => {
                      toast.error(`음성 변환 실패: ${error}`)
                    }}
                    selectedBusinessId={selectedBusinessId}
                    onBusinessChange={setSelectedBusinessId}
                    deliveryDate={formData.delivery_datetime}
                    onDeliveryDateChange={(date: string) => handleInputChange("delivery_datetime", date)}
                  />
                </TabsContent>
                
                <TabsContent value="text" className="mt-0">
                  <TextInputTab
                    textInput={formData.transcribed_text}
                    setTextInput={(text: string) => handleInputChange("transcribed_text", text)}
                    onParse={handleTextParse}
                    isProcessing={false}
                    transcribedText={formData.transcribed_text}
                    selectedBusinessId={selectedBusinessId}
                    onBusinessChange={setSelectedBusinessId}
                    deliveryDate={formData.delivery_datetime}
                    onDeliveryDateChange={(date: string) => handleInputChange("delivery_datetime", date)}
                    onOrderParsed={(orderData: any) => {
                      // 파싱된 데이터로 폼 업데이트
                      setFormData((prev: FormData) => ({
                        ...prev,
                        delivery_datetime: orderData.delivery_date || prev.delivery_datetime,
                        memo: orderData.memo || prev.memo,
                        items: orderData.items?.map((item: any, index: number) => ({
                          id: Date.now() + index,
                                  fish_type: item.fish_type,
        item_name_snapshot: fishTypes.find((f) => f.id === item.fish_type)?.name || '',
                          quantity: item.quantity,
                          unit_price: item.unit_price || 0,
                          unit: item.unit,
                          remarks: ''
                        })) || prev.items
                      }))
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="manual" className="mt-0">

                  <ManualInputTab
                    businessId={selectedBusinessId}
                    currentItem={newItem}
                    setCurrentItem={setNewItem}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                    items={formData.items}
                    fishTypes={fishTypes}
                    onItemChange={checkTempStock}
                  />
                </TabsContent>
                
                <TabsContent value="image" className="mt-0">
                  <ImageUploadTab
                    onFileUpload={handleImageFileUpload}
                    isProcessing={isProcessingImage}
                    transcribed_text={formData.transcribed_text}
                    uploadedFile={imageFile}
                    onRemoveFile={() => {
                      setImageFile(null)
                      setFormData((prev: FormData) => ({ ...prev, transcribed_text: '' }))
                    }}
                    selectedBusinessId={selectedBusinessId}
                    onBusinessChange={setSelectedBusinessId}
                    deliveryDate={formData.delivery_datetime}
                    onDeliveryDateChange={(date: string) => handleInputChange("delivery_datetime", date)}
                    onOrderParsed={(orderData: any) => {
                      // 파싱된 데이터로 폼 업데이트
                      setFormData((prev: FormData) => ({
                        ...prev,
                        delivery_datetime: orderData.delivery_date || prev.delivery_datetime,
                        memo: orderData.memo || prev.memo,
                        items: orderData.items?.map((item: any, index: number) => ({
                          id: Date.now() + index,
                                  fish_type: item.fish_type,
        item_name_snapshot: fishTypes.find((f) => f.id === item.fish_type)?.name || '',
                          quantity: item.quantity,
                          unit_price: item.unit_price || 0,
                          unit: item.unit,
                          remarks: ''
                        })) || prev.items
                      }))
                    }}
                    onError={(error: string) => {
                      toast.error(`이미지 처리 실패: ${error}`)
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

            {/* 재고 경고 메시지 */}
            {(stockWarnings.length > 0 || stockErrors.length > 0) && (
              <div className="space-y-2">
                {/* 재고 부족 정보 */}
                {stockErrors.length > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg className="h-5 w-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <h4 className="text-orange-800 font-medium">재고 부족 알림</h4>
                    </div>
                    <div className="space-y-1">
                      {stockErrors.map((error, index) => (
                        <div key={index} className="text-orange-700 text-sm">
                          • {error.message}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-orange-600 text-xs">
                      💡 재고가 부족하지만 주문은 진행할 수 있습니다.
                    </div>
                  </div>
                )}
                
                {/* 재고 경고 */}
                {stockWarnings.length > 0 && stockErrors.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg className="h-5 w-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <h4 className="text-yellow-800 font-medium">재고 주의</h4>
                    </div>
                    <div className="space-y-1">
                      {stockWarnings.map((warning, index) => (
                        <div key={index} className="text-yellow-700 text-sm">
                          • {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 재고 체크 중 */}
                {isCheckingStock && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-blue-700 text-sm">재고 확인 중...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 주문 품목 목록 */}
            <OrderItemList
              items={formData.items}
              onEditItem={(index: number) => {
                // 편집 기능은 나중에 구현
                console.log('편집할 항목:', index)
              }}
              onRemoveItem={removeItem}
              totalPrice={formData.items.reduce((sum: number, item: OrderItem) => sum + (item.quantity * item.unit_price), 0)}
            />

            {/* 버튼 */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={
                  !selectedBusinessId || 
                  formData.items.length === 0 || 
                  isCheckingStock
                }
                className={
                  (!selectedBusinessId || formData.items.length === 0) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {!selectedBusinessId ? '거래처 선택 필요' : 
                 formData.items.length === 0 ? '어종 추가 필요' : 
                 '주문 생성'}
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
    </>
  )
}

export default OrderForm 