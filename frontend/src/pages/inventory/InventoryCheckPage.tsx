/**
 * 실사 내역 페이지
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { ClipboardCheck, RefreshCw, Search, CheckCircle } from "lucide-react"
import toast from 'react-hot-toast'
import InventoryCheckModal from "../../components/modals/InventoryCheckModal"

interface InventoryCheckItem {
  fish_type_id: number;
  inventory_id: number;
  fish_type_name: string;
  unit: string;
  current_stock: number;
  check_schedule: string;
  last_check_date: string | null;
  days_since_last_check: number;
  needs_check: boolean;
  priority: number;
}

interface InventoryCheckRecord {
  id: number;
  fish_type_name: string;
  before_quantity: number;
  after_quantity: number;
  difference: number;
  unit: string;
  checker: string;
  check_date: string;
  memo?: string;
}

const InventoryPage: React.FC = () => {
  const [checklist, setChecklist] = useState<InventoryCheckItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false)
  const [showAllItems, setShowAllItems] = useState(false)
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [checkerFilter, setCheckerFilter] = useState<string>('all')
  
  // 필터링된 데이터
  const [filteredRecords, setFilteredRecords] = useState<InventoryCheckRecord[]>([])
  const [totalPages, setTotalPages] = useState(0)
  
  // 실사 입력 모달 상태
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false)
  const [selectedInventory, setSelectedInventory] = useState<InventoryCheckItem | null>(null)

       const loadChecklist = async () => {
     try {
       setChecklistLoading(true)
       const response = await fetch('/api/v1/inventory/checklist/', {
         headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
       })
       
       if (response.ok) {
         const data = await response.json()
         setChecklist(data.checklist || [])
       }
     } catch (error) {
       // 조용히 처리
     } finally {
       setChecklistLoading(false)
     }
   }

   const loadCheckRecords = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      if (dateFilter) params.append('date', dateFilter)
      if (checkerFilter !== 'all') params.append('checker', checkerFilter)
      params.append('page', currentPage.toString())
      params.append('per_page', itemsPerPage.toString())
      
      const response = await fetch(`/api/v1/inventory/check-records/?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFilteredRecords(data.records || [])
        setTotalPages(data.total_pages || 0)
      } else {
        toast.error('실사 내역을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      toast.error('실사 내역을 불러오는데 오류가 발생했습니다.')
    }
  }

     const handleCheckClick = (item: InventoryCheckItem) => {
     setSelectedInventory(item)
     setIsCheckModalOpen(true)
   }

   const handleCheckSuccess = () => {
     setIsCheckModalOpen(false)
     setSelectedInventory(null)
     loadChecklist()
     loadCheckRecords()
     toast.success('실사 입력이 완료되었습니다!')
   }

   const handleShowMore = () => {
     setShowAllItems(true)
   }

     const getFishIcon = (fishName: string) => {
     const iconMap: Record<string, string> = {
       '고등어': '🐟', '오징어': '🦑', '방어': '🐠', '굴': '🦪',
       '새우': '🦐', '갈치': '🐟', '전복': '🐚', '홍합': '🦪', '대게': '🦀'
     }
     return iconMap[fishName] || '🐟'
   }


     useEffect(() => {
     loadCheckRecords()
   }, [searchTerm, dateFilter, checkerFilter, currentPage])

   useEffect(() => {
     loadChecklist()
     loadCheckRecords()
   }, [])
  
     const getCurrentPageData = (): InventoryCheckRecord[] => {
     const startIndex = (currentPage - 1) * itemsPerPage
     const endIndex = startIndex + itemsPerPage
     return filteredRecords.slice(startIndex, endIndex)
   }
   
   const currentPageData = getCurrentPageData()

   const formatDate = (dateString: string): string => {
     return new Date(dateString).toLocaleDateString('ko-KR')
   }

  return (
    <div className="space-y-6">
             {/* 실사 체크리스트 */}
       <Card>
         <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
               <ClipboardCheck className="h-5 w-5 text-blue-600" />
               오늘 실사할 항목
               <Badge variant="outline" className="text-sm">
                 {checklist.filter(item => item.needs_check).length}건
               </Badge>
             </CardTitle>
         </CardHeader>
        <CardContent>
          {checklistLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">체크리스트 로딩 중...</p>
            </div>
          ) : checklist.length > 0 ? (
            <div className="space-y-3">
              {/* 접기 상태일 때 간단 요약 */}
              {!isChecklistExpanded && (
                <div className="text-center py-4">
                                     <div className="flex items-center justify-center space-x-2 mb-2">
                     <ClipboardCheck className="h-5 w-5 text-blue-500" />
                     <span className="text-gray-700">
                       오늘 실사해야 할 항목이 {checklist.filter(item => item.needs_check).length}건 있습니다
                     </span>
                   </div>
                                     <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setIsChecklistExpanded(true)}
                     className="text-blue-600 border-blue-200 hover:bg-blue-50"
                   >
                     목록 보기 ▼
                   </Button>
                </div>
              )}

              {/* 펼치기 상태일 때 전체 목록 */}
              {isChecklistExpanded && (
                <>
                                     {checklist
                     .filter(item => item.needs_check)
                     .sort((a, b) => b.priority - a.priority)
                     .slice(0, showAllItems ? undefined : 5) // 더보기 상태에 따라 표시 개수 조정
                     .map((item, index) => (
                                             <div key={item.fish_type_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                         <div className="flex items-center space-x-3">
                           <span className="text-2xl">{getFishIcon(item.fish_type_name)}</span>
                           <div>
                             <p className="font-medium text-gray-900">{item.fish_type_name}</p>
                             <p className="text-sm text-gray-600">
                               현재: {item.current_stock}{item.unit} | 
                               {item.check_schedule === 'today' ? ' 오늘 실사 필요' : 
                                item.check_schedule === 'weekly_twice' ? ' 주 2회 실사 필요' :
                                item.check_schedule === 'weekly_once' ? ' 주 1회 실사 필요' : ' 10일마다 실사 필요'}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Badge variant="destructive" className="text-xs">
                             실사 필요
                           </Badge>
                           <Button
                             size="sm"
                             variant="outline"
                             className="text-blue-600 border-blue-200 hover:bg-blue-50"
                             onClick={() => handleCheckClick(item)}
                           >
                             실사 입력
                           </Button>
                         </div>
                       </div>
                    ))}
                  
                                     {/* 더보기 버튼 */}
                   {checklist.filter(item => item.needs_check).length > 5 && !showAllItems && (
                     <div className="text-center py-2">
                       <Button
                         variant="outline"
                         size="sm"
                         className="text-gray-600 border-gray-300 hover:bg-gray-50"
                         onClick={handleShowMore}
                       >
                         더보기 ▼ ({checklist.filter(item => item.needs_check).length - 5}개)
                       </Button>
                     </div>
                   )}

                                     {/* 접기 버튼 */}
                   <div className="text-center pt-2">
                     <Button
                       variant="outline"
                       size="sm"
                                                onClick={() => {
                           setIsChecklistExpanded(false)
                           setShowAllItems(false)
                         }}
                       className="text-gray-500 border-gray-200 hover:bg-gray-50"
                     >
                       간단 보기 ▲
                     </Button>
                   </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-gray-600 mt-2">오늘 실사할 항목이 없습니다!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 실사 내역 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            실사 내역 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 어종명 검색 */}
            <div className="space-y-2">
              <Label htmlFor="check-search" className="text-sm font-medium text-gray-700">
                어종명 검색
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="check-search"
                  type="text"
                  placeholder="어종명을 입력하세요..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 날짜 필터 */}
            <div className="space-y-2">
              <Label htmlFor="check-date" className="text-sm font-medium text-gray-700">
                실사 날짜
              </Label>
              <Input
                id="check-date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
              />
            </div>

            {/* 실사자 필터 */}
            <div className="space-y-2">
              <Label htmlFor="check-person" className="text-sm font-medium text-gray-700">
                실사자
              </Label>
              <Select value={checkerFilter} onValueChange={setCheckerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 실사자" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 실사자</SelectItem>
                  <SelectItem value="공용">공용</SelectItem>
                  <SelectItem value="김철수">김철수</SelectItem>
                  <SelectItem value="이영희">이영희</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 실사 내역 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5" />
            실사 내역 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
                         {currentPageData.map((check) => (
               <div key={check.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                 <div className="flex items-center space-x-4">
                   <span className="text-2xl">{getFishIcon(check.fish_type_name)}</span>
                   <div>
                     <h4 className="font-medium text-gray-900">{check.fish_type_name}</h4>
                     <p className="text-sm text-gray-600">
                       {check.before_quantity} → {check.after_quantity} {check.unit}
                       {check.difference !== 0 && (
                         <span className={`ml-2 ${check.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                           ({check.difference > 0 ? '+' : ''}{check.difference})
                         </span>
                       )}
                     </p>
                     <p className="text-xs text-gray-500">
                       실사자: {check.checker} | {formatDate(check.check_date)}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                   {check.memo && check.memo.trim() !== '' && (
                     <p className="text-sm text-gray-700 mb-1">{check.memo}</p>
                   )}
                   <Badge variant={check.difference === 0 ? "default" : "destructive"}>
                     {check.difference === 0 ? '정상' : '차이 발생'}
                   </Badge>
                 </div>
               </div>
             ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

             {/* 실사 입력 모달 */}
       <InventoryCheckModal
         open={isCheckModalOpen}
         onOpenChange={setIsCheckModalOpen}
         onSuccess={handleCheckSuccess}
         inventory={selectedInventory ? {
           id: selectedInventory.inventory_id || selectedInventory.fish_type_id,
           fish_type_name: selectedInventory.fish_type_name,
           stock_quantity: selectedInventory.current_stock,
           unit: selectedInventory.unit
         } : undefined}
       />
    </div>
  )
}

export default InventoryPage

