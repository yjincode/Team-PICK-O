/**
 * 거래처 검색 컴포넌트
 * 거래처명이나 전화번호로 거래처를 검색할 수 있습니다
 */
import React, { useState, useEffect } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Search, User, Phone, Check } from "lucide-react"
import type { Business } from "../types"
import { formatPhoneNumber } from "../utils/phoneFormatter";
import { businessApi, orderApi } from "../lib/api"

interface BusinessSearchProps {
  onSelect: (business: Business) => void;
  onClose: () => void;
}

const BusinessSearch: React.FC<BusinessSearchProps> = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(false)

  // 검색어에 따른 거래처 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBusinesses([])
      return
    }

    const fetchBusinesses = async () => {
      try {
        setLoading(true)
        const response = await businessApi.getAll({ page: 1, page_size: 20 })
        // 서버에서 필터링이 안 된 경우 프론트에서 검색어 필터
        const filtered = response.results.filter((b) =>
          b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.phone_number.includes(searchTerm) ||
          b.address?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredBusinesses(filtered)
      } catch (err) {
        setFilteredBusinesses([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchBusinesses, 300) // 0.3초 디바운스
    return () => clearTimeout(debounce)
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


{/* 검색 결과 */}
<div className="space-y-2 max-h-96 overflow-y-auto">
            {loading && <div className="text-gray-500 text-center py-4">검색 중...</div>}

            {!loading && filteredBusinesses.length === 0 && searchTerm && (
              <div className="text-center text-gray-500 py-4">검색 결과가 없습니다.</div>
            )}

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
                      <div className="text-sm text-gray-500 mt-1">📍 {business.address}</div>
                    )}
                    {business.memo && (
                      <div className="text-sm text-gray-500 mt-1">📝 {business.memo}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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