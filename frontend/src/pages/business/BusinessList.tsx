/**
 * 거래처 목록 페이지
 * 거래처 정보를 조회하고 관리하는 페이지입니다
 */
"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, Plus, Phone, Mail, Eye, Edit, Loader2 } from "lucide-react"
import { businessApi } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"
import toast, { Toaster } from 'react-hot-toast';


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

// // 목업 데이터 (실제로는 API에서 가져올 예정)
// const mockBusinesses: Business[] = [
//   {
//     id: 1,
//     business_name: "동해수산",
//     phone_number: "010-1234-5678",
//     address: "강원도 동해시",
//     unpaid_amount: 2400000,
//     status: "정상",
//     last_order_date: "2024-01-30",
//   },
//   {
//     id: 2,
//     business_name: "바다마트",
//     phone_number: "010-2345-6789",
//     address: "부산시 해운대구",
//     unpaid_amount: 0,
//     status: "정상",
//     last_order_date: "2024-01-29",
//   },
//   {
//     id: 3,
//     business_name: "해양식품",
//     phone_number: "010-3456-7890",
//     address: "인천시 연수구",
//     unpaid_amount: 1800000,
//     status: "연체",
//     last_order_date: "2024-01-25",
//   },
//   {
//     id: 4,
//     business_name: "신선수산",
//     phone_number: "010-4567-8901",
//     address: "경기도 시흥시",
//     unpaid_amount: 3200000,
//     status: "연체",
//     last_order_date: "2024-01-20",
//   },
// ]

const BusinessList: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  const { userData, user, isAuthenticated, loading } = useAuth();

  // 거래처 목록을 가져오는 함수 (재사용 가능)
  const fetchBusinesses = async () => {
    if (isLoadingBusinesses) {
      console.log('⏸️ 이미 로딩 중이므로 API 호출 생략');
      return;
    }

    try {
      console.log('🔄 거래처 목록 API 호출 시작');
      setIsLoadingBusinesses(true);
      
      const res = await businessApi.getAll();
      console.log("✅ API 응답:", res);
      
      // res.data가 배열인지 확인하고 설정
      if (Array.isArray(res.data)) {
        setBusinesses(res.data);
      } else if (Array.isArray(res)) {
        setBusinesses(res);
      } else {
        console.error("예상치 못한 응답 구조:", res);
        setBusinesses([]);
      }
    } catch (error: any) {
      console.error("❌ 거래처 목록 불러오기 실패:", error);
      setBusinesses([]);
    } finally {
      console.log('🏁 API 호출 완료, 로딩 상태 해제');
      setIsLoadingBusinesses(false);
    }
  };

  // AuthContext 로딩이 완료되면 API 호출 (인증 여부와 관계없이)
  useEffect(() => {
    console.log('🔍 useEffect 실행됨:', {
      loading,
      isAuthenticated,
      user: !!user,
      userData: !!userData,
      hasInitialized
    });

    // AuthContext 로딩 중이면 대기
    if (loading) {
      console.log('⏳ AuthContext 로딩 중, API 호출 대기...');
      return;
    }

    // 이미 초기화했으면 더 이상 호출하지 않음
    if (hasInitialized) {
      console.log('✅ 이미 초기화 완료됨');
      return;
    }

    console.log('🚀 거래처 목록 로드 (인증 상태와 관계없이)');
    setHasInitialized(true);
    fetchBusinesses();
  }, [loading, hasInitialized]); // 인증 상태 의존성 제거

  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isRegistering, setIsRegistering] = useState<boolean>(false)

  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newAddress, setNewAddress] = useState("")
  
  const handleRegister = async () => {
    // 입력 검증
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('거래처명과 전화번호는 필수 항목입니다.');
      return;
    }

    // 거래처 등록은 인증이 필요한 기능
    if (!isAuthenticated || !user || !userData) {
      toast.error('로그인이 필요한 기능입니다.');
      return;
    }

    try {
      setIsRegistering(true);
      
      // 비동기 등록 처리
      const response = await businessApi.create({
        business_name: newName,
        phone_number: newPhone,
        address: newAddress,
      });
      
      console.log("등록 성공:", response.data);
      
      // 성공 토스트
      toast.success(`'${newName}' 거래처가 성공적으로 등록되었습니다!`, {
        duration: 3000,
      });
      
      // 폼 초기화
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      setIsModalOpen(false);
      
      // 목록 새로고침 (백그라운드에서)
      fetchBusinesses();
      
    } catch (error) {
      const err = error as any;
      console.error("등록 실패:", err.response?.data || error);

      const data = err.response?.data;

      let errorMessage = '거래처 등록에 실패했습니다.';
      // const errorMessage = err.response?.data?.message || '거래처 등록에 실패했습니다.';

      if (data?.phone_number.length < 9){
        errorMessage = data.phone_number[0];
      } else if (data?.message){
        errorMessage = data.message;
      }
      
      // 에러 토스트
      // const errorMessage = err.response?.data?.message || '거래처 등록에 실패했습니다.';
      toast.error(errorMessage, {
        duration: 4000,
      });
    } finally {
      setIsRegistering(false);
    }
  }
  // 금액 포맷팅 함수
  const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 bg-light-blue-gray min-h-screen">
       {/* 모달 */}
      {isModalOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
          {/* 로딩 오버레이 */}
          {isRegistering && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600 font-medium">거래처를 등록하는 중...</p>
              </div>
            </div>
          )}
          
          <h2 className="text-xl font-bold mb-4">새 거래처 등록</h2>
          <div className="space-y-3">
            <div>
              <Input 
                placeholder="거래처명 *" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className={!newName.trim() && newName !== "" ? "border-red-300" : ""}
                disabled={isRegistering}
              />
            </div>
            <div>
              <Input 
                placeholder="전화번호 *" 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)}
                className={!newPhone.trim() && newPhone !== "" ? "border-red-300" : ""}
                disabled={isRegistering}
              />
            </div>
            <div>
              <Input 
                placeholder="주소 (선택사항)" 
                value={newAddress} 
                onChange={(e) => setNewAddress(e.target.value)}
                disabled={isRegistering}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              disabled={isRegistering}
            >
              취소
            </Button>
            <Button 
              className="bg-blue-500 hover:bg-blue-600" 
              onClick={handleRegister}
              disabled={isRegistering}
            >
              등록
            </Button>
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
        <Button 
          className="bg-accent-blue hover:bg-accent-blue/90 w-full sm:w-auto"
          onClick={() => setIsModalOpen(true)}
          disabled={!isAuthenticated || !user || !userData}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isAuthenticated && user && userData ? '새 거래처 등록' : '로그인 후 이용 가능'}
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
        {isLoadingBusinesses ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-gray-500 text-sm">거래처 목록을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {businesses && businesses.length > 0 ? (
              businesses.map((business) => (
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
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                거래처가 없습니다.
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 토스트 메시지 컨테이너 */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}

export default BusinessList; 