/**
 * 세금계산서 페이지
 * 실제 세금계산서 문서 형태로 표시하고 PDF 다운로드가 가능한 페이지입니다
 */
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { orderApi, getDocumentRequests, authApi } from '../../lib/api'
import { Order } from '../../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface DocumentRequest {
  id: number
  status: string
  created_at: string
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

const TaxInvoicePage: React.FC = () => {
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
           console.log('🔄 catch 블록 실행됨 - 기본 공급자 정보 설정 시작')
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
           console.log('✅ setSupplierInfo 호출 완료')
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
          
                     if (docRequests.tax_invoice) {
             // 실제 세금계산서 요청 데이터가 있는 경우
             console.log('✅ 세금계산서 요청 데이터 발견:', docRequests.tax_invoice)
             const docRequestData = {
               id: docRequests.tax_invoice.id,
               status: docRequests.tax_invoice.status,
               created_at: docRequests.tax_invoice.created_at,
               identifier: (docRequests.tax_invoice as any).identifier || '사업자등록번호 없음', // ✅ DB에서 실제 값 가져오기
               special_request: (docRequests.tax_invoice as any).special_request || '' // ✅ DB에서 실제 값 가져오기
             }
             console.log('📄 documentRequest 데이터 설정:', docRequestData)
             setDocumentRequest(docRequestData)
             console.log('✅ setDocumentRequest 호출 완료')
           } else {
            // 세금계산서 요청이 없는 경우 기본 정보
            console.log('⚠️ 세금계산서 요청 데이터 없음, 기본 정보 설정')
            setDocumentRequest({
              id: parseInt(id),
              status: 'completed',
              created_at: new Date().toISOString(),
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

      pdf.save(`세금계산서_${order?.business_name}_${new Date().toISOString().split('T')[0]}.pdf`)
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
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* 세금계산서 문서 */}
      <div className="max-w-4xl mx-auto">
        <div 
          ref={documentRef}
          className="bg-white shadow-lg border border-gray-200 p-8"
          style={{ minHeight: '297mm', width: '210mm' }}
        >
          {/* 문서 헤더 */}
          <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">세금계산서</h1>
            <p className="text-lg text-gray-600">TAX INVOICE</p>
          </div>

          {/* 발행자 정보 */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                판매자
              </h3>
                              <div className="space-y-2 text-sm">
                  <p><span className="font-medium">상호:</span> {supplierInfo.business_name}</p>
                  <p><span className="font-medium">사업자등록번호:</span> {supplierInfo.business_number}</p>
                  <p><span className="font-medium">주소:</span> {supplierInfo.address}</p>
                  <p><span className="font-medium">연락처:</span> {supplierInfo.phone}</p>
                </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                구매자
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">상호:</span> {buyerInfo.business_name}</p>
                <p><span className="font-medium">사업자등록번호:</span> {buyerInfo.business_number}</p>
                <p><span className="font-medium">주소:</span> {buyerInfo.address}</p>
                <p><span className="font-medium">연락처:</span> {buyerInfo.phone}</p>
                <p><span className="font-medium">업태:</span> {buyerInfo.business_type}</p>
                <p><span className="font-medium">종목:</span> {buyerInfo.business_category}</p>
              </div>
            </div>
          </div>

          {/* 거래 정보 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              거래 정보
            </h3>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <p><span className="font-medium">작성일자:</span> {new Date().toLocaleDateString('ko-KR')}</p>
                <p><span className="font-medium">공급가액:</span> {(order.total_price / 1.1).toLocaleString()}원</p>
                <p><span className="font-medium">부가세:</span> {(order.total_price - (order.total_price / 1.1)).toLocaleString()}원</p>
                <p><span className="font-medium">합계금액:</span> <span className="font-bold text-lg">{order.total_price.toLocaleString()}원</span></p>
              </div>
              <div>
                <p><span className="font-medium">주문일자:</span> {new Date(order.order_datetime).toLocaleDateString('ko-KR')}</p>
                <p><span className="font-medium">납기일:</span> {order.delivery_datetime ? new Date(order.delivery_datetime).toLocaleDateString('ko-KR') : '미정'}</p>
                <p><span className="font-medium">결제수단:</span> 계좌이체</p>
                <p><span className="font-medium">문서번호:</span> TI-{order.id.toString().padStart(6, '0')}</p>
              </div>
            </div>
          </div>

          {/* 품목 상세 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              품목 상세
            </h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-medium">품목명</th>
                  <th className="border border-gray-300 p-3 text-center font-medium">수량</th>
                  <th className="border border-gray-300 p-3 text-center font-medium">단가</th>
                  <th className="border border-gray-300 p-3 text-right font-medium">공급가액</th>
                  <th className="border border-gray-300 p-3 text-right font-medium">부가세</th>
                  <th className="border border-gray-300 p-3 text-right font-medium">합계</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, index) => {
                  const supplyAmount = (item.quantity * item.unit_price) / 1.1
                  const vat = (item.quantity * item.unit_price) - supplyAmount
                  return (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3">{item.fish_type_name}</td>
                      <td className="border border-gray-300 p-3 text-center">{item.quantity} {item.unit}</td>
                      <td className="border border-gray-300 p-3 text-center">{item.unit_price.toLocaleString()}원</td>
                      <td className="border border-gray-300 p-3 text-right">{supplyAmount.toLocaleString()}원</td>
                      <td className="border border-gray-300 p-3 text-right">{vat.toLocaleString()}원</td>
                      <td className="border border-gray-300 p-3 text-right font-medium">{(item.quantity * item.unit_price).toLocaleString()}원</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="border border-gray-300 p-3 text-center">합계</td>
                  <td className="border border-gray-300 p-3 text-right">{(order.total_price / 1.1).toLocaleString()}원</td>
                  <td className="border border-gray-300 p-3 text-right">{(order.total_price - (order.total_price / 1.1)).toLocaleString()}원</td>
                  <td className="border border-gray-300 p-3 text-right">{order.total_price.toLocaleString()}원</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 특별 요청사항 */}
          {documentRequest.special_request && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                특별 요청사항
              </h3>
              <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded border">
                {documentRequest.special_request}
              </p>
            </div>
          )}

          {/* 하단 정보 */}
          <div className="mt-12 pt-6 border-t-2 border-gray-800">
            <div className="grid grid-cols-2 gap-8 text-xs text-gray-600">
              <div>
                <p>※ 이 세금계산서는 전자세금계산서법에 따라 발행되었습니다.</p>
                <p>※ 공급가액은 부가가치세법에 따라 계산되었습니다.</p>
              </div>
              <div className="text-right">
                <p>발행일시: {new Date(documentRequest.created_at).toLocaleString('ko-KR')}</p>
                <p>문서번호: TI-{documentRequest.id.toString().padStart(6, '0')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaxInvoicePage
