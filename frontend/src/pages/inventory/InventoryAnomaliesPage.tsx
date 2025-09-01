/**
 * 이상 탐지 페이지
 * AI가 탐지한 재고 이상을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { AlertCircle, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react"
import toast from 'react-hot-toast'
import { inventoryApi } from '../../lib/api'
import FalsePositiveModal from '../../components/modals/FalsePositiveModal'

// 이상 탐지 데이터 타입
interface InventoryAnomaly {
  id: number;
  fish_type_name: string;
  anomaly_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  description: string;
  recommended_action: string;
  detected_at: string;
  resolved_at?: string;
  resolved: boolean;
  ai_model_version?: string;
}

// 이상 유형 매핑 (완전 한글화)
const getAnomalyTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    // 영어 타입 → 한글 변환
    'negative_stock': '마이너스 재고',
    'sudden_stock_change': '급격한 변동',
    'low_stock': '재고 부족',
    'duplicate_log': '중복 입력',
    'price_consistency': '단가 오류',
    'inventory_check_difference': '실사 차이',
    'unusual_pattern': '비정상 패턴',
    'seasonal_anomaly': '계절성 이상',
    // 한글 타입 (이미 변환된 경우)
    '마이너스 재고': '마이너스 재고',
    '급격한 재고 변동': '급격한 변동',
    '재고 부족': '재고 부족',
    '중복 입력': '중복 입력',
    '단가/금액 정합성': '단가 오류',
    '실사 차이': '실사 차이'
  }
  return typeMap[type] || type
}

// 심각도 매핑 (페르소나 맞춤)
const getSeverityText = (severity: string): string => {
  const severityMap: Record<string, string> = {
    'CRITICAL': '🚨 긴급',
    'HIGH': '⚠️ 주의',
    'MEDIUM': '확인 필요',
    'LOW': '정보'
  }
  return severityMap[severity] || severity
}

// 심각도에 따른 색상 (페르소나 맞춤)
const getSeverityColor = (severity: string): string => {
  const colorMap: Record<string, string> = {
    'CRITICAL': 'text-red-800 bg-red-50 border-red-200',
    'HIGH': 'text-orange-800 bg-orange-50 border-orange-200',
    'MEDIUM': 'text-yellow-800 bg-yellow-50 border-yellow-200',
    'LOW': 'text-blue-800 bg-blue-50 border-blue-200'
  }
  return colorMap[severity] || 'text-gray-800 bg-gray-50 border-gray-200'
}

const InventoryAnomaliesPage: React.FC = () => {
  const [anomalies, setAnomalies] = useState<InventoryAnomaly[]>([])
  const [loading, setLoading] = useState(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // 필터링된 데이터
  const [filteredAnomalies, setFilteredAnomalies] = useState<InventoryAnomaly[]>([])
  const [totalPages, setTotalPages] = useState(0)
  
  // 오탐지 모달 상태
  const [falsePositiveModal, setFalsePositiveModal] = useState<{
    isOpen: boolean
    anomalyId: number | null
    anomalyName: string
  }>({
    isOpen: false,
    anomalyId: null,
    anomalyName: ''
  })

  // 이상 탐지 결과 불러오기
  const loadAnomalies = async () => {
    setLoading(true)
    try {
      const data = await inventoryApi.getAnomalies()
      
      if (data && data.data && Array.isArray(data.data)) {
        setAnomalies(data.data)
      } else {
        setAnomalies([])
      }
    } catch (error: any) {
      setAnomalies([])
      toast.error('이상 탐지 결과를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 이상 탐지 상태 업데이트
  const updateAnomalyStatus = async (anomalyId: number, resolved: boolean, memo?: string) => {
    try {
      await inventoryApi.updateAnomaly(anomalyId, { resolved, memo })
      toast.success('상태가 업데이트되었습니다')
      loadAnomalies() // 목록 새로고침
    } catch (error: any) {
      toast.error('상태 업데이트에 실패했습니다')
    }
  }

  // 오탐지 모달 열기
  const openFalsePositiveModal = (anomalyId: number, anomalyName: string) => {
    setFalsePositiveModal({
      isOpen: true,
      anomalyId,
      anomalyName
    })
  }

  // 오탐지 처리 확인
  const handleFalsePositiveConfirm = async (reason: string) => {
    if (falsePositiveModal.anomalyId) {
      await updateAnomalyStatus(falsePositiveModal.anomalyId, false, reason)
    }
  }

  // 필터링 및 페이지네이션 처리
  useEffect(() => {
    let filtered = [...anomalies]
    
    // 검색 필터
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(anomaly => 
        anomaly.fish_type_name.toLowerCase().includes(term) ||
        anomaly.description.toLowerCase().includes(term) ||
        anomaly.recommended_action.toLowerCase().includes(term)
      )
    }
    
    // 심각도 필터
    if (severityFilter !== 'all') {
      filtered = filtered.filter(anomaly => anomaly.severity === severityFilter)
    }
    
    // 상태 필터
    if (statusFilter !== 'all') {
      if (statusFilter === 'resolved') {
        filtered = filtered.filter(anomaly => anomaly.resolved)
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(anomaly => !anomaly.resolved)
      }
    }
    
    setFilteredAnomalies(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    
    // 현재 페이지가 총 페이지 수를 초과하면 첫 페이지로 이동
    if (currentPage > Math.ceil(filtered.length / itemsPerPage)) {
      setCurrentPage(1)
    }
  }, [anomalies, searchTerm, severityFilter, statusFilter, currentPage])

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadAnomalies()
  }, [])
  
  // 현재 페이지의 데이터 계산
  const getCurrentPageData = (): InventoryAnomaly[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAnomalies.slice(startIndex, endIndex)
  }
  
  const currentPageData = getCurrentPageData()

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 소수점 제거 함수 (페르소나 맞춤)
  const removeDecimal = (text: string): string => {
    if (!text) return text
    // "100.0박스" → "100박스", "-30.0kg" → "-30kg"
    return text.replace(/\.0(?=[박스kg마리포개통팩])/g, '')
  }

  // 통계 계산
  const getStatistics = () => {
    const total = anomalies.length
    const critical = anomalies.filter(a => a.severity === 'CRITICAL').length
    const high = anomalies.filter(a => a.severity === 'HIGH').length
    const pending = anomalies.filter(a => !a.resolved).length
    const resolved = anomalies.filter(a => a.resolved).length

    return { total, critical, high, pending, resolved }
  }

  const stats = getStatistics()

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">이상 탐지</h1>
          <Badge variant="outline" className="text-sm">
            총 {anomalies.length}개 이상
          </Badge>
        </div>
        <Button variant="outline" onClick={loadAnomalies} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>새로고침</span>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">전체 이상</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-gray-600">심각</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-sm text-gray-600">높음</div>
          </CardContent>
        </Card>
                 <Card>
           <CardContent className="p-4 text-center">
             <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
             <div className="text-sm text-gray-600">검토 필요</div>
           </CardContent>
         </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-600">해결됨</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            검색 및 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 검색 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="어종명, 설명, 권장조치로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 심각도 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">심각도</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 심각도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="CRITICAL">🚨 긴급</SelectItem>
                  <SelectItem value="HIGH">⚠️ 주의</SelectItem>
                  <SelectItem value="MEDIUM">확인 필요</SelectItem>
                  <SelectItem value="LOW">정보</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 상태 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">검토 상태</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                                 <SelectContent>
                   <SelectItem value="all">전체</SelectItem>
                   <SelectItem value="pending">🔍 검토 필요</SelectItem>
                   <SelectItem value="resolved">✅ 해결됨</SelectItem>
                   <SelectItem value="false_positive">❌ 오탐지</SelectItem>
                 </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 이상 탐지 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">이상 탐지 결과를 불러오는 중...</p>
        </div>
      ) : filteredAnomalies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">탐지된 이상이 없습니다.</p>
            <p className="text-sm text-gray-500 mt-1">재고가 정상적으로 관리되고 있습니다.</p>
            {searchTerm || severityFilter !== 'all' || statusFilter !== 'all' && (
              <p className="text-sm text-gray-500 mt-1">필터 조건을 조정해보세요.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {currentPageData.map((anomaly) => (
              <Card key={anomaly.id} className={`border-l-4 ${
                anomaly.severity === 'CRITICAL' ? 'border-l-red-500 bg-red-50' :
                anomaly.severity === 'HIGH' ? 'border-l-orange-500 bg-orange-50' :
                anomaly.severity === 'MEDIUM' ? 'border-l-yellow-500 bg-yellow-50' :
                'border-l-blue-500 bg-blue-50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Badge className={`text-sm px-3 py-1 font-bold ${
                          anomaly.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                          anomaly.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                          anomaly.severity === 'MEDIUM' ? 'bg-yellow-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {getAnomalyTypeText(anomaly.anomaly_type)}
                        </Badge>
                        <span className="font-bold text-lg text-gray-900">{anomaly.fish_type_name}</span>
                        <Badge className={`text-sm px-3 py-1 font-medium ${getSeverityColor(anomaly.severity)} border`}>
                          {getSeverityText(anomaly.severity)}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-white">
                          {Math.round(anomaly.confidence_score * 100)}% 확신
                        </Badge>
                        {anomaly.ai_model_version && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            {anomaly.ai_model_version}
                          </Badge>
                        )}
                      </div>
                                             <div className="mb-3">
                         <p className="text-base text-gray-800 font-medium leading-relaxed">
                           {removeDecimal(anomaly.description)}
                         </p>
                       </div>
                      <div className="mb-3 p-3 bg-white rounded-lg border">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-blue-600">권장 조치:</span>
                          <span className="ml-2">{anomaly.recommended_action}</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>탐지: {formatDate(anomaly.detected_at)}</span>
                        {anomaly.resolved_at && (
                          <span>해결: {formatDate(anomaly.resolved_at)}</span>
                        )}
                                                 <span>상태: {anomaly.resolved ? (anomaly.description && (anomaly.description.includes('재고정상') || anomaly.description.includes('AI오류') || anomaly.description.includes('시스템오류') || anomaly.description.includes('데이터오류') || anomaly.description.includes('기타')) ? '오탐지' : '해결됨') : '검토 필요'}</span>
                      </div>
                    </div>
                                         <div className="flex flex-col space-y-2 ml-4">
                                               {!anomaly.resolved ? (
                         <>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => updateAnomalyStatus(anomaly.id, true)}
                             className="flex items-center space-x-1 text-green-600 border-green-200 hover:bg-green-50"
                           >
                             <CheckCircle className="w-3 h-3" />
                             <span>해결</span>
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => openFalsePositiveModal(anomaly.id, anomaly.fish_type_name)}
                             className="flex items-center space-x-1 text-gray-600 border-gray-200 hover:bg-gray-50"
                           >
                             <XCircle className="w-3 h-3" />
                             <span>오탐지</span>
                           </Button>
                         </>
                                               ) : (
                          <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">처리 완료</span>
                          </div>
                        )}
                     </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
                     )}
         </>
       )}

       {/* 오탐지 사유 선택 모달 */}
       <FalsePositiveModal
         isOpen={falsePositiveModal.isOpen}
         onClose={() => setFalsePositiveModal(prev => ({ ...prev, isOpen: false }))}
         onConfirm={handleFalsePositiveConfirm}
         anomalyName={falsePositiveModal.anomalyName}
       />
     </div>
   )
 }

export default InventoryAnomaliesPage
