// // /**
// //  * 텍스트 입력 탭 컴포넌트
// //  * 텍스트를 입력하여 주문을 등록하는 탭입니다.
// //  */
// // import { useState, useEffect } from "react"
// // import { Button } from "../../../components/ui/button"
// // import { Label } from "../../../components/ui/label"
// // import { Textarea } from "../../../components/ui/textarea"
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
// // import { Input } from "../../../components/ui/input"
// // import { businessApi, fishTypeApi } from "../../../lib/api"
// // import { parseVoiceOrderWithAPI, validateAndCompleteOrder } from "../../../utils/orderParser"
// // import type { Business, FishType } from "../../../types"
// // import { fetchParsedOrder } from "../../../utils/orderParser"
// // import { findOrCreateFishType } from "../../../utils/orderParser"
// // import { findOrCreateBusiness } from "../../../utils/orderParser"
// // interface ParsedOrderData {
// //   business_name?: string;
// //   phone_number?: string;
// //   transcribed_text: string;
// //   delivery_date?: string;
// //   items: Array<{
// //     fish_type_id: number;
// //     quantity: number;
// //     unit_price?: number;
// //     unit: string;
// //   }>;
// //   memo?: string;
// // }

// // interface TextInputTabProps {
// //   textInput: string
// //   setTextInput: (text: string) => void
// //   onParse?: () => void
// //   isProcessing: boolean
// //   transcribedText?: string
// //   selectedBusinessId?: number | null
// //   onBusinessChange?: (businessId: number | null) => void
// //   deliveryDate?: string
// //   onDeliveryDateChange?: (date: string) => void
// //   onOrderParsed?: (orderData: ParsedOrderData) => void
// // }

// // const TextInputTab: React.FC<TextInputTabProps> = ({
// //   textInput,
// //   setTextInput,
// //   onParse: _onParse,
// //   isProcessing,
// //   transcribedText: _transcribedText,
// //   selectedBusinessId,
// //   onBusinessChange,
// //   deliveryDate,
// //   onDeliveryDateChange,
// //   onOrderParsed
// // }) => {
// //   const [businesses, setBusinesses] = useState<Business[]>([])
// //   const [fishTypes, setFishTypes] = useState<FishType[]>([])
// //   const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null)
// //   const [isLocalProcessing, setIsLocalProcessing] = useState<boolean>(false)

// //   // 거래처 목록 로드
// //   useEffect(() => {
// //     const fetchBusinesses = async () => {
// //       try {
// //         const response = await businessApi.getAll()
// //         let businessData: Business[] = []
        
// //         if (response && Array.isArray(response)) {
// //           businessData = response
// //         } else if (response && Array.isArray(response.results)) {
// //           businessData = response.results
// //         } else if (response && Array.isArray(response.results)) {
// //           businessData = response.results
// //         }
        
// //         setBusinesses(businessData)
// //       } catch (error) {
// //         console.error('거래처 목록 가져오기 실패:', error)
// //         setBusinesses([])
// //       }
// //     }

// //     fetchBusinesses()
// //   }, [])

// //   // 어종 목록 로드
// //   useEffect(() => {
// //     const fetchFishTypes = async () => {
// //       try {
// //         const response = await fishTypeApi.getAll()
// //         let fishData: FishType[] = []
        
// //         if (response && Array.isArray(response)) {
// //           fishData = response
// //         } else if (response && response.data && Array.isArray(response.data)) {
// //           fishData = response.data
// //         }
        
// //         setFishTypes(fishData)
// //       } catch (error) {
// //         console.error('어종 목록 가져오기 실패:', error)
// //         setFishTypes([])
// //       }
// //     }

// //     fetchFishTypes()
// //   }, [])

// //   const handleTextParsing = async () => {
// //     if (!textInput.trim()) return;
  
// //     setIsLocalProcessing(true);
// //     setParsedOrder(null);
  
// //     try {
// //       const parsed = await fetchParsedOrder(textInput);

