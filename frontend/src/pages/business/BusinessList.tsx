/**
 * 거래처 목록 페이지
 * 거래처 정보를 조회하고 관리하는 페이지입니다
 */
"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, Plus, Phone, Eye, Edit, Loader2 } from "lucide-react"
import { businessApi, orderApi, paymentsApi } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"
import toast, { Toaster } from 'react-hot-toast';
import { useKakaoPostcode } from "../../hooks/useKakaoPostcode";
import { KakaoAddress } from "../../types/kakao";
import { formatPhoneNumber } from "../../utils/phoneFormatter";
import { OrderListItem, Payment } from "../../types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../components/ui/pagination";


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

const BusinessList: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); // 고정값, 필요시 변경 가능
  const [count, setCount] = useState(0); // 전체 개수
  const [unpaidByBusinessId, setUnpaidByBusinessId] = useState<Record<number, number>>({});

  const { userData, user, isAuthenticated, loading } = useAuth();

  // 거래처 목록을 가져오는 함수 (재사용 가능)
  const fetchBusinesses = async (pageNum = page) => {
    if (isLoadingBusinesses) {
      console.log('⏸️ 이미 로딩 중이므로 API 호출 생략');
      return;
    }
    try {
      console.log('🔄 거래처 목록 API 호출 시작 - 페이지:', pageNum);
      setIsLoadingBusinesses(true);
      const res = await businessApi.getAll({ page: pageNum, page_size: pageSize });
      console.log("✅ API 응답:", res);
      console.log("📊 응답 데이터 - count:", res.data?.count, "results 개수:", res.data?.results?.length);
      // 다양한 응답 구조에 대응
      let data: any = null;
      // 1. res가 바로 {count, results} 구조일 때
      if (res && Array.isArray((res as any).results)) {
        data = res as unknown as { results: Business[]; count: number };
      }
      // 2. res.data가 {count, results} 구조일 때
      else if (res.data && Array.isArray(res.data.results)) {
        data = res.data as unknown as { results: Business[]; count: number };
      }
      if (data) {
        setBusinesses(data.results);
        setCount(data.count || 0);
      } else if (Array.isArray(res.data)) {
        setBusinesses(res.data);
        setCount(res.data.length);
      } else if (Array.isArray(res)) {
        setBusinesses(res);
        setCount(res.length);
      } else {
        console.error("예상치 못한 응답 구조:", res);
        setBusinesses([]);
        setCount(0);
      }
    } catch (error: any) {
      console.error("❌ 거래처 목록 불러오기 실패:", error);
      setBusinesses([]);
      setCount(0);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // 주문 및 결제 불러와서 미수금 계산
  const fetchUnpaidStats = async () => {
    try {
      // 주문 목록 (여러 응답 형태 대응)
      const ordersRes = await orderApi.getAll();
      const anyOrdersRes: any = ordersRes as any;
      let orders: OrderListItem[] = [];
      if (Array.isArray(anyOrdersRes)) {
        orders = anyOrdersRes as OrderListItem[];
      } else if (Array.isArray(anyOrdersRes?.data)) {
        orders = anyOrdersRes.data as OrderListItem[];
      } else if (Array.isArray(anyOrdersRes?.results)) {
        orders = anyOrdersRes.results as OrderListItem[];
      } else if (Array.isArray(anyOrdersRes?.data?.results)) {
        orders = anyOrdersRes.data.results as OrderListItem[];
      }

      // 결제 목록 (엔드포인트 없으면 빈 배열 처리, 여러 응답 형태 대응)
      let payments: Payment[] = [];
      try {
        const paymentsRes = await paymentsApi.getAll();
        const anyPaymentsRes: any = paymentsRes as any;
        if (Array.isArray(anyPaymentsRes)) {
          payments = anyPaymentsRes as Payment[];
        } else if (Array.isArray(anyPaymentsRes?.data?.results)) {
          payments = anyPaymentsRes.data.results as Payment[];
        } else if (Array.isArray(anyPaymentsRes?.results)) {
          payments = anyPaymentsRes.results as Payment[];
        } else if (Array.isArray(anyPaymentsRes?.data)) {
          payments = anyPaymentsRes.data as Payment[];
        }
      } catch (e) {
        console.warn('결제 API 호출 실패:', e);
        payments = [];
      }

      const sumByBusiness: Record<number, { orders: number; payments: number }> = {};

      for (const o of orders) {
        const businessId = (o as any).business_id as number;
        if (!businessId) continue;
        if (!sumByBusiness[businessId]) sumByBusiness[businessId] = { orders: 0, payments: 0 };
        sumByBusiness[businessId].orders += Number((o as any).total_price || 0);
      }

      for (const p of payments) {
        const businessId = (p as any).business_id as number;
        if (!businessId) continue;
        if (!sumByBusiness[businessId]) sumByBusiness[businessId] = { orders: 0, payments: 0 };
        sumByBusiness[businessId].payments += Number((p as any).amount || 0);
      }

      const unpaid: Record<number, number> = {};
      Object.entries(sumByBusiness).forEach(([bizId, sums]) => {
        unpaid[Number(bizId)] = Math.max(0, (sums.orders || 0) - (sums.payments || 0));
      });

      setUnpaidByBusinessId(unpaid);
    } catch (e) {
      console.warn('미수금 계산 실패 (주문/결제 로드 실패):', e);
      setUnpaidByBusinessId({});
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
    fetchBusinesses(1); // 첫 페이지 로드
    fetchUnpaidStats(); // 초기 로드 시 미수금 계산
  }, [loading, hasInitialized]);

  // 페이지 변경 시 목록 새로고침
  useEffect(() => {
    if (hasInitialized) {
      fetchBusinesses(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isRegistering, setIsRegistering] = useState<boolean>(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null)
  const [isUpdating, setIsUpdating] = useState<boolean>(false)

  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const { openPostcode } = useKakaoPostcode({
    onComplete: (data: KakaoAddress) => {
      const fullAddress = data.roadAddress || data.jibunAddress;
      setNewAddress(fullAddress);
    }
  });

  // 수정 모달용 주소검색 훅
  const { openPostcode: openEditPostcode } = useKakaoPostcode({
    onComplete: (data: KakaoAddress) => {
      const fullAddress = data.roadAddress || data.jibunAddress;
      setEditingBusiness(prev => prev ? { ...prev, address: fullAddress } : null);
    }
  });

  // 수정 모달 열기
  const handleEditClick = (business: Business) => {
    setEditingBusiness(business);
    setIsEditModalOpen(true);
  };

  // 수정 처리
  const handleUpdate = async () => {
    if (!editingBusiness) return;

    // 입력 검증
    if (!editingBusiness.business_name.trim() || !editingBusiness.phone_number.trim()) {
      toast.error('거래처명과 전화번호는 필수 항목입니다.');
      return;
    }

    try {
      setIsUpdating(true);
      
      // 비동기 수정 처리
      const response = await businessApi.update(editingBusiness.id, {
        business_name: editingBusiness.business_name,
        phone_number: editingBusiness.phone_number,
        address: editingBusiness.address,
      });
      
      console.log("수정 성공:", response.data);
      
      // 성공 토스트
      toast.success(`'${editingBusiness.business_name}' 거래처가 성공적으로 수정되었습니다!`, {
        duration: 3000,
      });
      
      // 모달 닫기
      setIsEditModalOpen(false);
      setEditingBusiness(null);
      
      // 목록 새로고침 (백그라운드에서)
      fetchBusinesses(page);
      
    } catch (error) {
      const err = error as any;
      console.error("수정 실패:", err.response?.data || error);

      const data = err.response?.data;

      let errorMessage = '거래처 수정에 실패했습니다.';

      if (data?.phone_number && Array.isArray(data.phone_number) && data.phone_number.length > 0){
        errorMessage = data.phone_number[0];
      } else if (data?.message){
        errorMessage = data.message;
      }
      
      toast.error(errorMessage, {
        duration: 4000,
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
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
      fetchBusinesses(page);
      
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

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

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
                readOnly
                disabled={isRegistering}
                className="flex-1"
              />
              <Button
               type="button"
               onClick={openPostcode}
               disabled={isRegistering}
               className="h-12 px-4 bg-accent-blue hover:bg-accent-blue/90 text-white whitespace-nowrap"
    >
      주소검색
    </Button>
            </div>
            {newAddress && (
    <p className="text-xs text-gray-500 mt-1">선택된 주소: {newAddress}</p>
  )}
          
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

    {/* 수정 모달 */}
    {isEditModalOpen && editingBusiness && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
          {/* 로딩 오버레이 */}
          {isUpdating && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600 font-medium">거래처를 수정하는 중...</p>
              </div>
            </div>
          )}
          
          <h2 className="text-xl font-bold mb-4">거래처 수정</h2>
          <div className="space-y-3">
            <div>
              <Input 
                placeholder="거래처명 *" 
                value={editingBusiness.business_name} 
                onChange={(e) => setEditingBusiness(prev => prev ? { ...prev, business_name: e.target.value } : null)}
                className={!editingBusiness.business_name.trim() && editingBusiness.business_name !== "" ? "border-red-300" : ""}
                disabled={isUpdating}
              />
            </div>
            <div>
              <Input 
                placeholder="전화번호 *" 
                value={editingBusiness.phone_number} 
                onChange={(e) => setEditingBusiness(prev => prev ? { ...prev, phone_number: e.target.value } : null)}
                className={!editingBusiness.phone_number.trim() && editingBusiness.phone_number !== "" ? "border-red-300" : ""}
                disabled={isUpdating}
              />
            </div>
            <div>
              <Input 
                placeholder="주소 (선택사항)" 
                value={editingBusiness.address} 
                readOnly
                disabled={isUpdating}
                className="flex-1"
              />
              <Button
               type="button"
               onClick={openEditPostcode}
               disabled={isUpdating}
               className="h-12 px-4 bg-accent-blue hover:bg-accent-blue/90 text-white whitespace-nowrap"
    >
      주소검색
    </Button>
            </div>
            {editingBusiness.address && (
    <p className="text-xs text-gray-500 mt-1">선택된 주소: {editingBusiness.address}</p>
  )}
          
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              disabled={isUpdating}
            >
              취소
            </Button>
            <Button 
              className="bg-blue-500 hover:bg-blue-600" 
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              수정
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
                          {formatPhoneNumber(business.phone_number)}
                        </p>
                        {business.address && (
                          <p className="text-sm text-gray-600">{business.address}</p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-end sm:items-center">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">미수금</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(unpaidByBusinessId[business.id] ?? 0)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(business)}>
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
            {/* Pagination UI */}
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-disabled={page === 1}
                    tabIndex={page === 1 ? -1 : 0}
                    style={{ pointerEvents: page === 1 ? "none" : "auto" }}
                  />
                </PaginationItem>
                {/* 페이지 번호들 (최대 5개만 노출, ... 처리) */}
                {page > 3 && totalPages > 5 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                  </PaginationItem>
                )}
                {page > 4 && totalPages > 5 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) =>
                    totalPages <= 5 ||
                    (p >= page - 2 && p <= page + 2)
                  )
                  .map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={page === p}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                {page < totalPages - 3 && totalPages > 5 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                {page < totalPages - 2 && totalPages > 5 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPage(totalPages)}>{totalPages}</PaginationLink>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-disabled={page === totalPages}
                    tabIndex={page === totalPages ? -1 : 0}
                    style={{ pointerEvents: page === totalPages ? "none" : "auto" }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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