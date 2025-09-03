/**
 * 이미지 업로드 탭 컴포넌트
 * 이미지 파일을 업로드하여 주문을 등록하는 탭입니다.
 */
import { useRef, useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Camera, Upload, Trash2, Eye, AlertCircle, X } from "lucide-react"
import { businessApi, exebaseApi, fishTypeApi } from "../../../lib/api"
import type { Business } from "../../../types"

import toast from "react-hot-toast"


interface OrderItem {
  fish_type_id: number
  quantity: number
  unit_price?: number
  unit: string
  item_name_snapshot?: string
  remarks?: string
}

interface ParsedOrderData {
  business_name?: string
  phone_number?: string
  transcribed_text: string
  delivery_date?: string
  items: any
  memo?: string
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
  transcribed_text: _transcribed_text,
  uploadedFile,
  onRemoveFile = () => {},
  selectedBusinessId,
  onBusinessChange = (businessId: number | null) => {},
  deliveryDate = '',
  onDeliveryDateChange = (date: string) => {},
  onOrderParsed = (orderData: ParsedOrderData) => {},
  onError = (error: string) => {}
}: ImageUploadTabProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  // const [fishTypes, setFishTypes] = useState<FishType[]>([]);
  const [localUploadedFile, setLocalUploadedFile] = useState<File | null>(null);
  // const [localTranscribedText, setLocalTranscribedText] = useState<string>('');
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null);
  const [localIsProcessing, setLocalIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 거래처 목록 로드
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await businessApi.getAll();
        let businessData: Business[] = [];
        
        if (response && Array.isArray(response)) {
          businessData = response;
        } else if (response && Array.isArray(response.results)) {
          businessData = response.results;
        }
        
        setBusinesses(businessData);
      } catch (error) {
        setBusinesses([]);
      }
    };

    fetchBusinesses();
  }, []);

  // 이미지 파일 처리 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 크기 검증 (5MB 이하)
    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = '이미지 파일 크기는 5MB를 초과할 수 없습니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    // 파일 타입 검증 (이미지 파일만 허용)
    if (!file.type.startsWith('image/')) {
      const errorMsg = '이미지 파일만 업로드 가능합니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setLocalUploadedFile(file)
    setError('')
    setLocalIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'image')

      if (selectedBusinessId) {
        formData.append('business_id', selectedBusinessId.toString())
      }

      if (deliveryDate) {
        formData.append('delivery_date', deliveryDate)
      }

      // API 응답 타입 정의
      interface ApiOrderResponse {
        business_name?: string;
        phone_number?: string;
        transcribed_text: string;
        delivery_datetime?: string;
        items: any[];
        memo?: string;
        [key: string]: any;
      }

      // exebaseApi를 사용하여 주문 처리
      const result = await exebaseApi.processOrder(formData) as { 
        success: boolean; 
        message: ApiOrderResponse | string 
      };

      // ✅ message 안에 데이터가 존재할 경우 처리
      if (result.success && result.message) {
        if (typeof result.message === 'string') {
          console.error('Unexpected string response:', result.message);
          return;
        }
        
        const orderData: ApiOrderResponse = result.message;

        const parsedItems = Array.isArray(orderData.items) ? orderData.items : [];

        const parsedOrderData: ParsedOrderData = {
          business_name: orderData.business_name || '',
          phone_number: orderData.phone_number || '',
          transcribed_text: orderData.transcribed_text || '',
          delivery_date: orderData.delivery_datetime || '', // delivery_date로 매핑
          items: parsedItems,
          memo: orderData.memo || ''
        };

        setParsedOrder(parsedOrderData);

        onOrderParsed?.(parsedOrderData);
      } else {
        const errorMessage = '파싱된 주문 데이터가 없습니다.';
        setError(errorMessage);
        onError?.(errorMessage);
      }

    } catch (error) {
      console.error('이미지 처리 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLocalIsProcessing(false)
    }
  }

  const handleRemoveLocalFile = () => {
    // Reset local file state
    setLocalUploadedFile(null);
    // Reset other states
    setParsedOrder(null);
    setError('');
    // Clear the file input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    // Call the parent's remove file handler if provided
    onRemoveFile?.();
  };

  const currentFile = localUploadedFile || uploadedFile;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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


  const handleRegisterBusiness = async () => {
    if (!parsedOrder?.business_name?.trim()) {
      toast.error("거래처명을 입력하세요.");
      return;
    }
    try {
      const res = await businessApi.create({
        business_name: parsedOrder.business_name.trim(),
        phone_number: parsedOrder.phone_number?.trim() || "",
      });
      toast.success("거래처가 등록되었습니다.");
      onBusinessChange?.(res.data.id);
    } catch {
      toast.error("거래처 등록에 실패했습니다.");
    }
  };

  const handleRegisterFishType = async (
    name: string,
    unit: string,
    index: number
  ) => {
    try {
      const res = await fishTypeApi.create({
        name,
        unit,
      });
      toast.success("어종이 등록되었습니다.");
      handleItemChange(index, "fish_type_id", res.data.id);
    } catch {
      toast.error("어종 등록에 실패했습니다.");
    }
  };

  // 컴포넌트 반환
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="image-upload">이미지 업로드</Label>
        <div className="flex items-center gap-2">
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            ref={imageInputRef}
            onChange={ handleFileUpload}
            disabled={isProcessing || localIsProcessing}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessing || localIsProcessing}
            className="flex-1"
          >
            {localIsProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                처리 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                이미지 선택
              </>
            )}
          </Button>
          {currentFile && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowFullImage(true)}
                disabled={isProcessing || localIsProcessing}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRemoveLocalFile}
                disabled={isProcessing || localIsProcessing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        {currentFile && (
          <p className="text-sm text-muted-foreground">
            {currentFile.name} ({formatFileSize(currentFile.size)})
          </p>
        )}
        {error && (
          <p className="text-sm text-red-500 flex items-center">
            <AlertCircle className="mr-1 h-4 w-4" />
            {error}
          </p>
        )}
      </div>

      {/* 이미지 미리보기 */}
      {currentFile && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="relative flex justify-center bg-white rounded-lg p-4">
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
      {localIsProcessing && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <div className="flex-1">
              <h4 className="font-medium text-orange-900 mb-1">이미지 처리 중...</h4>
              <p className="text-sm text-orange-700">이미지에서 텍스트를 추출하고 주문 정보를 파싱하고 있습니다.</p>
            </div>
          </div>
        </div>
      )}

    
  <div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="text-input">주문 내용 입력</Label>
    {/* <Textarea
      id="text-input"
      value={textInput}
      onChange={(e) => setTextInput(e.target.value)}
      placeholder={`주문 내용을 텍스트로 입력하세요...\n예: 바다수산에 고등어 10박스, 갈치 5박스 주문합니다. 1월 20일까지 배송 부탁드립니다.`}
      className="min-h-[120px]"
    /> */}
  </div>
  {/* <Button
    onClick={handleParse}
    disabled={isProcessing || isLocalProcessing || !textInput.trim()}
    className="w-full"
  >
    {isLocalProcessing ? "처리 중..." : "주문 파싱하기"}
  </Button> */}

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
              onClick={() => {
                toast("신규 거래처 등록 기능은 구현 필요합니다.")
                // TODO: 신규 거래처 등록 API 연결
              }}
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
                        {/* {fishTypes.map((fish) => (
                          <option key={fish.id} value={fish.id}>
                            {fish.name}
                          </option>
                        ))} */}
                      </select>
                    ) : (
                      <Input
                        type="text"
                        value={item.item_name_snapshot || ""}
                        onChange={(e) =>
                          handleItemChange(index, "item_name_snapshot", e.target.value)
                        }
                        placeholder="어종명을 입력하세요"
                      />
                    )}
                  </div>
                  <div>
                  <Button
                            size="sm"
                            onClick={() => {
                              const name = item.item_name_snapshot?.trim();
                              const unit = item.unit || "박스";
                              if (!name) {
                                toast.error("어종명을 입력하세요.");
                                return;
                              }
                              handleRegisterFishType(name, unit, index);
                            }}
                          >
                            등록
                          </Button>
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
      

      {/* 전체 이미지 모달 */}
      {showFullImage && currentFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-full h-full max-h-[80vh] overflow-auto">
              <img
                src={URL.createObjectURL(currentFile)}
                alt="업로드된 이미지"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>

    
  );
};

export default ImageUploadTab;
