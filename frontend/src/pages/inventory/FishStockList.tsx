/**
 * 어종 재고 목록 페이지
 * 어류 재고 현황을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Package, AlertTriangle, Plus, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import AddInventoryModal from "../../components/modals/AddInventoryModal"
import toast from 'react-hot-toast'
import { inventoryApi } from '../../lib/api'

// 어종 재고 데이터 타입 정의 (단순화)
interface FishStock {
  id: number;
  fish_type_id: number;
  fish_type_name: string;
  stock_quantity: number;   // 재고 수량
  ordered_quantity?: number; // 주문 수량 (기본값 0)
  unit: string;
  status: string;
  updated_at: string;       
}

// 상태 계산 함수 (재고수량과 주문수량 비교)
const calculateStockStatus = (stock: FishStock) => {
  const stockQuantity = stock.stock_quantity
  const orderedQuantity = stock.ordered_quantity || 0
  
  // 주문수량이 재고수량보다 많으면 부족
  if (orderedQuantity > stockQuantity) return 'insufficient'
  
  // 재고가 아예 없으면 부족
  if (stockQuantity <= 0) return 'insufficient'
  
  // 재고가 적으면 주문필요
  if (stockQuantity <= 10) return 'low'
  
  return 'normal' // 정상
}

// 상태 매핑 함수
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'registered': '등록됨',
    'normal': '정상',
    'low': '주문필요',
    'insufficient': '부족',
    'abnormal': '이상'
  }
  return statusMap[status] || status
}

// 상태에 따른 배지 variant 매핑
const getStatusVariant = (status: string) => {
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'registered': 'outline',
    'normal': 'default',
    'low': 'secondary',
    'insufficient': 'destructive', 
    'abnormal': 'secondary'
  }
  return variantMap[status] || 'outline'
}

const FishStockList: React.FC = () => {
  const [inventories, setInventories] = useState<FishStock[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // 필터링된 데이터
  const [filteredInventories, setFilteredInventories] = useState<FishStock[]>([])
  const [totalPages, setTotalPages] = useState(0)

  // 재고 목록 불러오기
  const loadInventories = async () => {
    setLoading(true)
    try {
      // 검색과 상태 필터를 API 파라미터로 전달
      const params: any = {}
      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      const data = await inventoryApi.getAll(params)
      console.log('📦 재고 API 응답:', data)
      
      // 단순한 응답 처리
      let inventoryData: FishStock[] = []
      
      if (Array.isArray(data)) {
        inventoryData = data
      } else if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
        inventoryData = data.results
      }
      
      console.log('📊 로드된 재고 개수:', inventoryData.length)
      setInventories(inventoryData)
      
    } catch (error: any) {
      console.error('재고 목록 로딩 에러:', error)
      setInventories([])
      toast.error('재고 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 필터링 및 페이지네이션 처리
  useEffect(() => {
    let filtered = [...inventories]
    
    // 클라이언트 사이드에서 추가 필터링 (백엔드에서 처리되지 않은 경우를 위해)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.fish_type_name.toLowerCase().includes(term)
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const calculatedStatus = calculateStockStatus(item)
        return calculatedStatus === statusFilter || item.status === statusFilter
      })
    }
    
    setFilteredInventories(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    
    // 현재 페이지가 총 페이지 수를 초과하면 첫 페이지로 이동
    if (currentPage > Math.ceil(filtered.length / itemsPerPage)) {
      setCurrentPage(1)
    }
  }, [inventories, searchTerm, statusFilter, currentPage])

  // 컴포넌트 마운트 시 및 필터 변경 시 데이터 로드
  useEffect(() => {
    loadInventories()
  }, [searchTerm, statusFilter])
  
  // 현재 페이지의 데이터 계산
  const getCurrentPageData = (): FishStock[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredInventories.slice(startIndex, endIndex)
  }
  
  const currentPageData = getCurrentPageData()

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  // 재고 상태에 따른 배지 색상 결정
  const getStatusBadge = (status: string) => {
    const statusText = getStatusText(status)
    const variant = getStatusVariant(status)
    return <Badge variant={variant}>{statusText}</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">어종 재고</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">재고 현황 및 관리 ({filteredInventories.length}건)</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => loadInventories()}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button 
            className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />재고 추가
          </Button>
        </div>
      </div>

      {/* 검색 및 필터 바 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            검색 및 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 검색 */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                어종명 검색
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="어종명을 입력하세요..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 상태 필터 */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                재고 상태
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="registered">등록됨</SelectItem>
                  <SelectItem value="normal">정상</SelectItem>
                  <SelectItem value="low">주문필요</SelectItem>
                  <SelectItem value="insufficient">부족</SelectItem>
                  <SelectItem value="abnormal">이상</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 재고 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            재고 목록 로딩 중...
          </div>
        ) : filteredInventories.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'all' ? '검색 조건에 맞는 재고가 없습니다.' : '등록된 재고가 없습니다. 재고를 추가해보세요.'}
          </div>
        ) : (
          currentPageData.map((stock) => {
            const currentStatus = calculateStockStatus(stock)
            return (
          <Card key={stock.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg sm:text-xl">{stock.fish_type_name}</CardTitle>
                </div>
                {getStatusBadge(currentStatus)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 재고 수량 정보 */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 font-semibold text-xl">{stock.stock_quantity}</div>
                  <div className="text-sm text-blue-600">재고 수량</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-orange-600 font-semibold text-xl">{stock.ordered_quantity || 0}</div>
                  <div className="text-sm text-orange-600">주문 수량</div>
                </div>
              </div>
              
              {/* 단위 정보 */}
              <div className="text-sm text-gray-600">
                <span>단위: {stock.unit}</span>
              </div>
              
              {/* 상태 정보 */}
              <div className="text-sm text-gray-600">
                <p>상태: {getStatusText(currentStatus)}</p>
                <p>최근 업데이트: {formatDate(stock.updated_at)}</p>
              </div>
              
              {/* 경고 메시지 */}
              {currentStatus === 'insufficient' && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {(stock.ordered_quantity || 0) > stock.stock_quantity 
                      ? `주문량 초과 - ${(stock.ordered_quantity || 0) - stock.stock_quantity}${stock.unit} 부족`
                      : '재고 없음 - 즉시 발주 필요'
                    }
                  </span>
                </div>
              )}
              {currentStatus === 'low' && (
                <div className="flex items-center space-x-2 text-orange-600 text-sm bg-orange-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>재고 부족 - 발주 권장</span>
                </div>
              )}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  상세보기
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  수정
                </Button>
              </div>
            </CardContent>
          </Card>
            )
          })
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {filteredInventories.length > 0 ? (
                  <>
                    {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredInventories.length)} / {filteredInventories.length}건
                  </>
                ) : '0건'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                
                {(() => {
                  // 페이지 번호를 최대 5개까지만 표시
                  const maxVisiblePages = 5
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                  
                  // 끝에서부터 계산해서 시작 페이지 조정
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1)
                  }
                  
                  const pages = []
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i)
                  }
                  
                  return pages.map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))
                })()}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 재고 추가 모달 */}
      <AddInventoryModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={loadInventories}
      />
    </div>
  )
}

export default FishStockList; 