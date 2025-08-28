import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { orderApi } from '../../lib/api'
import { authApi } from '../../lib/api'
import { Order } from '../../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface OrderConfirmationData {
  id: number
  status: string
  created_at: string
}

const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const documentRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [supplierInfo, setSupplierInfo] = useState<any>(null)
  const [buyerInfo, setBuyerInfo] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. 주문 정보 조회
        const orderResponse = await orderApi.getById(parseInt(id!))
        setOrder(orderResponse)

        // 2. 공급자 정보 조회 (로그인한 사용자)
        try {
          const userResponse = await authApi.getCurrentUser()
          console.log('👤 사용자 정보 조회 결과:', userResponse)
          
          if (userResponse.success && userResponse.data) {
            setSupplierInfo({
              business_name: userResponse.data.business_name || '곰표수산',
              owner_name: userResponse.data.owner_name || '김곰표',
              phone_number: userResponse.data.phone_number || '010-1234-5678',
              address: userResponse.data.address || '서울시 강남구 테헤란로 123',
              business_number: '123-45-67890'
            })
          } else {
            // 기본 공급자 정보 설정
            setSupplierInfo({
              business_name: '곰표수산',
              owner_name: '김곰표',
              phone_number: '010-1234-5678',
              address: '서울시 강남구 테헤란로 123',
              business_number: '123-45-67890'
            })
          }
        } catch (error) {
          console.log('👤 사용자 정보 조회 실패, 기본값 사용')
          setSupplierInfo({
            business_name: '곰표수산',
            owner_name: '김곰표',
            phone_number: '010-1234-5678',
            address: '서울시 강남구 테헤란로 123',
            business_number: '123-45-67890'
          })
        }

        // 3. 구매자 정보 설정 (주문 정보에서)
                 if (orderResponse) {
           setBuyerInfo({
             business_name: orderResponse.business_name || '구매자명',
             business_phone: orderResponse.business_phone || '010-0000-0000',
             business_address: orderResponse.business_address || '구매자 주소'
           })
         }

      } catch (error) {
        console.error('데이터 조회 실패:', error)
      } finally {
        setLoading(false)
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

      pdf.save(`주문확인서_${order?.business_name}_${new Date().toISOString().split('T')[0]}.pdf`)
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

  if (!order || !supplierInfo || !buyerInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">문서 정보를 찾을 수 없습니다</h2>
          <p className="text-gray-500">주문 정보나 사용자 정보를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">주문확인서</h1>
          <div className="space-x-3">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
            >
              뒤로가기
            </Button>
            <Button 
              onClick={handleDownloadPDF}
              className="bg-navy hover:bg-navy/90"
            >
              PDF 다운로드
            </Button>
          </div>
        </div>

        {/* 주문확인서 문서 */}
        <Card className="p-8 bg-white shadow-lg">
          <div 
            ref={documentRef}
            className="max-w-4xl mx-auto bg-white"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              padding: '20mm',
              boxSizing: 'border-box'
            }}
          >
            {/* 문서 헤더 */}
            <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">주문확인서</h1>
              <p className="text-lg text-gray-600">ORDER CONFIRMATION</p>
            </div>

            {/* 발행 정보 */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
                  발행자 정보
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">상호:</span> {supplierInfo.business_name}</p>
                  <p><span className="font-medium">대표자:</span> {supplierInfo.owner_name}</p>
                  <p><span className="font-medium">사업자등록번호:</span> {supplierInfo.business_number}</p>
                  <p><span className="font-medium">연락처:</span> {supplierInfo.phone_number}</p>
                  <p><span className="font-medium">주소:</span> {supplierInfo.address}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
                  구매자 정보
                </h3>
                                 <div className="space-y-2 text-sm">
                   <p><span className="font-medium">상호:</span> {buyerInfo.business_name}</p>
                   <p><span className="font-medium">연락처:</span> {buyerInfo.business_phone}</p>
                   <p><span className="font-medium">주소:</span> {buyerInfo.business_address}</p>
                 </div>
              </div>
            </div>

            {/* 주문 정보 */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
                주문 정보
              </h3>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p><span className="font-medium">주문번호:</span> {order.id}</p>
                  <p><span className="font-medium">주문일시:</span> {new Date(order.order_datetime).toLocaleDateString('ko-KR')}</p>
                  <p><span className="font-medium">배송일시:</span> {order.delivery_datetime ? new Date(order.delivery_datetime).toLocaleDateString('ko-KR') : '미정'}</p>
                </div>
                                 <div>
                   <p><span className="font-medium">총 금액:</span> {order.total_price?.toLocaleString()}원</p>
                 </div>
              </div>
            </div>

            {/* 주문 품목 */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
                주문 품목
              </h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                                     <thead className="bg-gray-50">
                     <tr>
                       <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-300">품목</th>
                       <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-gray-300">수량</th>
                       <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-gray-300">단가</th>
                       <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-gray-300">금액</th>
                     </tr>
                   </thead>
                  <tbody>
                                         {order.items?.map((item, index) => (
                       <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                         <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200">
                           {item.fish_type_name || item.item_name_snapshot || '품목명'}
                         </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 border-b border-gray-200">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 border-b border-gray-200">
                          {item.unit_price?.toLocaleString()}원
                        </td>
                                                 <td className="px-4 py-3 text-center text-sm text-gray-900 border-b border-gray-200">
                           {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}원
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 합계 정보 */}
            <div className="mb-8">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>소계:</span>
                    <span>{order.total_price?.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>부가세:</span>
                    <span>{Math.round((order.total_price || 0) * 0.1).toLocaleString()}원</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>총 금액:</span>
                    <span>{Math.round((order.total_price || 0) * 1.1).toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 정보 */}
            <div className="text-center text-sm text-gray-600">
              <p>본 주문확인서는 주문 접수 시점의 정보를 기반으로 작성되었습니다.</p>
              <p className="mt-2">문의사항이 있으시면 발행자에게 연락해 주시기 바랍니다.</p>
            </div>

            {/* 발행일 */}
            <div className="mt-12 text-right text-sm text-gray-600">
              <p>발행일: {new Date().toLocaleDateString('ko-KR')}</p>
              <p className="mt-1">발행자: {supplierInfo.business_name} (인)</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default OrderConfirmationPage
