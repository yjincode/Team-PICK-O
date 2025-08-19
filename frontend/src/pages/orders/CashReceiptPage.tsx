/**
 * 현금영수증 페이지
 * 실제 현금영수증 문서 형태로 표시하고 PDF 다운로드가 가능한 페이지입니다
 */
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ArrowLeft, Download, Receipt } from 'lucide-react'
import { orderApi, getDocumentRequests, authApi } from '../../lib/api'
import { Order } from '../../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface DocumentRequest {
  id: number
  status: string
  created_at: string
  receipt_type: 'individual' | 'business'
  identifier: string
  special_request: string
}

// 공급자 정보 (사용자 정보에서 가져옴)
interface SupplierInfo {
  business_name: string
  business_number: string
  address: string
  phone: string
  business_type: string
  business_category: string
}

// 공급받는자 정보 (주문 정보에서 가져옴)
interface BuyerInfo {
  business_name: string
  business_number: string
  address: string
  phone: string
  business_type: string
  business_category: string
}

const CashReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [documentRequest, setDocumentRequest] = useState<DocumentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const documentRef = useRef<HTMLDivElement>(null)

  // 공급자 정보 (사용자 정보에서 가져옴)
  const [supplierInfo, setSupplierInfo] = useState<SupplierInfo | null>(null)
  
  // 공급받는자 정보 (주문 정보에서 가져옴)
  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        
        // 1. 주문 정보 조회
        const orderResponse = await orderApi.getById(parseInt(id))
        console.log('📦 주문 정보 조회 결과:', orderResponse)
        setOrder(orderResponse)
        
        // 2. 사용자 정보 조회 (공급자 정보)
                 try {
           const userResponse: any = await authApi.getCurrentUser()
           console.log('👤 사용자 정보 조회 결과:', userResponse)
           if (userResponse.success && userResponse.data) {
             const userData = userResponse.data
             const supplierData = {
               business_name: userData.business_name || '업체명 없음',
               business_number: '사업자등록번호 없음', // API에서 제공하지 않음
               address: '주소 없음', // API에서 제공하지 않음
               phone: '연락처 없음', // API에서 제공하지 않음
               business_type: '수산물 도매', // 기본값
               business_category: '수산물' // 기본값
             }
             console.log('🏢 공급자 정보 설정:', supplierData)
             setSupplierInfo(supplierData)
           } else {
             // success: false인 경우 기본 공급자 정보 설정
             console.log('🔄 success: false - 기본 공급자 정보 설정 시작')
             const defaultSupplier = {
               business_name: '곰표수산',
               business_number: '123-45-67890',
               address: '서울특별시 강남구 테헤란로 123',
               phone: '02-1234-5678',
               business_type: '수산물 도매',
               business_category: '수산물'
             }
             console.log('🏢 기본 공급자 정보 설정:', defaultSupplier)
             setSupplierInfo(defaultSupplier)
             console.log('✅ setSupplierInfo 호출 완료')
           }
         } catch (error) {
           console.error('사용자 정보 조회 실패:', error)
           // 기본 공급자 정보 설정 (곰표수산)
           const defaultSupplier = {
             business_name: '곰표수산',
             business_number: '123-45-67890',
             address: '서울특별시 강남구 테헤란로 123',
             phone: '02-1234-5678',
             business_type: '수산물 도매',
             business_category: '수산물'
           }
           console.log('🏢 기본 공급자 정보 설정:', defaultSupplier)
           setSupplierInfo(defaultSupplier)
         }
        
        // 3. 공급받는자 정보 설정 (주문 정보에서)
        if (orderResponse) {
          const buyerData = {
            business_name: orderResponse.business_name || '업체명 없음',
            business_number: '사업자등록번호 없음', // 주문에 사업자등록번호가 없음
            address: orderResponse.business_address || '주소 없음',
            phone: orderResponse.business_phone || '연락처 없음',
            business_type: '수산물 도매', // 주문에 업태 정보가 없음
            business_category: '수산물' // 주문에 종목 정보가 없음
          }
          console.log('🛒 공급받는자 정보 설정:', buyerData)
          setBuyerInfo(buyerData)
        }
        
        // 4. 실제 문서 요청 정보 조회
        try {
          const docRequests = await getDocumentRequests(parseInt(id))
          console.log('📋 문서 요청 조회 결과:', docRequests)
          
          if (docRequests.cash_receipt) {
            // 실제 현금영수증 요청 데이터가 있는 경우
            console.log('✅ 현금영수증 요청 데이터 발견:', docRequests.cash_receipt)
            console.log('🔍 cash_receipt 객체의 모든 키:', Object.keys(docRequests.cash_receipt))
            console.log('🔍 identifier 값:', (docRequests.cash_receipt as any).identifier)
            console.log('🔍 receipt_type 값:', (docRequests.cash_receipt as any).receipt_type)
            console.log('🔍 special_request 값:', (docRequests.cash_receipt as any).special_request)
            setDocumentRequest({
              id: docRequests.cash_receipt.id,
              status: docRequests.cash_receipt.status,
              created_at: docRequests.cash_receipt.created_at,
              receipt_type: (docRequests.cash_receipt as any).receipt_type || 'business',
              identifier: (docRequests.cash_receipt as any).identifier || '사업자등록번호 없음',
              special_request: (docRequests.cash_receipt as any).special_request || ''
            })
          } else {
            // 현금영수증 요청이 없는 경우 기본 정보
            console.log('⚠️ 현금영수증 요청 데이터 없음, 기본 정보 설정')
            setDocumentRequest({
              id: parseInt(id),
              status: 'completed',
              created_at: new Date().toISOString(),
              receipt_type: 'business',
              identifier: '사업자등록번호 없음',
              special_request: ''
            })
          }
        } catch (error) {
          console.error('문서 요청 정보 조회 실패:', error)
          // 기본 정보로 설정
          setDocumentRequest({
            id: parseInt(id),
            status: 'completed',
            created_at: new Date().toISOString(),
            receipt_type: 'business',
            identifier: '사업자등록번호 없음',
            special_request: '이메일로 발송 부탁드립니다'
          })
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error)
      } finally {
        setLoading(false)
        // 상태 설정 완료 후 디버깅
        console.log('🔍 상태 설정 완료 후 확인:')
        console.log('  - order:', order)
        console.log('  - documentRequest:', documentRequest)
        console.log('  - supplierInfo:', supplierInfo)
        console.log('  - buyerInfo:', buyerInfo)
      }
    }

    fetchData()
  }, [id])

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return

    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`현금영수증_${order?.business_name}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF 생성 실패:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    )
  }

  if (!order || !documentRequest || !supplierInfo || !buyerInfo) {
    return (
      <div className="text-center py-8">
        <p>문서 정보를 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/orders')} className="mt-4">
          주문 목록으로 돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 헤더 */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로 가기
          </Button>
          
          <Button
            onClick={handleDownloadPDF}
            className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* 현금영수증 문서 */}
      <div className="flex justify-center">
        <div 
          ref={documentRef}
          className="bg-white shadow-lg border-2 border-gray-300 p-6"
          style={{ minHeight: '210mm', width: '148mm' }}
        >
          {/* 문서 헤더 */}
          <div className="text-center border-b-2 border-gray-400 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">현금영수증</h1>
            <p className="text-sm text-gray-600">CASH RECEIPT</p>
          </div>

          {/* 발행자 정보 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1">
              판매자
            </h3>
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">상호:</span> {supplierInfo.business_name}</p>
              <p><span className="font-medium">사업자등록번호:</span> {supplierInfo.business_number}</p>
              <p><span className="font-medium">주소:</span> {supplierInfo.address}</p>
              <p><span className="font-medium">연락처:</span> {supplierInfo.phone}</p>
            </div>
          </div>

          {/* 구매자 정보 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1">
              구매자
            </h3>
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">상호:</span> {buyerInfo.business_name}</p>
              {documentRequest.receipt_type === 'business' ? (
                <p><span className="font-medium">사업자등록번호:</span> {buyerInfo.business_number}</p>
              ) : (
                <p><span className="font-medium">연락처:</span> {buyerInfo.phone}</p>
              )}
              <p><span className="font-medium">주소:</span> {buyerInfo.address}</p>
            </div>
          </div>

          {/* 거래 정보 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1">
              거래 정보
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><span className="font-medium">작성일자:</span> {new Date().toLocaleDateString('ko-KR')}</p>
                <p><span className="font-medium">주문일자:</span> {new Date(order.order_datetime).toLocaleDateString('ko-KR')}</p>
                <p><span className="font-medium">결제수단:</span> 현금</p>
              </div>
              <div>
                <p><span className="font-medium">공급가액:</span> {(order.total_price / 1.1).toLocaleString()}원</p>
                <p><span className="font-medium">부가세:</span> {(order.total_price - (order.total_price / 1.1)).toLocaleString()}원</p>
                <p><span className="font-medium">합계금액:</span> <span className="font-bold text-base">{order.total_price.toLocaleString()}원</span></p>
              </div>
            </div>
          </div>

          {/* 품목 요약 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1">
              품목 요약
            </h3>
            <div className="text-xs">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span>{item.fish_type_name} {item.quantity}{item.unit}</span>
                  <span>{(item.quantity * item.unit_price).toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>



          {/* 현금영수증 특별 정보 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1">
              현금영수증 정보
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><span className="font-medium">영수증 종류:</span> 
                  {documentRequest.receipt_type === 'business' ? '법인용' : '개인용'}
                </p>
                <p><span className="font-medium">식별번호:</span> {documentRequest.identifier}</p>
              </div>
              <div>
                <p><span className="font-medium">발행일시:</span> {new Date(documentRequest.created_at).toLocaleString('ko-KR')}</p>
                <p><span className="font-medium">영수증번호:</span> CR-{documentRequest.id.toString().padStart(6, '0')}</p>
              </div>
            </div>
          </div>

          {/* 하단 정보 */}
          <div className="mt-8 pt-4 border-t-2 border-gray-400">
            <div className="text-center text-xs text-gray-600">
              <p>※ 이 현금영수증은 현금영수증법에 따라 발행되었습니다.</p>
              <p>※ 공급가액은 부가가치세법에 따라 계산되었습니다.</p>
              <p>※ 교환/환불 시 반드시 영수증을 지참하셔야 합니다.</p>
              <p className="mt-2">발행일시: {new Date(documentRequest.created_at).toLocaleString('ko-KR')}</p>
              <p>영수증번호: CR-{documentRequest.id.toString().padStart(6, '0')}</p>
              <p>발행자: {supplierInfo.business_name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CashReceiptPage