// //     // 1. 최신 거래처 목록 받아오기
// //     const response = await businessApi.getAll();
// //     const updatedBusinesses = response?.results || [];

// //     setBusinesses(updatedBusinesses);
   
// //     // 2. 거래처 찾기 혹은 생성
// //     const businessId = await findOrCreateBusiness(
// //       parsed.business_name || "",
// //       parsed.phone_number || "",
// //       updatedBusinesses,
// //       async () => {
// //         // refreshCallback: 전체 거래처 다시 불러와 상태 업데이트
// //         const refreshed = await businessApi.getAll();
// //         const refreshedBusinesses = refreshed?.results || [];
// //         setBusinesses(refreshedBusinesses);
// //         console.log(refreshedBusinesses)
// //         return refreshedBusinesses;
// //       }
// //     );

// //     if (businessId) {
// //       // 3. 거래처가 목록에 이미 있나 확인
// //       const exists = updatedBusinesses.some(b => b.id === businessId);

// //       if (!exists) {
// //         // 4. 없으면 상세정보 받아서 추가
// //         const businessResponse = await businessApi.getById(businessId.toString());
// //         const newBusiness = businessResponse?.data;
// //         if (newBusiness) {
// //           setBusinesses(prev => [...prev, newBusiness]);
// //         }
// //       }
// //       const businessName = parsed.business_name;
// //       console.log("거래처명:",businessName);
// //       setBusinesses(updatedBusinesses);
// //       // 5. 선택 거래처 상태 업데이트
// //       // onBusinessChange?.(businessId);
      
// //     }

      

// //       const parsedItems = await Promise.all(
// //         parsed.items.map(async (item) => {
// //           const fishName = item.name ?? item.fish_type; // name이 없으면 fish_type 사용
// //           if (!fishName) throw new Error(`❌ 어종 이름이 없습니다: ${JSON.stringify(item)}`);
      
// //           const fish = await findOrCreateFishType(fishName, item.unit || "박스", fishTypes);
// //           if (!fish) throw new Error(`어종 '${fishName}' 등록 실패`);
      
// //           return {
// //             fish_type_id: fish.id,
// //             quantity: item.quantity,
// //             unit: item.unit,
// //             unit_price: 0,
// //           };
// //         })
// //       );
      
// //       // 4. 날짜 세팅
// //       if (parsed.delivery_date) {
// //         onDeliveryDateChange?.(parsed.delivery_date);
// //       }
  
// //       // 5. 최종 order 객체 만들기
// //       const completedOrder: ParsedOrderData = {
// //         transcribed_text: parsed.transcribed_text,
// //         items: parsedItems,
// //         delivery_date: parsed.delivery_date,
// //         memo: parsed.memo || ""
// //       };
  
// //       setParsedOrder(completedOrder);
// //       onOrderParsed?.(completedOrder);
// //     } catch (error) {
// //       console.error("❌ 파싱 처리 실패:", error);
// //       setParsedOrder(null);
// //     } finally {
// //       setIsLocalProcessing(false);
// //     }
// //   };
// //   return (
// //     <div className="space-y-4">
// //       <div className="space-y-2">
// //         <Label htmlFor="text-input">주문 내용 입력</Label>
// //         <Textarea
// //           id="text-input"
// //           value={textInput}
// //           onChange={(e) => setTextInput(e.target.value)}
// //           placeholder="주문 내용을 텍스트로 입력하세요... 
// // 예: 바다수산에 고등어 10박스, 갈치 5박스 주문합니다. 1월 20일까지 배송 부탁드립니다."
// //           className="min-h-[120px]"
// //         />
// //       </div>
// //       <Button 
// //         onClick={handleTextParsing} 
// //         className="w-full" 
// //         disabled={!textInput.trim() || isProcessing || isLocalProcessing}
// //       >
// //         {(isProcessing || isLocalProcessing) ? (
// //           <>
// //             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
// //             파싱 중...
// //           </>
// //         ) : (
// //           "분석하기"
// //         )}
// //       </Button>
      
