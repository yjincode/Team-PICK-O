import { useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import { Input } from "../../../components/ui/input"
import { businessApi, fishTypeApi, exebaseApi } from "../../../lib/api"
import type { Business, FishType, OrderItem } from "../../../types"
import { toast } from "react-hot-toast"


// ✅ 어종 조회 또는 생성
async function findOrCreateFishType(
  name: string | undefined,
  unit: string = "박스",
  existingFishTypes: FishType[]
): Promise<FishType | null> {
  if (!name || typeof name !== "string") return null;

  const trimmedName = name.trim();
  if (!trimmedName) return null;

  let fish = existingFishTypes.find(f => f.name === trimmedName);

  if (!fish) {
    try {
      const created = await fishTypeApi.create({ name: trimmedName, unit });
      fish = created.data;
      existingFishTypes.push(fish);
      console.log(`[어종 등록 완료] ${trimmedName}`);
    } catch (error) {
      console.warn(`[어종 등록 실패] ${trimmedName}`, error);
      return null;
    }
  }

  return fish;
}

// ✅ 거래처 조회 또는 생성
async function findOrCreateBusiness(
  businessName: string,
  phoneNumber: string,
  businesses: Business[]
): Promise<number | null> {
  if (!businessName) return null;

  const existingBusiness = businesses.find(
    (b) => b.business_name.trim() === businessName.trim()
  );
  if (existingBusiness) {
    console.log(`[기존 거래처 사용] ${businessName} (ID: ${existingBusiness.id})`);
    return existingBusiness.id;
  }

  const cleanPhoneNumber = (input?: string): string => {
    const digits = (input || '').replace(/\D/g, '');
    return /^\d{9,12}$/.test(digits) ? digits : '01012311234';
  };

  try {
    const created = await businessApi.create({
      business_name: businessName,
      phone_number: cleanPhoneNumber(phoneNumber),
      address: "주소 미입력",
      memo: "(자동 생성)",
    });

    const createdData = created?.data;
    if (!createdData || typeof createdData.id !== 'number') {
      console.error("[거래처 생성 응답 이상]", created);
      throw new Error("응답 구조가 올바르지 않음 (created.data.id 없음)");
    }

    console.log(`[거래처 등록 완료] ${businessName} (ID: ${createdData.id})`);

    const refreshed = await businessApi.getAll();
    const matched = refreshed.results.find(
      (b) => b.business_name.trim() === businessName.trim()
    );

    if (matched) {
      console.log(`[재조회로 확인된 거래처] ${businessName} (ID: ${matched.id})`);
      return matched.id;
    }

    console.warn(`[거래처 확인 실패, 생성된 ID 사용] ${businessName} (ID: ${createdData.id})`);
    return createdData.id;
  } catch (error) {
    console.error(`[거래처 등록 실패] ${businessName}`, error);
    return null;
  }
}


interface ParsedOrderData {
  business_name?: string
  phone_number?: string
  transcribed_text: string
  delivery_date?: string
  items: any[]
  memo?: string
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
  onError?: (error: string) => void
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
  onOrderParsed,
  onError,
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null)
  const [isLocalProcessing, setIsLocalProcessing] = useState<boolean>(false)
  const [newFishUnits, setNewFishUnits] = useState<Record<number, string>>({})

  // 거래처 목록 불러오기
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await businessApi.getAll()
        let businessData: Business[] = []

        if (Array.isArray(response)) {
          businessData = response
        } else if (Array.isArray(response?.results)) {
          businessData = response.results
        }

        setBusinesses(businessData)
      } catch (error) {
        setBusinesses([])
      }
    }

    fetchBusinesses()
  }, [])

  // 어종 목록 불러오기
  useEffect(() => {
    const fetchFishTypes = async () => {
      try {
        const response = await fishTypeApi.getAll()
        let fishData: FishType[] = []

        if (Array.isArray(response)) {
          fishData = response
        } else if (Array.isArray(response?.data)) {
          fishData = response.data
        }

        setFishTypes(fishData)
      } catch (error) {
        setFishTypes([])
      }
    }

    fetchFishTypes()
  }, [])

  // 어종 이름으로 fish_type_id 보정 (선택 후 fish_type_id 채워짐)
  useEffect(() => {
    if (parsedOrder && fishTypes.length > 0) {
      const hasUnmatchedItems = parsedOrder.items.some(item => 
        item.fish_type_id === 0 && item.item_name_snapshot
      )
      
      if (hasUnmatchedItems) {
        const updatedItems = parsedOrder.items.map((item) => {
          if (item.fish_type_id === 0 && item.item_name_snapshot) {
            const matched = fishTypes.find((f) => f.name === item.item_name_snapshot)
            return {
              ...item,
              fish_type_id: matched?.id || 0,
            }
          }
          return item
        })
        setParsedOrder({ ...parsedOrder, items: updatedItems })
      }
    }
  }, [fishTypes])

  // 주문 파싱 요청
  const handleParse = async () => {
    if (!textInput.trim()) return

    setIsLocalProcessing(true)

    try {
      const formData = new FormData()
      formData.append("text", textInput)
      formData.append("type", "text")

      if (selectedBusinessId) {
        formData.append("business_id", selectedBusinessId.toString())
      }

      if (deliveryDate) {
        formData.append("delivery_date", deliveryDate)
      }

      const result = await exebaseApi.processOrder(formData)
      if (result.success) {
        const orderData =
          typeof result.message === "string" ? JSON.parse(result.message) : result.message

        const formattedOrder: ParsedOrderData = {
          business_name: orderData.business_name,
          phone_number: orderData.phone_number || "",
          transcribed_text: orderData.transcribed_text || "",
          delivery_date: orderData.delivery_datetime || "",
          items: (orderData.items || []).map((item: any) => ({
            fish_type_id: item.fish_type_id || 0,
            quantity: item.quantity || 0,
            unit: item.unit || "kg",
            unit_price: item.unit_price || 0,
            item_name_snapshot: item.item_name_snapshot || "",
            remarks: item.remarks || "",
          })),
          memo: orderData.memo || "",
        }

        setParsedOrder(formattedOrder)

        if (formattedOrder.delivery_date && onDeliveryDateChange) {
          onDeliveryDateChange(formattedOrder.delivery_date)
        }

        if (onOrderParsed) {
          onOrderParsed(formattedOrder)
        }

        toast.success("주문이 성공적으로 파싱되었습니다.")
      } else {
        throw new Error(result.error || "주문 처리 중 오류 발생")
      }
    } catch (error) {
      console.error("파싱 오류:", error)
      toast.error("파싱 실패: " + (error as any)?.message || "")
    } finally {
      setIsLocalProcessing(false)
    }
  }

  // 항목 수정 핸들러
  const handleItemChange = (index: number, key: keyof OrderItem, value: any) => {
    if (!parsedOrder) return
    const updatedItems = [...parsedOrder.items]
    updatedItems[index] = { ...updatedItems[index], [key]: value }
    setParsedOrder({ ...parsedOrder, items: updatedItems })
  }

  // 항목 삭제 핸들러
  const handleRemoveItem = (index: number) => {
    if (!parsedOrder) return
    const updatedItems = parsedOrder.items.filter((_, i) => i !== index)
    setParsedOrder({ ...parsedOrder, items: updatedItems })
  }

