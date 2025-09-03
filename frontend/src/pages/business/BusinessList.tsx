/**
 * 거래처 목록 페이지
 * 거래처 정보를 조회하고 관리하는 페이지입니다
 */
"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search, Plus, Phone, Edit, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { businessApi, orderApi } from "../../lib/api"
import { useAuth } from "../../contexts/AuthContext"
import toast, { Toaster } from 'react-hot-toast';
import { useKakaoPostcode } from "../../hooks/useKakaoPostcode";
import { KakaoAddress } from "../../types/kakao";
import { formatPhoneNumber } from "../../utils/phoneFormatter";
import { formatCurrency } from "@/lib/utils";    
import { useNavigate } from "react-router-dom"; // 추가



import { Business } from "../../types";

interface BusinessSearchProps {
  onSelect: (business: Business) => void;
  onClose: () => void;
}

interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
}

// 이 코드는 컴포넌트 내부에서 useEffect로 처리해야 합니다


const BusinessList: React.FC = () => {
  const navigate = useNavigate(); // 추가
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); // 고정값, 필요시 변경 가능
  const [count, setCount] = useState(0); // 전체 개수
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("")
  const { user, isAuthenticated, loading } = useAuth();

  const [showUnpaid, setShowUnpaid] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deletingBusinessId, setDeletingBusinessId] = useState<number | null>(null);

  // 거래처 목록을 가져오는 함수 (재사용 가능)
  const fetchBusinesses = async (pageNum = page) => {
    if (isLoadingBusinesses) {
      return;
    }
    try {
      setIsLoadingBusinesses(true);
      const res = await businessApi.getAll({ page: pageNum, page_size: pageSize });
      // 다양한 응답 구조에 대응
      let data: any = null;
      // 1. res가 바로 {count, results} 구조일 때
      if (res && Array.isArray((res as any).results)) {
        data = res as unknown as { results: Business[]; count: number };
      }
      // 2. res.data가 {count, results} 구조일 때
      else if (res && Array.isArray(res.results)) {
        data = res as unknown as { results: Business[]; count: number };
      }
      if (data) {
        setBusinesses(data.results);
        setCount(data.count || 0);
      } else if (Array.isArray(res.results)) {
        setBusinesses(res.results);
        setCount(res.results.length);
      } else if (Array.isArray(res)) {
        setBusinesses(res);
        setCount(res.length);
      } else {
        setBusinesses([]);
        setCount(0);
      }
    } catch (error: any) {
      setBusinesses([]);
      setCount(0);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // 주문 및 결제 불러와서 미수금 계산
  const fetchUnpaidStats = async () => {
    try {
      // 주문 목록 (기존 order API 사용)
      const ordersRes = await orderApi.getAll();
      const ordersData = Array.isArray(ordersRes) ? ordersRes : ordersRes.data || [];
      const sumByBusiness: Record<number, { orders: number }> = {};

      for (const o of ordersData) {
        const businessId = o.business_id;
        if (!businessId) continue;
        if (!sumByBusiness[businessId]) sumByBusiness[businessId] = { orders: 0 };
        sumByBusiness[businessId].orders += Number(o.total_price || 0);
      }

      const unpaid: Record<number, number> = {};
      Object.entries(sumByBusiness).forEach(([bizId, sums]) => {
        unpaid[Number(bizId)] = sums.orders || 0;
      });

      // setUnpaidByBusinessId(unpaid);
    } catch (e) {
      // setUnpaidByBusinessId({});
    }
  };

  const getOldestOrderDate = (businessId: number, orders: Order[]): string | null => {
    const businessOrders = orders
      .filter(order => order.business_id === businessId)
      .sort((a, b) => new Date(a.order_datetime).getTime() - new Date(b.order_datetime).getTime());
  
    return businessOrders.length > 0 ? businessOrders[0].order_datetime : null;
  };

  const calculateOverdueDays = (orderDate: string | null) => {
    if (!orderDate) return 0;
    const orderTime = new Date(orderDate).getTime();
    const today = new Date().getTime();
    const diffDays = Math.floor((today - orderTime) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 연체일수 계산 함수 추가
  const calculateDaysSinceOrder = (orderDate?: string | Date): number => {
    if (!orderDate) return 0;

    const order = new Date(orderDate);
    if (isNaN(order.getTime())) return 0;

    const today = new Date();
    const diffTime = today.getTime() - order.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };


  // AuthContext 로딩이 완료되면 API 호출 (인증 여부와 관계없이)
  useEffect(() => {
    // AuthContext 로딩 중이면 대기
    if (loading) {
      return;
    }

    // 이미 초기화했으면 더 이상 호출하지 않음
    if (hasInitialized) {
      return;
    }
    setHasInitialized(true);
    fetchBusinesses(1); // 첫 페이지 로드
    fetchUnpaidStats();
  }, [loading, hasInitialized]);


  // 검색어에 따라 거래처 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBusinesses(businesses);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredBusinesses(
        businesses.filter(
          (b) =>
            b.business_name.toLowerCase().includes(term) ||
            (b.phone_number && b.phone_number.replace(/-/g, "").includes(term.replace(/-/g, "")))
        )
      );
    }
  }, [businesses, searchTerm]);

  // 페이지 변경 시 목록 새로고침
  useEffect(() => {
    if (hasInitialized) {
      fetchBusinesses(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    const onlyNumbers = phone.replace(/\D/g, ""); // 숫자만
    if (onlyNumbers.length < 4) return onlyNumbers;
    if (onlyNumbers.length < 7) return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3)}`;
    if (onlyNumbers.length < 11) return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3, 6)}-${onlyNumbers.slice(6)}`;
    return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3, 7)}-${onlyNumbers.slice(7)}`;
  };



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
    if (!isAuthenticated || !user ) {

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
  
  // 거래처 삭제 함수
  const handleDeleteBusiness = async (businessId: number) => {
    if (!window.confirm('정말로 이 거래처를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeletingBusinessId(businessId);
      
      await businessApi.delete(businessId);
      
      toast.success('거래처가 성공적으로 삭제되었습니다.');
      
      // 목록에서 삭제된 거래처 제거
      setBusinesses(prev => prev.filter(b => b.id !== businessId));
      setCount(prev => prev - 1);
      
      // 현재 페이지가 비어있으면 이전 페이지로 이동
      if (businesses.length === 1 && page > 1) {
        setPage(prev => prev - 1);
      }
      
    } catch (error: any) {
      console.error('거래처 삭제 실패:', error);
      toast.error('거래처 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDeleting(false);
      setDeletingBusinessId(null);
    }
  };

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
                placeholder="전화번호 (숫자만 입력하세요)*" 
                value={formatPhoneNumber(newPhone)} // 보여줄 때만 포맷 적용
                onChange={(e) => {
                  const onlyNumbers = e.target.value.replace(/\D/g, ""); // 하이픈 포함 모든 문자 제거 후 숫자만 저장
                  setNewPhone(onlyNumbers);
                }}
                className={!newPhone.trim() && newPhone !== "" ? "border-red-300" : ""}
                disabled={isRegistering}
              />

            </div>
            <div className="flex flex-col space-y-2">
              <Input 
                placeholder="주소" 
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
                placeholder="거래처명" 
                value={editingBusiness.business_name} 
                onChange={(e) => setEditingBusiness(prev => prev ? { ...prev, business_name: e.target.value } : null)}
                className={!editingBusiness.business_name.trim() && editingBusiness.business_name !== "" ? "border-red-300" : ""}
                disabled={isUpdating}
              />
            </div>
            <div>
                <Input 
                placeholder="전화번호 (숫자만 입력하세요)*" 
                value={formatPhoneNumber(editingBusiness.phone_number)} // 보여줄 때만 포맷 적용
                onChange={(e) =>
                  setEditingBusiness(prev =>
                    prev ? { ...prev, phone_number: e.target.value.replace(/\D/g, "") } : null // 숫자만 저장
                  )
                }
                className={
                  !editingBusiness.phone_number.trim() && editingBusiness.phone_number !== "" 
                    ? "border-red-300" 
                    : ""
                }
                disabled={isUpdating}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Input 
                placeholder="주소" 
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
          disabled={!isAuthenticated || !user }
        >
          <Plus className="h-4 w-4 mr-2" />
          {isAuthenticated && user ? '새 거래처 등록' : '로그인 후 이용 가능'}
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


  {/* const calculateDaysSinceOrder = (orderDate?: string | Date): number => {
    if (!orderDate) return 0;

    const order = new Date(orderDate);
    if (isNaN(order.getTime())) return 0;

    const today = new Date();
    const diffTime = today.getTime() - order.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }; */}



      {/* 거래처 목록 */}
      <div className="space-y-4">
        {isLoadingBusinesses ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-gray-500 text-sm">거래처 목록을 불러오는 중...</p>
          </div>
        ) : (
          <>
            {filteredBusinesses && filteredBusinesses.length > 0 ? (
              filteredBusinesses.map((business) => {
                const oldestOrderDate = getOldestOrderDate(business.id, orders);
                const overdueDays = calculateOverdueDays(oldestOrderDate);
                
               return (
                <Card 
                  key={business.id} 
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/business/${business.id}`)}
                >
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
                            {/* 연체일수 표시 추가 */}
                              {overdueDays > 0 && (
                            <p className="text-sm text-red-600 mt-1">
                              연체일수: {overdueDays}일
                            </p>
                          )}
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-end sm:items-center">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">미수금</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(business.outstanding_balance ?? 0)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(business);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />수정
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBusiness(business.id);
                            }}
                            disabled={isDeleting && deletingBusinessId === business.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400"
                          >
                            {isDeleting && deletingBusinessId === business.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            {isDeleting && deletingBusinessId === business.id ? '삭제중...' : '삭제'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );})
            ) : (
              <div className="text-center py-8 text-gray-500">
                거래처가 없습니다.
              </div>
            )}
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, count)} / {count}건
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  
                  {(() => {
                    // 페이지 번호를 최대 15개까지만 표시
                    const maxVisiblePages = 15
                    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                    
                    // 끝에서부터 계산해서 시작 페이지 조정
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }
                    
                    const pages = []
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i)
                    }
                    
                    return pages.map(pageNum => (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    ))
                  })()}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      


 {/* 거래처 상세 모달 */}
 {showUnpaid && selectedBusiness && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
      <h2 className="text-lg font-bold text-gray-800">거래처 상세</h2>
      </div>

     {/* 본문 */}
     <div className="px-6 py-5 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600 font-medium">상호</span>
          <span className="text-gray-900">{selectedBusiness.business_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 font-medium">미수금</span>
          <span className="text-red-600 font-semibold">
            {formatCurrency(selectedBusiness.outstanding_balance ?? 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 font-medium">연체일수</span>
          <span className="text-gray-900">
            {calculateDaysSinceOrder(selectedBusiness.last_order_date)}일
          </span>
        </div>
      </div>

  
      {/* 푸터 버튼 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
        <button
          onClick={() => {
            const testDate = "2025-08-10T00:00:00Z"; // 임의의 주문 날짜
            const days = calculateDaysSinceOrder(testDate);
            alert(`테스트: ${days}일`);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition"
        >
          연체일수 테스트
        </button>
        <button
          onClick={() => setShowUnpaid(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-300 transition"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
)}


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
  );
};

export default BusinessList; 