// //       {/* 주문 정보 - 파싱 후에만 표시 */}
// //       {parsedOrder && (
// //         <div className="space-y-4">
// //           {/* 거래처 선택 */}
// //           <div className="bg-green-50 border border-green-200 rounded-lg p-4">
// //             <h4 className="font-medium text-green-900 mb-3">📝 주문 정보:</h4>
            
// //             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //               {/* 파싱된 거래처 표시 및 수정 */}
// //               <div className="space-y-2">
// //                 <Label htmlFor="business-select">파싱된 거래처 (수정 가능)</Label>
// //                 <Select 
// //                   value={selectedBusinessId?.toString() || ""} 
// //                   onValueChange={(value: string) => onBusinessChange?.(value ? parseInt(value) : null)}
// //                 >
// //                   <SelectTrigger className="bg-white border-green-300">
// //                     <SelectValue placeholder="텍스트에서 파싱된 거래처를 확인하고 수정하세요" />
// //                   </SelectTrigger>
// //                   <SelectContent>
// //                     {businesses.map((business: Business) => (
// //                       <SelectItem key={business.id} value={business.id.toString()}>
// //                         <div className="flex flex-col">
// //                           <span className="font-medium">{business.business_name}</span>
// //                           <span className="text-xs text-gray-500">{business.phone_number}</span>
// //                         </div>
// //                       </SelectItem>
// //                     ))}
// //                   </SelectContent>
// //                 </Select>
// //                 {selectedBusinessId && (
// //                   <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
// //                     ✓ 선택된 거래처: {businesses.find((b: Business) => b.id === selectedBusinessId)?.business_name}
// //                   </div>
// //                 )}
// //               </div>
              
// //               {/* 파싱된 배송일 수정 */}
// //               <div className="space-y-2">
// //                 <Label htmlFor="delivery_date">파싱된 배송일 (수정 가능)</Label>
// //                 <Input
// //                   type="date"
// //                   value={deliveryDate || ''}
// //                   onChange={(e) => onDeliveryDateChange?.(e.target.value)}
// //                   className="bg-white border-green-300"
// //                   placeholder="텍스트에서 파싱된 배송일을 확인하고 수정하세요"
// //                 />
// //               </div>
// //             </div>
            
// //             {/* 주문 품목들 */}
// //             {parsedOrder?.items && parsedOrder.items.length > 0 && (
// //               <div className="mt-4">
// //                 <h5 className="font-medium text-gray-900 mb-2">🐟 파싱된 주문 품목:</h5>
// //                 <div className="space-y-2">
// //                   {parsedOrder.items.map((item, index) => (
// //                     <div key={index} className="bg-white rounded-md p-4 border border-green-200">
// //                       <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
// //                         <div className="space-y-1">
// //                           <label className="text-xs text-gray-500 font-medium">어종</label>
// //                           <select
// //                             className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
// //                             value={item.fish_type_id}
// //                             onChange={(e) => {
// //                               // TODO: 어종 변경 핸들러 구현
// //                               console.log('어종 변경:', e.target.value)
// //                             }}
// //                           >
// //                             {fishTypes.map((fish) => (
// //                               <option key={fish.id} value={fish.id}>
// //                                 {fish.name}
// //                               </option>
// //                             ))}
// //                           </select>
// //                         </div>
                        
// //                         <div className="space-y-1">
// //                           <label className="text-xs text-gray-500 font-medium">수량</label>
// //                           <input
// //                             type="number"
// //                             className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
// //                             value={item.quantity}
// //                             min="1"
// //                             onChange={(e) => {
// //                               // TODO: 수량 변경 핸들러 구현
// //                               console.log('수량 변경:', e.target.value)
// //                             }}
// //                           />
// //                         </div>
                        
// //                         <div className="space-y-1">
// //                           <label className="text-xs text-gray-500 font-medium">단가(원)</label>
// //                           <input
// //                             type="number"
// //                             className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
// //                             value={item.unit_price || 0}
// //                             min="0"
// //                             onChange={(e) => {
// //                               // TODO: 단가 변경 핸들러 구현
// //                               console.log('단가 변경:', e.target.value)
// //                             }}
// //                           />
// //                         </div>
                        
