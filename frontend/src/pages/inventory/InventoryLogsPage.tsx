/**
 * 입출고 이력 페이지
 * 재고의 모든 입출고 기록을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { History, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Info } from "lucide-react"
import toast from 'react-hot-toast'
import { inventoryApi } from '../../lib/api'


// 입출고 로그 데이터 타입
interface InventoryLog {
  id: number;
  fish_type_name: string;
  type: 'in' | 'out' | 'adjust';
  change: number;
  before_quantity: number;
  after_quantity: number;
  unit: string;
  source_type: string;
  memo?: string;
  created_at: string;
  is_anomaly: boolean;
  anomaly_type?: string;
  anomaly_score?: number; // 이상탐지 점수 추가
  review_status: string;
  unit_price?: number; // 단가
  total_amount?: number; // 총액
  inventory_id?: number; // 실사 ID
}

// 입출고 타입 매핑
const getLogTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'in': '입고',
    'out': '출고',
    'adjust': '조정'
  }
  return typeMap[type] || type
}

// 이상 유형 매핑 (영어 → 한글 완전 변환)
const getAnomalyTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    // 영어 타입 → 한글 변환
    'negative_stock': '마이너스 재고',
    'sudden_stock_change': '급격한 변동',
    'low_stock': '재고 부족',
    'duplicate_log': '중복 입력',
    'price_consistency': '단가 오류',
    'inventory_check_difference': '실사 차이',
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

// 처리 방식 매핑
const getSourceTypeText = (sourceType: string): string => {
  const sourceMap: Record<string, string> = {
    'manual': '수동',
    'voice': '음성 인식',
    'text': '텍스트 입력',
    'image': '이미지 인식',
    'api': 'API 연동',
    'system': '시스템 자동',
    'order_shipout': '주문 출고',
    'order': '주문',
    'payment': '결제',
    'AI': 'AI',
    'YOLO': 'YOLO'
  }
  return sourceMap[sourceType] || sourceType
}

const InventoryLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all')
  
  // 필터링된 데이터
  const [filteredLogs, setFilteredLogs] = useState<InventoryLog[]>([])
  const [totalPages, setTotalPages] = useState(0)



  // 입출고 로그 불러오기
  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await inventoryApi.getLogs()
      console.log('📜 입출고 로그 API 응답:', data)
      
      if (Array.isArray(data)) {
        setLogs(data)
      } else {
        setLogs([])
      }
    } catch (error: any) {
      console.error('입출고 로그 로딩 에러:', error)
      setLogs([])
      toast.error('입출고 로그를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }



    // 이상탐지 배지 표시 (페르소나 맞춤)
  const getAnomalyBadge = (log: InventoryLog) => {
    if (!log.is_anomaly || !log.anomaly_type) return null

    // 한글 타입명으로 변환 (영어 → 한글 완전 매핑)
    const getAnomalyTypeText = (type: string): string => {
      const typeMap: Record<string, string> = {
        // 영어 타입 → 한글 변환
        'negative_stock': '마이너스 재고',
        'sudden_stock_change': '급격한 변동',
        'low_stock': '재고 부족',
        'duplicate_log': '중복 입력',
        'price_consistency': '단가 오류',
        'inventory_check_difference': '실사 차이',
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

    // 심각도에 따른 스타일 결정
    const severity = log.anomaly_score || 0
    let bgColor = 'bg-gray-500'
    let textColor = 'text-white'
    let icon = '⚠️'
    let text = getAnomalyTypeText(log.anomaly_type)

    if (severity >= 0.9) {
      bgColor = 'bg-red-600'
      icon = '🚨'
      text = `🚨 긴급! ${text}`
    } else if (severity >= 0.7) {
      bgColor = 'bg-orange-500'
      icon = '⚠️'
      text = `⚠️ 주의! ${text}`
    } else if (severity >= 0.5) {
      bgColor = 'bg-yellow-500'
      icon = ''
      text = `확인 필요: ${text}`
    }

    return (
      <Badge className={`${bgColor} ${textColor} text-sm px-3 py-2 font-medium shadow-sm`}>
        {text}
      </Badge>
    )
  }

  // 필터링 및 페이지네이션 처리
  useEffect(() => {
    let filtered = [...logs]
    
    // 검색 필터
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.fish_type_name.toLowerCase().includes(term)
      )
    }
    
    // 타입 필터
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter)
    }
    
    // 이상 탐지 필터
    if (anomalyFilter !== 'all') {
      if (anomalyFilter === 'anomaly') {
        filtered = filtered.filter(log => log.is_anomaly)
      } else {
        filtered = filtered.filter(log => !log.is_anomaly)
      }
    }
    
    setFilteredLogs(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    
    // 현재 페이지가 총 페이지 수를 초과하면 첫 페이지로 이동
    if (currentPage > Math.ceil(filtered.length / itemsPerPage)) {
      setCurrentPage(1)
    }
  }, [logs, searchTerm, typeFilter, anomalyFilter, currentPage])

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadLogs()
  }, [])
  
  // 현재 페이지의 데이터 계산
  const getCurrentPageData = (): InventoryLog[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredLogs.slice(startIndex, endIndex)
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

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">입출고 이력</h1>
          <Badge variant="outline" className="text-sm">
            총 {logs.length}개 기록
          </Badge>
        </div>
        <Button variant="outline" onClick={loadLogs} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>새로고침</span>
        </Button>
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
                  placeholder="어종명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 타입 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">입출고 타입</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 타입" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="in">입고</SelectItem>
                  <SelectItem value="out">출고</SelectItem>
                  <SelectItem value="adjust">조정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 이상 탐지 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">이상 탐지</label>
              <Select value={anomalyFilter} onValueChange={setAnomalyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="anomaly">이상 탐지된 것만</SelectItem>
                  <SelectItem value="normal">정상인 것만</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로그 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">입출고 이력을 불러오는 중...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">입출고 기록이 없습니다.</p>
            {searchTerm || typeFilter !== 'all' || anomalyFilter !== 'all' && (
              <p className="text-sm text-gray-500 mt-1">필터 조건을 조정해보세요.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {currentPageData.map((log) => (
              <Card key={log.id} className={`${log.is_anomaly ? 'border-red-200 bg-red-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant={log.type === 'in' ? 'default' : log.type === 'out' ? 'secondary' : 'outline'}>
                          {getLogTypeText(log.type)}
                        </Badge>
                        <span className="font-semibold text-gray-900">{log.fish_type_name}</span>
                        {/* 이상탐지 배지 */}
                        {getAnomalyBadge(log)}
                      </div>
                                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                         <div>
                           <span className="text-gray-600">추가/감소:</span>
                           <span className="ml-2 font-medium">
                             {log.change > 0 ? '+' : ''}{log.change} {log.unit}
                           </span>
                         </div>
                         <div>
                           <span className="text-gray-600">기존 재고:</span>
                           <span className="ml-2">{log.before_quantity} {log.unit}</span>
                         </div>
                         <div>
                           <span className="text-gray-600">최종 재고:</span>
                           <span className="ml-2 font-medium">{log.after_quantity} {log.unit}</span>
                         </div>
                         <div>
                           <span className="text-gray-600">주문 방식:</span>
                           <span className="ml-2">{getSourceTypeText(log.source_type)}</span>
                         </div>
                       </div>

                      {/* 단가 정보 */}
                      {log.unit_price && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">단가:</span> {log.unit_price.toLocaleString()}원
                        </div>
                      )}
                      
                      {/* 총액 정보 */}
                      {log.total_amount && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">총액:</span> {log.total_amount.toLocaleString()}원
                        </div>
                      )}

                      {/* 이상탐지 상세 정보 (페르소나 맞춤) */}
                      {log.is_anomaly && log.anomaly_type && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-800 text-base">
                              이상탐지 발생
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">유형:</span>
                              <span className="ml-2 text-red-700 font-semibold">
                                {getAnomalyTypeText(log.anomaly_type)}
                              </span>
                            </div>
                            {log.anomaly_score && (
                              <div>
                                <span className="font-medium text-gray-700">심각도:</span>
                                <span className="ml-2 text-orange-600 font-medium">
                                  {log.anomaly_score >= 0.9 ? '🚨 긴급' : 
                                   log.anomaly_score >= 0.7 ? '⚠️ 주의' : '확인 필요'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}


                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {formatDate(log.created_at)}
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


    </div>
  )
}

export default InventoryLogsPage