// // ✅ 거래처 등록 처리 함수
// const handleRegisterNewBusiness = async () => {
//   const name = parsedOrder?.business_name?.trim()
//   const phone = (parsedOrder?.phone_number || "010-1231-1234").replace(/-/g, "")

//   if (!name) return toast.error("거래처명을 입력해주세요.")

//   try {
//     const result = await businessApi.create({ business_name: name, phone_number: phone })
//     const newBusiness = result.data

//     setBusinesses((prev) => [...prev, newBusiness])
//     onBusinessChange?.(newBusiness.id)
//     toast.success("거래처가 등록되었습니다.")
//   } catch (error) {
//     console.error(error)
//     toast.error("거래처 등록에 실패했습니다.")
//   }
// }
const handleRegisterNewBusiness = async () => {
  const name = parsedOrder?.business_name?.trim()
  const phone = parsedOrder?.phone_number || "01012311234"

  if (!name) return toast.error("거래처명을 입력해주세요.")

  const businessId = await findOrCreateBusiness(name, phone, businesses)

  if (businessId) {
    onBusinessChange?.(businessId)
    toast.success("거래처가 등록되었습니다.")
  } else {
    toast.error("거래처 등록에 실패했습니다.")
  }
}

// ✅ 어종 등록 처리 함수
const handleRegisterNewFishType = async (name: string, index: number) => {
  const trimmedName = name.trim()
  if (!trimmedName) return toast.error("어종명을 입력해주세요.")

  const selectedUnit = newFishUnits[index] || "박스" // 기본값 "박스"

  try {
    const result = await fishTypeApi.create({ name: trimmedName, unit: selectedUnit })
    const newFishType = result.data

    setFishTypes((prev) => [...prev, newFishType])
    handleItemChange(index, "fish_type_id", newFishType.id)

    // 등록 후 해당 항목 초기화
    setNewFishUnits((prev) => {
      const newState = { ...prev }
      delete newState[index]
      return newState
    })

    toast.success(`어종 "${newFishType.name}" 등록되었습니다.`)
  } catch (error) {
    console.error(error)
    toast.error("어종 등록에 실패했습니다.")
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
          placeholder={`주문 내용을 텍스트로 입력하세요...\n예: 바다수산에 고등어 10박스, 갈치 5박스 주문합니다. 1월 20일까지 배송 부탁드립니다.`}
          className="min-h-[120px]"
        />
      </div>
      <Button
        onClick={handleParse}
        disabled={isProcessing || isLocalProcessing || !textInput.trim()}
        className="w-full"
      >
        {isLocalProcessing ? "처리 중..." : "주문 파싱하기"}
      </Button>

      {parsedOrder && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-3">📝 주문 정보:</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 거래처명 직접 입력 */}
              <div className="space-y-2">
                <Label htmlFor="business-input">거래처명 (수정 가능)</Label>
                <Input
                  id="business-input"
                  value={parsedOrder.business_name || ""}
                  onChange={(e) =>
                    setParsedOrder({ ...parsedOrder, business_name: e.target.value })
                  }
                  placeholder="거래처명을 입력하세요"
                  className="bg-white border-green-300"
                />
                <Button
  variant="outline"
  size="sm"
  className="mt-1"
  onClick={handleRegisterNewBusiness}
>
  신규 거래처 등록
</Button>
              </div>

              {/* 배송일 */}
              <div className="space-y-2">
                <Label htmlFor="delivery_date">배송일 (수정 가능)</Label>
                <Input
                  type="date"
                  value={deliveryDate || ""}
                  onChange={(e) => onDeliveryDateChange?.(e.target.value)}
                  className="bg-white border-green-300"
                />
              </div>
            </div>

            {/* 품목들 */}
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">🐟 파싱된 주문 품목:</h5>
              <div className="space-y-2">
                {parsedOrder.items.map((item, index) => (
                  <div key={index} className="bg-white p-4 border border-green-200 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      {/* 어종 선택 or 직접 입력 */}
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium">어종</label>
                        {item.fish_type_id && item.fish_type_id !== 0 ? (
  <select
    className="w-full text-sm border border-gray-300 rounded"
    value={item.fish_type_id}
    onChange={(e) =>
      handleItemChange(index, "fish_type_id", parseInt(e.target.value))
    }
  >
    {fishTypes.map((fish) => (
      <option key={fish.id} value={fish.id}>
        {fish.name}
      </option>
    ))}
  </select>
) : (
  <div className="flex gap-2">
    <Input
      type="text"
      value={item.item_name_snapshot || ""}
      onChange={(e) =>
        handleItemChange(index, "item_name_snapshot", e.target.value)
      }
      placeholder="어종명을 입력하세요"
    />
    <Button
      size="sm"
      variant="secondary"
      onClick={() => handleRegisterNewFishType(item.item_name_snapshot || "", index)}
    >
      등록
    </Button>
  </div>
)}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium">수량</label>
                        <input
                          type="number"
                          className="w-full text-sm border border-gray-300 rounded"
                          value={item.quantity}
                          min="1"
                          onChange={(e) =>
                            handleItemChange(index, "quantity", parseInt(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium">단가(원)</label>
                        <input
                          type="number"
                          className="w-full text-sm border border-gray-300 rounded"
                          value={item.unit_price || 0}
                          min="0"
                          onChange={(e) =>
                            handleItemChange(index, "unit_price", parseInt(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium">단위</label>
                        <select
                          className="w-full text-sm border border-gray-300 rounded"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, "unit", e.target.value)}
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
                        소계:{" "}
                        <span className="font-semibold text-green-600">
                          {((item.unit_price || 0) * item.quantity).toLocaleString()}원
                        </span>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                        onClick={() => handleRemoveItem(index)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-green-100 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium text-green-900">총 합계:</span>
                <span className="text-lg font-bold text-green-900">
                  {parsedOrder.items
                    .reduce((total, item) => total + (item.unit_price || 0) * item.quantity, 0)
                    .toLocaleString()}
                  원
                </span>
              </div>
            </div>

            {/* 메모 */}
            {parsedOrder.memo && (
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