// //                         <div className="space-y-1">
// //                           <label className="text-xs text-gray-500 font-medium">단위</label>
// //                           <select
// //                             className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
// //                             value={item.unit}
// //                             onChange={(e) => {
// //                               // TODO: 단위 변경 핸들러 구현
// //                               console.log('단위 변경:', e.target.value)
// //                             }}
// //                           >
// //                             <option value="박스">박스</option>
// //                             <option value="kg">kg</option>
// //                             <option value="마리">마리</option>
// //                             <option value="개">개</option>
// //                             <option value="통">통</option>
// //                             <option value="팩">팩</option>
// //                           </select>
// //                         </div>
// //                       </div>
                      
// //                       <div className="mt-3 flex justify-between items-center">
// //                         <div className="text-sm text-gray-600">
// //                           소계: <span className="font-semibold text-green-600">
// //                             {((item.unit_price || 0) * item.quantity).toLocaleString()}원
// //                           </span>
// //                         </div>
// //                         <button
// //                           className="text-red-500 hover:text-red-700 text-sm font-medium"
// //                           onClick={() => {
// //                             // TODO: 항목 삭제 핸들러 구현
// //                             console.log('항목 삭제:', index)
// //                           }}
// //                         >
// //                           삭제
// //                         </button>
// //                       </div>
// //                     </div>
// //                   ))}
// //                 </div>
                
// //                 <div className="mt-3 p-3 bg-green-100 rounded-lg">
// //                   <div className="flex justify-between items-center">
// //                     <span className="text-sm font-medium text-green-900">총 합계:</span>
// //                     <span className="text-lg font-bold text-green-900">
// //                       {parsedOrder.items.reduce((total, item) => total + ((item.unit_price || 0) * item.quantity), 0).toLocaleString()}원
// //                     </span>
// //                   </div>
// //                 </div>
// //               </div>
// //             )}
            
// //             {/* 메모 */}
// //             {parsedOrder?.memo && (
// //               <div className="mt-4">
// //                 <Label>메모</Label>
// //                 <div className="bg-white rounded-md p-2 border mt-1">
// //                   <span className="text-gray-900">{parsedOrder.memo}</span>
// //                 </div>
// //               </div>
// //             )}
            
// //             <p className="text-xs text-green-600 mt-3">
// //               ✅ 위 정보를 확인하고 수정한 후 주문을 등록해주세요.
// //             </p>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   )
// // }

