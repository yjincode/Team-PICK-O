/**
 * 주문 폼 컴포넌트
 * 새 주문을 생성하는 폼입니다
 */
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { X, Plus, Save, Search, Mic, Upload, Play, Square, Image } from "lucide-react"
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

interface OrderFormProps {
  onClose: () => void;
  onSubmit: (orderData: any) => void;
  parsedOrderData?: {
    order: {
      business_id: number;
      contact: string;
      delivery_date: string;
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
  fish_type_id: number;
  quantity: number;
  unit_price: number;
  unit: string;
  remarks?: string;
}

const OrderForm: React.FC<OrderFormProps> = ({ onClose, onSubmit, parsedOrderData }) => {
  const [showBusinessSearch, setShowBusinessSearch] = useState(false)
  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  // 어종 목록 (실제로는 API에서 가져올 예정)
  const fishTypes = [
    { id: 1, name: "고등어", default_price: 48000 },
    { id: 2, name: "갈치", default_price: 65000 },
    { id: 3, name: "오징어", default_price: 48000 },
    { id: 4, name: "명태", default_price: 45000 },
    { id: 201, name: "도미", default_price: 20000 },
    { id: 202, name: "방어", default_price: 15000 },
    { id: 203, name: "삼치", default_price: 35000 },
    { id: 204, name: "전어", default_price: 25000 },
    { id: 205, name: "꽁치", default_price: 18000 },
    { id: 206, name: "청어", default_price: 22000 },
  ]

  // 거래처 목록 (실제로는 API에서 가져올 예정)
  const businesses = [
    { id: 5678, business_name: "동해수산", phone_number: "010-1234-5678" },
    { id: 5679, business_name: "바다마트", phone_number: "010-2345-6789" },
    { id: 5680, business_name: "해양식품", phone_number: "010-3456-7890" },
  ]

  // business_id로 거래처 정보 찾기
  const findBusinessById = (businessId: number) => {
    return businesses.find(business => business.id === businessId)
  }

  const [formData, setFormData] = useState(() => {
    // 자동주문 기능 주석처리
    // if (parsedOrderData) {
    //   // business_id로 거래처 정보 찾기
    //   const business = findBusinessById(parsedOrderData.order.business_id)
    //   
    //   return {
    //     business_name: business?.business_name || "",
    //     phone_number: parsedOrderData.order.contact,
    //     memo: "",
    //     source_type: "voice" as "voice" | "text" | "manual",
    //     transcribed_text: parsedOrderData.order.transcribed_text,
    //     raw_input_path: parsedOrderData.order.raw_input_path || "",
    //     delivery_date: parsedOrderData.order.delivery_date,
    //     items: parsedOrderData.order_items.map(item => ({
    //       fish_type_id: item.fish_type_id,
    //       quantity: item.quantity,
    //       unit_price: item.unit_price,
    //       unit: item.unit || "박스",
    //       remarks: item.remarks || ""
    //     }))
    //   }
    // }
    
    return {
      business_name: "",
      phone_number: "",
      memo: "",
      source_type: "text" as "voice" | "text" | "manual",
      transcribed_text: "",
      raw_input_path: "",
      delivery_date: "",
      items: [] as OrderItem[]
    }
  })

  const [newItem, setNewItem] = useState({
    fish_type_id: 1,
    quantity: 1,
    unit_price: 0,
    unit: "박스",
    remarks: ""
  })

  // 초기 폼 데이터 설정 (parsedOrderData가 있으면 자동으로 채움)
  const getInitialFormData = () => {
    if (parsedOrderData) {
      // business_id로 거래처 정보 찾기
      const business = findBusinessById(parsedOrderData.order.business_id)
      
      return {
        business_name: business?.business_name || "",
        phone_number: parsedOrderData.order.contact,
        memo: "",
        source_type: "voice" as "voice" | "text" | "manual",
        transcribed_text: parsedOrderData.order.transcribed_text,
        delivery_date: parsedOrderData.order.delivery_date,
        items: parsedOrderData.order_items.map(item => ({
          fish_type_id: item.fish_type_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit || "박스"
        }))
      }
    }
    
    return {
      business_name: "",
      phone_number: "",
      memo: "",
      source_type: "text" as "voice" | "text" | "manual",
      transcribed_text: "",
      delivery_date: "",
      items: [] as OrderItem[]
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBusinessSelect = (business: any) => {
    setFormData(prev => ({
      ...prev,
      business_name: business.business_name,
      phone_number: business.phone_number
    }))
    setShowBusinessSearch(false)
  }

  const handleVoiceParse = () => {
    if (formData.transcribed_text.trim()) {
      try {
        const parsedData = parseVoiceOrder(formData.transcribed_text)
        const validatedData = validateAndCompleteOrder(parsedData)
        
        setFormData(prev => ({
          ...prev,
          delivery_date: validatedData.delivery_date || prev.delivery_date,
          memo: validatedData.memo || prev.memo,
          items: validatedData.items.map(item => ({
            ...item,
            unit_price: item.unit_price || 0
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileUpload called', event.target.files); // 디버깅 로그 추가
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No file selected'); // 디버깅 로그 추가
      return
    }

    console.log('File selected:', file.name, file.type); // 디버깅 로그 추가
    console.log('Checking if file is supported...'); // 추가 로그

    if (!isSupportedAudioFormat(file)) {
      console.log('File format not supported:', file.type); // 추가 로그
      alert('지원하지 않는 오디오 파일 형식입니다. WAV, MP3, OGG, WEBM, M4A, AAC 파일을 사용해주세요.')
      return
    }

    console.log('File format is supported, proceeding with processing...'); // 추가 로그

    try {
      console.log('Getting audio duration...'); // 추가 로그
      const duration = await getAudioDuration(file)
      console.log('Audio duration:', duration); // 추가 로그
      
      const audioInfo: AudioFileInfo = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        duration
      }
      
      console.log('Setting audio file state...'); // 추가 로그
      setAudioFile(audioInfo)
      setFormData(prev => ({ ...prev, source_type: 'voice' }))
      
      // 자동으로 음성 인식 시작
      console.log('Starting audio to text conversion...'); // 추가 로그
      setIsProcessingAudio(true)
      const transcribedText = await convertAudioToText(file)
      console.log('Transcribed text:', transcribedText); // 추가 로그
      
      setFormData(prev => ({ ...prev, transcribed_text: transcribedText }))
      setIsProcessingAudio(false)
      
      alert('음성 파일이 성공적으로 업로드되고 텍스트로 변환되었습니다!')
    } catch (error) {
      console.error('Error in handleFileUpload:', error); // 추가 로그
      setIsProcessingAudio(false)
      alert(`음성 파일 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const handleRealTimeRecording = async () => {
    if (isRecording) {
      setIsRecording(false)
      return
    }

    try {
      setIsRecording(true)
      setFormData(prev => ({ ...prev, source_type: 'voice' }))
      
      const transcribedText = await startRealTimeSpeechRecognition()
      setFormData(prev => ({ ...prev, transcribed_text: transcribedText }))
      setIsRecording(false)
      
      alert('실시간 음성 인식이 완료되었습니다!')
    } catch (error) {
      setIsRecording(false)
      alert(`음성 인식 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const removeAudioFile = () => {
    setAudioFile(null)
    setFormData(prev => ({ ...prev, transcribed_text: '' }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleImageUpload called', event.target.files); // 디버깅 로그 추가
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No image file selected'); // 디버깅 로그 추가
      return
    }

    console.log('Image file selected:', file.name, file.type); // 디버깅 로그 추가

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다. JPG, PNG, GIF 파일을 사용해주세요.')
      return
    }

    try {
      setIsProcessingImage(true)
      setImageFile(file)
      setFormData(prev => ({ ...prev, source_type: 'manual' }))
      
      // 이미지에서 텍스트 추출 (OCR 기능)
      const extractedText = await extractTextFromImage(file)
      
      setFormData(prev => ({ ...prev, transcribed_text: extractedText }))
      setIsProcessingImage(false)
      
      alert('이미지에서 텍스트가 성공적으로 추출되었습니다!')
    } catch (error) {
      setIsProcessingImage(false)
      alert(`이미지 처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const removeImageFile = () => {
    setImageFile(null)
    setFormData(prev => ({ ...prev, transcribed_text: '' }))
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

  const addItem = () => {
    if (newItem.quantity > 0 && newItem.unit_price > 0) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { ...newItem }]
      }))
      setNewItem({
        fish_type_id: 1,
        quantity: 1,
        unit_price: 0,
        unit: "박스",
        remarks: ""
      })
    }
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const total_price = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    
    // 거래처 정보 찾기 (전화번호로)
    const business = businesses.find(b => b.phone_number === formData.phone_number)
    // delivery_date가 비어있으면 오늘 날짜로 설정
    const deliveryDate = formData.delivery_date || new Date().toISOString().split('T')[0]
    
    const orderData = {
      business_id: business?.id || 1, // 기본값 설정
      total_price: parseInt(total_price.toString()),
      order_datetime: new Date().toISOString(),
      memo: formData.memo,
      source_type: formData.source_type,
      raw_input_path: formData.raw_input_path,
      transcribed_text: formData.transcribed_text,
      delivery_date: deliveryDate,
      status: "pending",
      order_items: formData.items.map(item => ({
        fish_type_id: item.fish_type_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price.toString()),
        unit: item.unit
      }))
    }
    
    try {
      // DB에 주문 저장
      const response = await fetch('http://localhost:8000/api/v1/orders/upload/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })
      
      if (!response.ok) {
        throw new Error('주문 저장에 실패했습니다.')
      }
      
      const savedOrder = await response.json()
      alert('주문이 성공적으로 저장되었습니다!')
      onSubmit(savedOrder)
    } catch (error) {
      console.error('주문 저장 오류:', error)
      alert(`주문 저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const getSelectedFishType = () => {
    return fishTypes.find(fish => fish.id === newItem.fish_type_id)
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
                         {/* 거래처 정보 */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="business_name">거래처명 *</Label>
                 <div className="flex space-x-2">
                   <Input
                     id="business_name"
                     value={formData.business_name}
                     onChange={(e) => handleInputChange("business_name", e.target.value)}
                     required
                   />
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => setShowBusinessSearch(true)}
                     className="px-3"
                   >
                     <Search className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
               <div>
                 <Label htmlFor="phone_number">연락처 *</Label>
                 <Input
                   id="phone_number"
                   value={formatPhoneNumber(formData.phone_number)}
                   onChange={(e) => {
                     // 숫자만 추출하여 저장
                     const numbers = e.target.value.replace(/\D/g, '')
                     handleInputChange("phone_number", numbers)
                   }}
                   placeholder="010-1234-5678"
                   required
                 />
               </div>
             </div>

            {/* 주문 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source_type">주문 방식</Label>
                <Select
                  value={formData.source_type}
                  onValueChange={(value: string) => handleInputChange("source_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="text">문자</SelectItem>
                     <SelectItem value="voice">음성</SelectItem>
                     <SelectItem value="manual">수동</SelectItem>
                   </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="delivery_date">배송일</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => handleInputChange("delivery_date", e.target.value)}
                />
              </div>
            </div>

                         {/* 원문 입력 */}
             <div>
               <Label htmlFor="transcribed_text">
                 {formData.source_type === 'voice' ? '음성 원문' : 
                  formData.source_type === 'manual' ? '수동 입력' : '문자 내용'}
               </Label>
               
                               {/* 파일 업로드 섹션 */}
                {(formData.source_type === 'voice' || formData.source_type === 'manual' || formData.source_type === 'text') && (
                  <div className="space-y-3 mb-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          음성 파일 또는 이미지 파일을 업로드하거나 실시간 녹음을 시작하세요
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          {/* 음성 파일 업로드 */}
                          <div>
                            <input
                              id="audio-upload"
                              type="file"
                              accept="audio/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={isProcessingAudio || isRecording || isProcessingImage}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isProcessingAudio || isRecording || isProcessingImage}
                              className="w-full sm:w-auto"
                              onClick={() => {
                                console.log('Audio upload button clicked'); // 디버깅 로그
                                document.getElementById('audio-upload')?.click();
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              음성 파일 업로드
                            </Button>
                          </div>
                          
                          {/* 이미지 파일 업로드 */}
                          <div>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={isProcessingAudio || isRecording || isProcessingImage}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isProcessingAudio || isRecording || isProcessingImage}
                              className="w-full sm:w-auto"
                              onClick={() => {
                                console.log('Image upload button clicked'); // 디버깅 로그
                                document.getElementById('image-upload')?.click();
                              }}
                            >
                              <Image className="h-4 w-4 mr-2" />
                              이미지 파일 업로드
                            </Button>
                          </div>
                          
                          {/* 실시간 녹음 (음성만) */}
                          {formData.source_type === 'voice' && (
                            <Button
                              type="button"
                              variant={isRecording ? "destructive" : "outline"}
                              size="sm"
                              onClick={handleRealTimeRecording}
                              disabled={isProcessingAudio || isProcessingImage}
                              className="w-full sm:w-auto"
                            >
                              {isRecording ? (
                                <>
                                  <Square className="h-4 w-4 mr-2" />
                                  녹음 중지
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  실시간 녹음
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 업로드된 음성 파일 정보 */}
                    {audioFile && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Play className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">{audioFile.name}</p>
                              <p className="text-xs text-blue-700">
                                {formatFileSize(audioFile.size)} • {audioFile.duration?.toFixed(1)}초
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeAudioFile}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* 업로드된 이미지 파일 정보 */}
                    {imageFile && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Image className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-900">{imageFile.name}</p>
                              <p className="text-xs text-green-700">
                                {formatFileSize(imageFile.size)} • 이미지 파일
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeImageFile}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* 음성 처리 중 표시 */}
                    {isProcessingAudio && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                          <span className="text-sm text-yellow-800">음성 파일을 텍스트로 변환 중...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* 이미지 처리 중 표시 */}
                    {isProcessingImage && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          <span className="text-sm text-green-800">이미지에서 텍스트 추출 중...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* 녹음 중 표시 */}
                    {isRecording && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse rounded-full h-3 w-3 bg-red-600"></div>
                          <span className="text-sm text-red-800">실시간 음성 인식 중... 말씀해주세요</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
               
               <div className="space-y-2">
                 <Textarea
                   id="transcribed_text"
                   value={formData.transcribed_text}
                   onChange={(e) => handleInputChange("transcribed_text", e.target.value)}
                   placeholder={
                     formData.source_type === 'voice' ? '음성 인식된 텍스트를 입력하세요' : 
                     formData.source_type === 'manual' ? '수동으로 입력한 주문 내용을 입력하세요' : 
                     '문자 내용을 입력하세요'
                   }
                   rows={3}
                 />
                 {formData.source_type === 'voice' && formData.transcribed_text.trim() && (
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={handleVoiceParse}
                     className="w-full sm:w-auto"
                   >
                     <Mic className="h-4 w-4 mr-2" />
                     음성 파싱으로 자동 주문 생성
                   </Button>
                 )}
               </div>
             </div>

            {/* 메모 */}
            <div>
              <Label htmlFor="memo">메모</Label>
              <Textarea
                id="memo"
                value={formData.memo}
                onChange={(e) => handleInputChange("memo", e.target.value)}
                placeholder="추가 메모를 입력하세요"
                rows={2}
              />
            </div>

            {/* 주문 품목 추가 */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">주문 품목</h3>
              
                             {/* 새 품목 추가 폼 */}
               <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                 <div>
                   <Label>어종</Label>
                   <Select
                     value={newItem.fish_type_id.toString()}
                     onValueChange={(value: string) => {
                       const fishType = fishTypes.find(fish => fish.id === parseInt(value))
                       setNewItem(prev => ({
                         ...prev,
                         fish_type_id: parseInt(value),
                         unit_price: fishType?.default_price || 0
                       }))
                     }}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {fishTypes.map(fish => (
                         <SelectItem key={fish.id} value={fish.id.toString()}>
                           {fish.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label>수량</Label>
                   <Input
                     type="number"
                     value={newItem.quantity}
                     onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                     min="1"
                   />
                 </div>
                 <div>
                   <Label>단가</Label>
                   <Input
                     type="number"
                     value={newItem.unit_price}
                     onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseInt(e.target.value) || 0 }))}
                     min="0"
                   />
                 </div>
                 <div>
                   <Label>요청사항</Label>
                   <Input
                     value={newItem.remarks}
                     onChange={(e) => setNewItem(prev => ({ ...prev, remarks: e.target.value }))}
                     placeholder="큰 걸로 주세요"
                   />
                 </div>
                 <div className="flex items-end">
                   <Button type="button" onClick={addItem} className="w-full">
                     <Plus className="h-4 w-4 mr-2" />추가
                   </Button>
                 </div>
               </div>

              {/* 추가된 품목 목록 */}
              {formData.items.length > 0 && (
                <div className="space-y-2">
                                     {formData.items.map((item, index) => {
                     const fishType = fishTypes.find(fish => fish.id === item.fish_type_id)
                     return (
                       <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                         <div className="flex-1">
                           <span className="font-medium">{fishType?.name} {item.quantity}{item.unit} (₩{item.unit_price.toLocaleString()}/개)</span>
                           {item.remarks && (
                             <p className="text-sm text-gray-600 mt-1">요청사항: {item.remarks}</p>
                           )}
                         </div>
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           onClick={() => removeItem(index)}
                         >
                           <X className="h-4 w-4" />
                         </Button>
                       </div>
                     )
                   })}
                </div>
              )}
            </div>

            {/* 총 금액 */}
            {formData.items.length > 0 && (
              <div className="text-right">
                <span className="text-lg font-semibold">
                  총 금액: ₩{formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString()}
                </span>
              </div>
            )}

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
       </Card>

       {/* 거래처 검색 모달 */}
       {showBusinessSearch && (
         <BusinessSearch
           onSelect={handleBusinessSelect}
           onClose={() => setShowBusinessSearch(false)}
         />
       )}
     </div>
   )
 }

 export default OrderForm 