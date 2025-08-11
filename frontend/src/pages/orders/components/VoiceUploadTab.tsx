/**
 * 음성 업로드 탭 컴포넌트
 * 음성 파일을 업로드하여 주문을 등록하는 탭입니다.
 */
import React, { useRef, useState } from "react"
import { Button } from "../../../components/ui/button"
import { Mic, Upload, Play, Pause, Trash2, AlertCircle } from "lucide-react"
import { sttApi } from "../../../lib/api"

interface VoiceUploadTabProps {
  onTranscriptionComplete?: (text: string) => void
  onError?: (error: string) => void
}

const VoiceUploadTab: React.FC<VoiceUploadTabProps> = ({
  onTranscriptionComplete,
  onError
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 검증
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      const errorMsg = '지원되지 않는 파일 형식입니다. MP3, WAV, M4A 파일만 업로드 가능합니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = '파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setUploadedFile(file)
    setError('')
    setTranscribedText('')
    
    // STT 처리 시작
    await transcribeAudio(file)
  }

  const transcribeAudio = async (file: File) => {
    setIsProcessing(true)
    setError('')
    
    try {
      console.log('🎤 STT 변환 시작:', file.name)
      const result = await sttApi.transcribe(file, 'ko')
      
      console.log('✅ STT 변환 완료:', result.transcription)
      setTranscribedText(result.transcription)
      onTranscriptionComplete?.(result.transcription)
      
    } catch (err) {
      console.error('❌ STT 변환 실패:', err)
      const errorMsg = err instanceof Error ? err.message : 'STT 변환 중 오류가 발생했습니다.'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setTranscribedText('')
    setError('')
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
            onChange={handleFileUpload}
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
              onClick={handleRemoveFile}
              className="text-red-500 hover:text-red-700"
              disabled={isProcessing}
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
      
      {/* 로딩바 */}
      {isProcessing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-1">음성을 텍스트로 변환 중...</h4>
              <p className="text-sm text-yellow-700">잠시만 기다려 주세요. 처리 시간이 다소 소요될 수 있습니다.</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="bg-yellow-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h4 className="font-medium text-red-900">오류가 발생했습니다</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 변환된 텍스트 */}
      {transcribedText && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">🎤 추출된 텍스트:</h4>
          <div className="bg-white rounded-md p-3 border">
            <p className="text-gray-800 leading-relaxed">{transcribedText}</p>
          </div>
          <p className="text-xs text-green-600 mt-2">
            ✅ 음성 변환이 완료되었습니다. 텍스트를 확인하고 필요시 수정해주세요.
          </p>
        </div>
      )}
    </div>
  )
}

export default VoiceUploadTab 