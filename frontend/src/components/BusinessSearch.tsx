/**
 * 거래처 검색 컴포넌트
 * 거래처명이나 전화번호로 거래처를 검색할 수 있습니다
 */
import React, { useState, useEffect } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Search, User, Phone, Check } from "lucide-react"
import { formatPhoneNumber } from "../utils/phoneFormatter"

interface Business {
  id: number;
  business_name: string;
  phone_number: string;
  address?: string;
  memo?: string;
}

interface BusinessSearchProps {
  onSelect: (business: Business) => void;
  onClose: () => void;
}

// 목업 거래처 데이터 (실제로는 API에서 가져올 예정)
const mockBusinesses: Business[] = [
  {
    id: 1,
    business_name: "동해수산",
    phone_number: "010-1234-5678",
    address: "부산시 해운대구",
    memo: "정기 거래처"
  },
  {
    id: 2,
    business_name: "바다마트",
    phone_number: "010-2345-6789",
    address: "부산시 동래구",
    memo: "신규 거래처"
  },
  {
    id: 3,
    business_name: "해양식품",
    phone_number: "010-3456-7890",
    address: "부산시 수영구",
    memo: "대량 주문"
  },
  {
    id: 4,
    business_name: "서해수산",
    phone_number: "010-4567-8901",
    address: "인천시 연수구",
    memo: "정기 거래처"
  },
  {
    id: 5,
    business_name: "남해어장",
    phone_number: "010-5678-9012",
    address: "경남 통영시",
    memo: "신규 거래처"
  }
]

const BusinessSearch: React.FC<BusinessSearchProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)

  // 검색어에 따른 거래처 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBusinesses(mockBusinesses)
      return
    }

    const filtered = mockBusinesses.filter(business => 
      business.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.phone_number.includes(searchTerm) ||
      business.address?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredBusinesses(filtered)
  }, [searchTerm])

  const handleSelect = (business: Business) => {
    setSelectedBusiness(business)
  }

  const handleConfirm = () => {
    if (selectedBusiness) {
      onSelect(selectedBusiness)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">거래처 검색</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* 검색 입력 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="거래처명, 전화번호, 주소로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 거래처 목록 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredBusinesses.map((business) => (
              <div
                key={business.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedBusiness?.id === business.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleSelect(business)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{business.business_name}</span>
                      {selectedBusiness?.id === business.id && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{formatPhoneNumber(business.phone_number)}</span>
                    </div>
                    {business.address && (
                      <div className="text-sm text-gray-500 mt-1">
                        📍 {business.address}
                      </div>
                    )}
                    {business.memo && (
                      <div className="text-sm text-gray-500 mt-1">
                        📝 {business.memo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 선택된 거래처 정보 */}
          {selectedBusiness && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">선택된 거래처</h3>
              <div className="text-sm text-blue-800">
                <div><strong>거래처명:</strong> {selectedBusiness.business_name}</div>
                <div><strong>연락처:</strong> {formatPhoneNumber(selectedBusiness.phone_number)}</div>
                {selectedBusiness.address && (
                  <div><strong>주소:</strong> {selectedBusiness.address}</div>
                )}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedBusiness}
            >
              선택
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default BusinessSearch 