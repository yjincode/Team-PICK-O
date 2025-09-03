import { useState, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { businessApi, exebaseApi, fishTypeApi } from "../../../lib/api";
import { toast } from "react-hot-toast";
import { Mic, Upload, Play, Pause, Trash2, AlertCircle } from "lucide-react";

interface Business {
  id: number;
  business_name: string;
  phone_number: string;
}

interface FishType {
  id: number;
  name: string;
  unit: string;
  created_at?: string;
}

interface OrderItem {
  fish_type_id: number;
  quantity: number;
  unit_price?: number;
  unit: string;
  item_name_snapshot?: string;
  remarks?: string;
}

interface ParsedOrderData {
  business_name?: string;
  phone_number?: string;
  transcribed_text: string;
  delivery_date?: string;
  items: OrderItem[];
  memo?: string;
}

interface VoiceUploadTabProps {
  businesses: Business[];
  fishTypes: FishType[];
  onError?: (msg: string) => void;
  onBusinessChange?: (id: number | null) => void;
  onDeliveryDateChange?: (date: string) => void;
  selectedBusinessId?: number | null;
  deliveryDate?: string;
  onTranscriptionComplete?: (text: string) => void;
  onOrderParsed?: (orderData: ParsedOrderData) => void;
}

const VoiceUploadTab: React.FC<VoiceUploadTabProps> = ({
  businesses,
  fishTypes,
  onError,
  onBusinessChange,
  onDeliveryDateChange,
  selectedBusinessId,
  deliveryDate,
  onTranscriptionComplete,
  onOrderParsed,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderData | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const formatFileSize = (size: number) =>
    size < 1024
      ? `${size} B`
      : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(2)} MB`;

  const parseVoiceFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setError("");
      setTranscribedText("");
      setParsedOrder(null);

      const formData = new FormData();
      formData.append("file", file);

      const result = await exebaseApi.processOrder(formData);

      if (result.success) {
        const orderData =
          typeof result.message === "string"
            ? JSON.parse(result.message)
            : result.message;

        setTranscribedText(orderData.transcribed_text || "");
        setParsedOrder(orderData);
        onTranscriptionComplete?.(orderData.transcribed_text || "");
        onOrderParsed?.(orderData);
      } else {
        throw new Error(result.message || "처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(msg);
      onError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a"];
    if (
      !validTypes.includes(file.type) &&
      !/\.(mp3|wav|m4a)$/i.test(file.name)
    ) {
      const msg =
        "지원되지 않는 파일 형식입니다. MP3, WAV, M4A 파일만 업로드 가능합니다.";
      setError(msg);
      onError?.(msg);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const msg = "파일 크기가 너무 큽니다. 10MB 이하로 업로드하세요.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setUploadedFile(file);
    await parseVoiceFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setTranscribedText("");
    setParsedOrder(null);
    setError("");
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleItemChange = (
    index: number,
    key: keyof OrderItem,
    value: any
  ) => {
    if (!parsedOrder) return;
    const items = [...parsedOrder.items];
    items[index] = { ...items[index], [key]: value };
    setParsedOrder({ ...parsedOrder, items });
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedOrder) return;
    const items = parsedOrder.items.filter((_, i) => i !== index);
    setParsedOrder({ ...parsedOrder, items });
  };

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

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div className="border-2 border-dashed p-8 text-center hover:border-gray-400">
          <Mic className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            음성 파일을 업로드하세요
          </h3>
          <p className="text-gray-600 mb-4">
            MP3, WAV, M4A만 지원합니다.
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isProcessing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? "처리 중..." : "파일 선택"}
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
        <div className="border p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mic className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? "일시정지" : "재생"}</span>
            </Button>
            <audio
              ref={audioRef}
              src={uploadedFile ? URL.createObjectURL(uploadedFile) : ""}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="font-medium text-yellow-900">음성 인식 중...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {transcribedText && !error && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-medium text-green-900">🎤 추출된 텍스트:</p>
          <div className="mt-2 p-2 bg-white rounded border">
            {transcribedText}
          </div>
        </div>
      )}

      {parsedOrder && (
        <div className="p-4 bg-green-50 border border-green-200 rounded space-y-4">
          <p className="font-medium text-green-900">📝 주문 정보:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 거래처명 */}
            <div className="space-y-2">
              <Label htmlFor="business-input">거래처명 (수정 가능)</Label>
              <Input
                id="business-input"
                value={parsedOrder.business_name || ""}
                onChange={(e) =>
                  setParsedOrder({ ...parsedOrder, business_name: e.target.value })
                }
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone-input">전화번호 (선택)</Label>
              <Input
                id="phone-input"
                value={parsedOrder.phone_number || ""}
                onChange={(e) =>
                  setParsedOrder({ ...parsedOrder, phone_number: e.target.value })
                }
              />
            </div>

            {/* 신규 거래처 등록 버튼 */}
            <Button size="sm" onClick={handleRegisterBusiness}>
              거래처 등록
            </Button>

            {/* 배송일 */}
            <div className="space-y-2">
              <Label htmlFor="delivery-date">배송일 (수정 가능)</Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate || ""}
                onChange={(e) => onDeliveryDateChange?.(e.target.value)}
              />
            </div>
          </div>

          {/* 품목 리스트 */}
          <div>
            <p className="font-medium">🐟 파싱된 주문 품목:</p>
            <div className="space-y-3">
              {parsedOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white border rounded-md space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* 어종 */}
                    <div className="space-y-1">
                      <Label>어종</Label>
                      {item.fish_type_id ? (
                        <select
                          className="w-full border rounded"
                          value={item.fish_type_id}
                          onChange={(e) =>
                            handleItemChange(idx, "fish_type_id", +e.target.value)
                          }
                        >
                          {fishTypes.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex space-x-2">
                          <Input
                            value={item.item_name_snapshot || ""}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "item_name_snapshot",
                                e.target.value
                              )
                            }
                            placeholder="어종명을 입력하세요"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const name = item.item_name_snapshot?.trim();
                              const unit = item.unit || "박스";
                              if (!name) {
                                toast.error("어종명을 입력하세요.");
                                return;
                              }
                              handleRegisterFishType(name, unit, idx);
                            }}
                          >
                            등록
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 수량 */}
                    <div className="space-y-1">
                      <Label>수량</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", +e.target.value)
                        }
                      />
                    </div>

                    {/* 단가 */}
                    <div className="space-y-1">
                      <Label>단가(원)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unit_price ?? ""}
                        onChange={(e) =>
                          handleItemChange(idx, "unit_price", +e.target.value)
                        }
                      />
                    </div>

                    {/* 단위 */}
                    <div className="space-y-1">
                      <Label>단위</Label>
                      <select
                        className="w-full border rounded"
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(idx, "unit", e.target.value)
                        }
                      >
                        {["박스", "kg", "마리", "개", "통", "팩"].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 소계 */}
                  <div className="flex justify-between">
                    <p>
                      소계:{" "}
                      <span className="font-semibold text-green-600">
                        {(
                          (item.unit_price || 0) * item.quantity
                        ).toLocaleString()}
                        원
                      </span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 총 합계 */}
            <div className="mt-3 p-3 bg-green-100 rounded flex justify-between font-bold">
              <span>총 합계:</span>
              <span>
                {parsedOrder.items
                  .reduce((sum, itm) => sum + (itm.unit_price || 0) * itm.quantity, 0)
                  .toLocaleString()}
                원
              </span>
            </div>
          </div>

          {/* 메모 */}
          {parsedOrder.memo && (
            <div className="space-y-1">
              <Label>메모</Label>
              <div className="p-2 bg-white border rounded">
                {parsedOrder.memo}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceUploadTab;
