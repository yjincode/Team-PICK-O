/**
 * 거래처 목록 페이지
 * 거래처 정보를 조회하고 관리하는 페이지입니다
 */
"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Search, Plus, Phone, Mail, Eye, Edit } from "lucide-react"
import axios from "axios"
import { useAuth } from "../../contexts/AuthContext";


// 거래처 데이터 타입 정의
interface Business {
  id: number;
  business_name: string;
  phone_number: string;
  address?: string;
  // 추가 정보 (실제로는 별도 API에서 가져올 예정)
  unpaid_amount?: number;
  status?: string;
  last_order_date?: string;
}

// 목업 데이터 (실제로는 API에서 가져올 예정)
const mockBusinesses: Business[] = [
  {
    id: 1,
    business_name: "동해수산",
    phone_number: "010-1234-5678",
    address: "강원도 동해시",
    unpaid_amount: 2400000,
    status: "정상",
    last_order_date: "2024-01-30",
  },
  {
    id: 2,
    business_name: "바다마트",
    phone_number: "010-2345-6789",
    address: "부산시 해운대구",
    unpaid_amount: 0,
    status: "정상",
    last_order_date: "2024-01-29",
  },
  {
    id: 3,
    business_name: "해양식품",
    phone_number: "010-3456-7890",
    address: "인천시 연수구",
    unpaid_amount: 1800000,
    status: "연체",
    last_order_date: "2024-01-25",
  },
  {
    id: 4,
    business_name: "신선수산",
    phone_number: "010-4567-8901",
    address: "경기도 시흥시",
    unpaid_amount: 3200000,
    status: "연체",
    last_order_date: "2024-01-20",
  },
]

const CustomerList: React.FC = () => {
  const { userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)


  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newAddress, setNewAddress] = useState("")
  
  const handleRegister = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.post("http://localhost:8000/api/v1/business/customers/", {
        business_name: newName,
        phone_number: newPhone,
        address: newAddress,
        user: userData?.id, // user id 추가
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },}
      )
      console.log("등록 성공:", response.data)
      setIsModalOpen(false)
      // 새로고침 또는 데이터 다시 불러오기 로직 필요
    } catch (error) {
      const err = error as any;
      console.error("등록 실패:", err.response?.data || error);
    }
  }
  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 bg-light-blue-gray min-h-screen">
       {/* 모달 */}
      {isModalOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
          <h2 className="text-xl font-bold mb-4">새 거래처 등록</h2>
          <div className="space-y-3">
            <Input placeholder="고객명" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="전화번호" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Input placeholder="주소" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>취소</Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleRegister}>등록</Button>
          </div>
        </div>
      </div>
    )}
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">거래처 리스트</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">거래처 정보 및 관리</p>
        </div>
        <Button className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />새 거래처 등록
        </Button>
      </div>

      {/* 검색 섹션 */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="거래처명, 전화번호로 검색..."
                className="pl-10 bg-white border-gray-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="flex-shrink-0">검색</Button>
          </div>
        </CardContent>
      </Card>

      {/* 거래처 목록 */}
      <div className="space-y-4">
        {mockBusinesses.map((business) => (
          <Card key={business.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{business.business_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <Phone className="inline h-3 w-3 mr-1" />
                    {business.phone_number}
                  </p>
                  {business.address && (
                    <p className="text-sm text-gray-600">{business.address}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-end sm:items-center">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">미수금</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(business.unpaid_amount || 0)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />상세
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />수정
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default CustomerList; 