/**
 * 어종 정보 관리 페이지
 * fish_registry 테이블의 어종 정보를 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { Plus, Edit, Trash2, Save, X, Fish, Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { fishTypeApi } from "../../lib/api"
import toast from 'react-hot-toast'

// 어종 데이터 타입 (backend fish_registry 모델과 일치)
interface FishType {
  id: number;
  name: string;
  aliases?: string;
  unit: string;
  notes?: string;
  created_at?: string;
}

// 폼 데이터 타입
interface FishFormData {
  name: string;
  aliases: string;
  unit: string;
  notes: string;
}

const FishItemForm: React.FC = () => {
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FishFormData>({
    name: "",
    aliases: "",
    unit: "박스",
    notes: "",
  })

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [unitFilter, setUnitFilter] = useState<string>('all')

  // 필터링된 데이터
  const [filteredFishTypes, setFilteredFishTypes] = useState<FishType[]>([])
  const [totalPages, setTotalPages] = useState(0)

  // 어종 목록 불러오기
  const fetchFishTypes = async () => {
    try {
      setLoading(true)
      const response = await fishTypeApi.getAll()
      // DRF ViewSet은 배열을 직접 반환하므로 response.data를 직접 사용
      setFishTypes(response.data || [])
    } catch (error) {
      toast.error('어종 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFishTypes()
  }, [])

  // 필터링 처리 (페이지는 제외)
  useEffect(() => {
    
    let filtered = [...fishTypes]
    
    // 검색 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(fishType => 
        fishType.name.toLowerCase().includes(term) ||
        (fishType.aliases && fishType.aliases.toLowerCase().includes(term))
      )
    }
    
    // 단위 필터링
    if (unitFilter !== 'all') {
      const beforeFilter = filtered.length
      filtered = filtered.filter(fishType => fishType.unit === unitFilter)
    }
    
    setFilteredFishTypes(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }, [fishTypes, searchTerm, unitFilter])

  // 필터가 변경될 때 페이지를 1로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, unitFilter])

  // 현재 페이지의 데이터 계산
  const getCurrentPageData = (): FishType[] => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredFishTypes.slice(startIndex, endIndex)
  }

  const currentPageData = getCurrentPageData()

  // 사용 가능한 단위 목록 추출
  const availableUnits = Array.from(new Set(fishTypes.map(fish => fish.unit)))
  
  // 디버깅: 사용 가능한 단위 목록 로그
  useEffect(() => {
  }, [fishTypes, availableUnits])

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: "",
      aliases: "",
      unit: "박스",
      notes: "",
    })
    setEditingId(null)
    setShowForm(false)
  }

  // 새 어종 추가
  const handleCreate = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('어종명을 입력해주세요.')
        return
      }

      await fishTypeApi.create(formData)
      toast.success('어종이 추가되었습니다.')
      resetForm()
      fetchFishTypes()
    } catch (error) {
      toast.error('어종 추가에 실패했습니다.')
    }
  }

  // 어종 수정
  const handleUpdate = async () => {
    try {
      if (!editingId) return

      await fishTypeApi.update(editingId, formData)
      toast.success('어종 정보가 수정되었습니다.')
      resetForm()
      fetchFishTypes()
    } catch (error) {
      toast.error('어종 수정에 실패했습니다.')
    }
  }

  // 어종 삭제
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`'${name}' 어종을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await fishTypeApi.delete(id)
      toast.success('어종이 삭제되었습니다.')
      fetchFishTypes()
    } catch (error) {
      toast.error('어종 삭제에 실패했습니다.')
    }
  }

  // 편집 모드 시작
  const startEdit = (fishType: FishType) => {
    setFormData({
      name: fishType.name,
      aliases: fishType.aliases || "",
      unit: fishType.unit,
      notes: fishType.notes || "",
    })
    setEditingId(fishType.id)
    setShowForm(true)
  }

  // 폼 입력 핸들러
  const handleInputChange = (field: keyof FishFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">어종 정보 관리</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">수산물 어종 데이터 등록 및 관리 ({filteredFishTypes.length}건)</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchFishTypes}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button 
              onClick={() => setShowForm(true)} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              새 어종 추가
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* 어종 추가/수정 폼 */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="h-5 w-5" />
                {editingId ? '어종 정보 수정' : '새 어종 추가'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 어종명 */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    어종명 *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="예: 고등어"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* 단위 */}
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-medium text-gray-700">
                    단위 *
                  </Label>
                  <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="단위를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="박스">박스</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="마리">마리</SelectItem>
                      <SelectItem value="미터">미터</SelectItem>
                      <SelectItem value="포">포</SelectItem>
                      <SelectItem value="팩">팩</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 별칭 */}
                <div className="space-y-2">
                  <Label htmlFor="aliases" className="text-sm font-medium text-gray-700">
                    별칭
                  </Label>
                  <Input
                    id="aliases"
                    type="text"
                    placeholder="예: 참고등어, 삼치고등어 (쉼표로 구분)"
                    value={formData.aliases}
                    onChange={(e) => handleInputChange('aliases', e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* 설명 */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    설명/비고
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="어종에 대한 추가 설명을 입력하세요"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full"
                    rows={3}
                  />
                </div>
              </div>

              {/* 폼 버튼 */}
              <div className="flex items-center gap-2 mt-6">
                <Button 
                  onClick={editingId ? handleUpdate : handleCreate}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  {editingId ? '수정' : '추가'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={resetForm}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 검색 및 필터 바 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              검색 및 필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 검색 */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  어종명/별칭 검색
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="어종명이나 별칭을 입력하세요..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 단위 필터 */}
              <div className="space-y-2">
                <Label htmlFor="unit-filter" className="text-sm font-medium text-gray-700">
                  단위별 필터
                </Label>
                <Select value={unitFilter} onValueChange={(value) => {
                  setUnitFilter(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체 단위" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 단위</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 필터 리셋 버튼 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  필터 초기화
                </Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setUnitFilter('all')
                    setCurrentPage(1)
                  }}
                  className="w-full"
                  disabled={searchTerm === '' && unitFilter === 'all'}
                >
                  <X className="h-4 w-4 mr-2" />
                  필터 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 어종 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              어종 목록 로딩 중...
            </div>
          ) : filteredFishTypes.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {searchTerm || unitFilter !== 'all' ? '검색 조건에 맞는 어종이 없습니다.' : '등록된 어종이 없습니다. 어종을 추가해보세요.'}
            </div>
          ) : (
            currentPageData.map((fishType) => (
              <Card key={fishType.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fish className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg text-blue-600">
                        {fishType.name}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {fishType.unit}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* 별칭 */}
                  {fishType.aliases && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">별칭: </span>
                      <span className="text-gray-600">{fishType.aliases}</span>
                    </div>
                  )}
                  
                  {/* 설명 */}
                  {fishType.notes && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">설명: </span>
                      <span className="text-gray-600">{fishType.notes}</span>
                    </div>
                  )}
                  
                  {/* 등록일 */}
                  <div className="text-sm text-gray-500">
                    등록일: {fishType.created_at 
                      ? new Date(fishType.created_at).toLocaleDateString('ko-KR')
                      : "정보 없음"
                    }
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={() => startEdit(fishType)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(fishType.id, fishType.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {filteredFishTypes.length > 0 ? (
                    <>
                      {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredFishTypes.length)} / {filteredFishTypes.length}건
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
      </div>
    </div>
  )
}

export default FishItemForm; 