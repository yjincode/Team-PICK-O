/**
 * 어종 재고 목록 페이지
 * 어류 재고 현황을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Package, AlertTriangle, Plus, RefreshCw } from "lucide-react"
import AddInventoryModal from "../../components/modals/AddInventoryModal"
import toast from 'react-hot-toast'
import { inventoryApi } from '../../lib/api'

// 어종 재고 데이터 타입 정의 (백엔드 API에 맞춰 수정)
interface FishStock {
  id: number;
  fish_type_name: string;
  stock_quantity: number;
  unit: string;
  status: string;
  updated_at: string;
}

// 상태 매핑 함수
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'registered': '등록됨',
    'normal': '정상',
    'low': '부족',
    'abnormal': '이상'
  }
  return statusMap[status] || status
}

// 상태에 따른 배지 variant 매핑
const getStatusVariant = (status: string) => {
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'registered': 'outline',
    'normal': 'default',
    'low': 'destructive', 
    'abnormal': 'secondary'
  }
  return variantMap[status] || 'outline'
}

const FishStockList: React.FC = () => {
  const [inventories, setInventories] = useState<FishStock[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // 재고 목록 불러오기
  const loadInventories = async () => {
    setLoading(true)
    try {
      const data = await inventoryApi.getAll()
      console.log('📦 재고 API 응답:', data)
      
      // pagination 응답 처리 (어종과 동일)
      let inventoryData: FishStock[] = []
      
      if (Array.isArray(data)) {
        // 직접 배열인 경우
        inventoryData = data
      } else if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
        // Django pagination 구조: {count, results, next, previous}
        inventoryData = data.results
        // count 속성이 있는 경우에만 출력
        if ('count' in data && typeof data.count === 'number') {
          console.log('📄 전체 재고 수:', data.count)
        }
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

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadInventories()
  }, [])

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
          <p className="text-sm sm:text-base text-gray-600 mt-1">재고 현황 및 관리</p>
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

      {/* 재고 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            재고 목록 로딩 중...
          </div>
        ) : !Array.isArray(inventories) || inventories.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {!Array.isArray(inventories) ? '데이터 로딩 중 문제가 발생했습니다.' : '등록된 재고가 없습니다. 재고를 추가해보세요.'}
          </div>
        ) : (
          inventories.map((stock) => (
          <Card key={stock.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg sm:text-xl">{stock.fish_type_name}</CardTitle>
                </div>
                {getStatusBadge(stock.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 재고 상세 정보 */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">재고 수량:</span>
                  <div className="font-semibold text-lg">{stock.stock_quantity} {stock.unit}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>상태: {getStatusText(stock.status)}</p>
                <p>최근 업데이트: {formatDate(stock.updated_at)}</p>
              </div>
              {stock.status === "low" && (
                <div className="flex items-center space-x-2 text-orange-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>발주 필요</span>
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
        ))
        )}
      </div>

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