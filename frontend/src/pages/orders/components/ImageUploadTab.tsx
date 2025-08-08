/**
 * 이미지 업로드 탭 컴포넌트
 * 이미지 파일을 업로드하여 주문을 등록하는 탭입니다.
 */
import React, { useRef, useState } from "react"
import { Button } from "../../../components/ui/button"
import { Camera, Upload, Trash2, Eye } from "lucide-react"

interface ImageUploadTabProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  isProcessing: boolean
  transcribedText?: string
  uploadedFile?: File | null
  onRemoveFile?: () => void
}

const ImageUploadTab: React.FC<ImageUploadTabProps> = ({
  onFileUpload,
  isProcessing,
  transcribedText,
  uploadedFile,
  onRemoveFile
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [showFullImage, setShowFullImage] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            이미지 파일을 업로드하세요
          </h3>
          <p className="text-gray-600 mb-4">
            수조 사진을 업로드하면 품목이 자동 인식됩니다
          </p>
          <Button
            onClick={() => imageInputRef.current?.click()}
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
                이미지 선택
              </>
            )}
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={onFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Camera className="h-8 w-8 text-green-500" />
              <div>
                <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullImage(true)}
                className="text-blue-500 hover:text-blue-700"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemoveFile}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative flex justify-center bg-gray-50 rounded-lg p-4">
            <img
              src={URL.createObjectURL(uploadedFile)}
              alt="업로드된 이미지"
              className="max-w-full max-h-80 object-contain rounded-lg border border-gray-200 bg-white shadow-sm"
              style={{ 
                minHeight: '120px',
                maxHeight: '320px'
              }}
            />
          </div>
        </div>
      )}
      
      {transcribedText && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">추출된 텍스트:</h4>
          <p className="text-green-800">{transcribedText}</p>
        </div>
      )}

      {/* 전체 이미지 모달 */}
      {showFullImage && uploadedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullImage(false)}
                className="bg-white/80 hover:bg-white text-gray-700"
              >
                ✕
              </Button>
            </div>
            <img
              src={URL.createObjectURL(uploadedFile)}
              alt="전체 이미지"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUploadTab 