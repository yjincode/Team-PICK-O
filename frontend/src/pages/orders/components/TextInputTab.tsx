/**
 * 텍스트 입력 탭 컴포넌트
 * 텍스트를 입력하여 주문을 등록하는 탭입니다.
 */
import React from "react"
import { Button } from "../../../components/ui/button"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"

interface TextInputTabProps {
  textInput: string
  setTextInput: (text: string) => void
  onParse: () => void
  isProcessing: boolean
  transcribedText?: string
}

const TextInputTab: React.FC<TextInputTabProps> = ({
  textInput,
  setTextInput,
  onParse,
  isProcessing,
  transcribedText
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text-input">문자 내용 입력</Label>
        <Textarea
          id="text-input"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="주문 내용을 텍스트로 입력하세요..."
          className="min-h-[120px]"
        />
      </div>
      <Button 
        onClick={onParse} 
        className="w-full" 
        disabled={!textInput.trim() || isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            파싱 중...
          </>
        ) : (
          "파싱하기"
        )}
      </Button>
      
      {transcribedText && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">추출된 텍스트:</h4>
          <p className="text-green-800">{transcribedText}</p>
        </div>
      )}
    </div>
  )
}

export default TextInputTab 