// // export default TextInputTab 


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
import { fetchParsedOrder } from "../../../utils/orderParser"
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
        } else if (response && Array.isArray(response.results)) {
          businessData = response.results
        } else if (response && Array.isArray(response.results)) {
          businessData = response.results
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
      const basicOrderData = await fetchParsedOrder(textInput) // API 연동 버전 사용
      
      if (basicOrderData.items && basicOrderData.items.length > 0) {
        const validatedOrderData = validateAndCompleteOrder(basicOrderData)
        
        setParsedOrder(validatedOrderData)
        console.log('✅ 주문 데이터:', validatedOrderData)
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
// import React, { useEffect, useState } from "react";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";

// interface FishType {
//   id: number;
//   name: string;
// }

// interface Business {
//   id: number;
//   business_name: string;
//   phone_number: string;
// }

// interface ParsedItem {
//   fish_type: string;
//   fish_type_id: number;
//   quantity: number;
//   unit: string;
//   unit_price: number;
// }

// interface ParsedOrder {
//   business_name: string;
//   phone_number: string;
//   transcribed_text: string;
//   delivery_datetime: string;
//   items: ParsedItem[];
//   memo: string;
// }

// interface Props {
//   textInput: string;
//   setTextInput: (val: string) => void;
//   isProcessing: boolean;
//   isLocalProcessing: boolean;
//   handleTextParsing: () => void;
//   parsedOrder: ParsedOrder | null;
//   setParsedOrder: (order: ParsedOrder) => void;
//   fishTypes: FishType[];
//   businesses: Business[];
//   selectedBusinessId: number | null;
//   onBusinessChange?: (id: number | null) => void;
//   deliveryDate: string;
//   onDeliveryDateChange?: (date: string) => void;
// }

// const TextInputTab: React.FC<Props> = ({
//   textInput,
//   setTextInput,
//   isProcessing,
//   isLocalProcessing,
//   handleTextParsing,
//   parsedOrder,
//   setParsedOrder,
//   fishTypes,
//   businesses,
//   selectedBusinessId,
//   onBusinessChange,
//   deliveryDate,
//   onDeliveryDateChange,
// }) => {
//   // 🔧 order 업데이트 helper
//   const updateOrderItem = (index: number, field: keyof ParsedItem, value: any) => {
//     if (!parsedOrder) return;
//     const newItems = [...parsedOrder.items];
//     newItems[index] = { ...newItems[index], [field]: value };
//     setParsedOrder({ ...parsedOrder, items: newItems });
//   };

//   // 🔧 항목 삭제
//   const removeOrderItem = (index: number) => {
//     if (!parsedOrder) return;
//     const newItems = parsedOrder.items.filter((_, i) => i !== index);
//     setParsedOrder({ ...parsedOrder, items: newItems });
//   };

//   // ✅ fish_type_id 매핑 (처음 파싱될 때 한 번만 실행)
//   useEffect(() => {
//     if (!parsedOrder) return;
//     const enrichedItems = parsedOrder.items.map((item) => {
//       const match = fishTypes.find((f) => f.name === item.fish_type);
//       return {
//         ...item,
//         fish_type_id: match?.id ?? 0,
//       };
//     });
//     setParsedOrder({ ...parsedOrder, items: enrichedItems });
//   }, [parsedOrder?.transcribed_text]); // 텍스트 바뀔 때마다 1회 실행

//   return (
//     <div className="space-y-4">
//       <div className="space-y-2">
//         <Label htmlFor="text-input">주문 내용 입력</Label>
//         <Textarea
//           id="text-input"
//           value={textInput}
//           onChange={(e) => setTextInput(e.target.value)}
//           placeholder="예: 바다수산에 고등어 10박스, 갈치 5박스 주문합니다. 1월 20일까지 배송 부탁드립니다."
//           className="min-h-[120px]"
//         />
//       </div>

//       <Button
//         onClick={handleTextParsing}
//         className="w-full"
//         disabled={!textInput.trim() || isProcessing || isLocalProcessing}
//       >
//         {isProcessing || isLocalProcessing ? (
//           <>
//             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
//             파싱 중...
//           </>
//         ) : (
//           "분석하기"
//         )}
//       </Button>

//       {/* 파싱 결과 표시 */}
//       {parsedOrder && (
//         <div className="space-y-4">
//           <div className="bg-green-50 border border-green-200 rounded-lg p-4">
//             <h4 className="font-medium text-green-900 mb-3">📝 주문 정보:</h4>

//             {/* 거래처 및 배송일 */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* 거래처 선택 */}
//               <div className="space-y-2">
//                 <Label htmlFor="business-select">거래처 (수정 가능)</Label>
//                 <Select
//                   value={selectedBusinessId?.toString() || ""}
//                   onValueChange={(value) => onBusinessChange?.(parseInt(value))}
//                 >
//                   <SelectTrigger className="bg-white border-green-300">
//                     <SelectValue placeholder="거래처를 선택하세요" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {businesses.map((b) => (
//                       <SelectItem key={b.id} value={b.id.toString()}>
//                         <div className="flex flex-col">
//                           <span className="font-medium">{b.business_name}</span>
//                           <span className="text-xs text-gray-500">{b.phone_number}</span>
//                         </div>
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               {/* 배송일 입력 */}
//               <div className="space-y-2">
//                 <Label htmlFor="delivery_date">배송일</Label>
//                 <Input
//                   type="date"
//                   value={deliveryDate}
//                   onChange={(e) => onDeliveryDateChange?.(e.target.value)}
//                   className="bg-white border-green-300"
//                 />
//               </div>
//             </div>

//             {/* 주문 품목들 */}
//             {parsedOrder.items.length > 0 && (
//               <div className="mt-4">
//                 <h5 className="font-medium text-gray-900 mb-2">🐟 주문 품목:</h5>
//                 <div className="space-y-3">
//                   {parsedOrder.items.map((item, index) => (
//                     <div key={index} className="bg-white p-4 border border-green-200 rounded">
//                       <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
//                         {/* 어종 선택 */}
//                         <div>
//                           <label className="text-xs font-medium text-gray-600">어종</label>
//                           <select
//                             className="w-full px-2 py-1 border rounded"
//                             value={item.fish_type_id}
//                             onChange={(e) => {
//                               const selectedId = parseInt(e.target.value);
//                               const fish = fishTypes.find((f) => f.id === selectedId);
//                               updateOrderItem(index, "fish_type_id", selectedId);
//                               updateOrderItem(index, "fish_type", fish?.name || "미상");
//                             }}
//                           >
//                             {fishTypes.map((f) => (
//                               <option key={f.id} value={f.id}>
//                                 {f.name}
//                               </option>
//                             ))}
//                           </select>
//                         </div>

//                         {/* 수량 */}
//                         <div>
//                           <label className="text-xs font-medium text-gray-600">수량</label>
//                           <input
//                             type="number"
//                             className="w-full px-2 py-1 border rounded"
//                             value={item.quantity}
//                             min={1}
//                             onChange={(e) =>
//                               updateOrderItem(index, "quantity", parseFloat(e.target.value))
//                             }
//                           />
//                         </div>

//                         {/* 단가 */}
//                         <div>
//                           <label className="text-xs font-medium text-gray-600">단가</label>
//                           <input
//                             type="number"
//                             className="w-full px-2 py-1 border rounded"
//                             value={item.unit_price}
//                             min={0}
//                             onChange={(e) =>
//                               updateOrderItem(index, "unit_price", parseFloat(e.target.value))
//                             }
//                           />
//                         </div>

//                         {/* 단위 */}
//                         <div>
//                           <label className="text-xs font-medium text-gray-600">단위</label>
//                           <select
//                             className="w-full px-2 py-1 border rounded"
//                             value={item.unit}
//                             onChange={(e) => updateOrderItem(index, "unit", e.target.value)}
//                           >
//                             <option value="박스">박스</option>
//                             <option value="kg">kg</option>
//                             <option value="마리">마리</option>
//                             <option value="개">개</option>
//                             <option value="통">통</option>
//                             <option value="팩">팩</option>
//                           </select>
//                         </div>
//                       </div>

//                       {/* 소계 + 삭제 */}
//                       <div className="flex justify-between items-center mt-3">
//                         <div className="text-sm text-gray-700">
//                           소계:{" "}
//                           <span className="font-bold text-green-700">
//                             {(item.quantity * item.unit_price).toLocaleString()}원
//                           </span>
//                         </div>
//                         <button
//                           className="text-red-500 hover:underline text-sm"
//                           onClick={() => removeOrderItem(index)}
//                         >
//                           삭제
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* 총합 */}
//                 <div className="mt-3 p-3 bg-green-100 rounded-lg flex justify-between">
//                   <span className="text-sm font-semibold text-green-900">총 합계:</span>
//                   <span className="text-lg font-bold text-green-900">
//                     {parsedOrder.items
//                       .reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
//                       .toLocaleString()}
//                     원
//                   </span>
//                 </div>
//               </div>
//             )}

//             {/* 메모 */}
//             {parsedOrder.memo && (
//               <div className="mt-4">
//                 <Label>메모</Label>
//                 <div className="bg-white border rounded p-2 mt-1">
//                   <span>{parsedOrder.memo}</span>
//                 </div>
//               </div>
//             )}

//             <p className="text-xs text-green-600 mt-3">
//               ✅ 정보를 확인하고 수정한 후 주문을 저장하세요.
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TextInputTab;
