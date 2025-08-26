import React, { useState } from 'react'
import { Button } from '../ui/button'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { XCircle } from 'lucide-react'

interface FalsePositiveModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  anomalyName: string
}

const falsePositiveReasons = [
  { value: '재고정상', label: '재고가 정상입니다' },
  { value: 'AI오류', label: 'AI가 잘못 판단했습니다' },
  { value: '시스템오류', label: '시스템에 문제가 있습니다' },
  { value: '데이터오류', label: '데이터를 잘못 입력했습니다' },
  { value: '기타', label: '다른 이유가 있습니다' }
]

const FalsePositiveModal: React.FC<FalsePositiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  anomalyName
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('')

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-600" />
            왜 오탐지인가요?
          </h2>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600">
            <strong>{anomalyName}</strong>에 대해 AI가 잘못 판단한 것 같습니다.<br/>
            어떤 이유인지 선택해주세요.
          </div>
          
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            <div className="space-y-3">
              {falsePositiveReasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedReason}
              className="bg-gray-600 hover:bg-gray-700"
            >
              확인
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FalsePositiveModal
