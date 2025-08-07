/**
 * 음성 업로드 탭 컴포넌트
 * 음성 파일을 업로드하여 주문을 등록하는 탭입니다.
 */
import React, { useRef, useState } from "react"
import { Button } from "../../../components/ui/button"
import { Mic, Upload, Play, Pause, Trash2 } from "lucide-react"

interface VoiceUploadTabProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  isProcessing: boolean
  transcribedText?: string
  uploadedFile?: File | null
  onRemoveFile?: () => void
}

const VoiceUploadTab: React.FC<VoiceUploadTabProps> = ({
  onFileUpload,
  isProcessing,
  transcribedText,
  uploadedFile,
  onRemoveFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

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
          <Mic className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            음성 파일을 업로드하세요
          </h3>
          <p className="text-gray-600 mb-4">
            MP3 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
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
                파일 선택
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a"
            onChange={onFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mic className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>일시정지</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>재생</span>
                </>
              )}
            </Button>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <audio
            ref={audioRef}
            src={uploadedFile ? URL.createObjectURL(uploadedFile) : ''}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        </div>
      )}
      
      {transcribedText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">추출된 텍스트:</h4>
          <p className="text-blue-800">{transcribedText}</p>
        </div>
      )}
    </div>
  )
}

export default VoiceUploadTab 