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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Plus, Edit, Trash2, Save, X, Fish } from "lucide-react"
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

  // 어종 목록 불러오기
  const fetchFishTypes = async () => {
    try {
      setLoading(true)
      console.log('🔄 어종 목록 로딩 시작...')
      const response = await fishTypeApi.getAll()
      console.log('✅ 어종 목록 로딩 성공:', response)
      // DRF ViewSet은 배열을 직접 반환하므로 response.data를 직접 사용
      setFishTypes(response.data || [])
    } catch (error) {
      console.error('어종 목록 불러오기 실패:', error)
      toast.error('어종 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFishTypes()
  }, [])

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
      console.error('어종 추가 실패:', error)
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
      console.error('어종 수정 실패:', error)
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
      console.error('어종 삭제 실패:', error)
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
            <p className="text-sm sm:text-base text-gray-600 mt-1">수산물 어종 데이터 등록 및 관리</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            새 어종 추가
          </Button>
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

        {/* 어종 목록 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>등록된 어종 목록 ({fishTypes.length}개)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">번호</TableHead>
                    <TableHead className="font-semibold text-gray-900">어종명</TableHead>
                    <TableHead className="font-semibold text-gray-900">단위</TableHead>
                    <TableHead className="font-semibold text-gray-900">별칭</TableHead>
                    <TableHead className="font-semibold text-gray-900">등록일</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>어종 목록을 불러오는 중입니다...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : fishTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        등록된 어종이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fishTypes.map((fishType, index) => (
                      <TableRow key={fishType.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {fishType.name}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {fishType.unit}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {fishType.aliases || "-"}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {fishType.created_at 
                            ? new Date(fishType.created_at).toLocaleDateString('ko-KR')
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(fishType)}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(fishType.id, fishType.name)}
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FishItemForm; 