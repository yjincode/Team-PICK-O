/**
 * 미수금 내역 페이지
 * 미수금 현황을 조회하고 관리하는 페이지입니다
 */
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { DollarSign, Calendar } from "lucide-react"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import type { Business, UnpaidOrder } from "../../types"
import { businessApi, arApi } from "../../lib/api"

 
 
const UnpaidList: React.FC = () => {
	// 금액 포맷팅 함수
	const formatCurrency = (amount: number): string => `₩${amount.toLocaleString()}`
	const [businesses, setBusinesses] = useState<Business[]>([])
	const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null)
	const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false)
	const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false)
	const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([])

	// 거래처 목록 가져오기
	useEffect(() => {
		const fetchBusinesses = async () => {
			try {
				setIsLoadingBusinesses(true)
				const response = await businessApi.getAll()
				let businessData: Business[] = []
				if (response && Array.isArray(response.results)) {
					businessData = response.results
				} else {
					console.warn('알 수 없는 거래처 응답 형태:', response)
				}
				setBusinesses(businessData)
			} catch (error) {
				console.error('거래처 목록 가져오기 실패:', error)
				setBusinesses([])
			} finally {
				setIsLoadingBusinesses(false)
			}
		}
		fetchBusinesses()
	}, [])

	// 선택된 거래처의 미결제 주문 목록 가져오기
	useEffect(() => {
		const fetchUnpaid = async (businessId: number) => {
			try {
				setIsLoadingOrders(true)
				const orders = await arApi.getUnpaidOrders({ businessId })
				setUnpaidOrders(orders || [])
			} catch (error) {
				console.error('미결제 주문 가져오기 실패:', error)
				setUnpaidOrders([])
			} finally {
				setIsLoadingOrders(false)
			}
		}
		if (selectedBusinessId) {
			fetchUnpaid(selectedBusinessId)
		} else {
			setUnpaidOrders([])
		}
	}, [selectedBusinessId])
	return (
		 <div className="space-y-4 sm:space-y-6">
			{/* 페이지 헤더 */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">고객 주문 내역</h1>
					<p className="text-sm sm:text-base text-gray-600 mt-1">고객별 주문 내역</p>
				</div>
				</div>
				
				<div className="flex items-center gap-2 mb-3 justify-center">
					{/* <h3 className={`text-lg font-semibold text-blue-500`}>
						거래처 선택
					</h3> */}
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="business-select">거래처</Label>
						<Select 
							value={selectedBusinessId?.toString() || ""} 
							onValueChange={(value: string) => setSelectedBusinessId(parseInt(value))}
						>
							<SelectTrigger className="bg-white flex justify-center">
								<SelectValue placeholder="거래처를 선택하세요"/>
							</SelectTrigger>
							<SelectContent>
								{businesses.map((business: Business) => (
									<SelectItem key={business.id} value={business.id.toString()} className="text-center">
										<div className="flex flex-col">
											<span className="font-medium">{business.business_name}</span>
											<div className="flex justify-between items-center">
												<span className="text-xs text-gray-500">{business.phone_number}</span>
												<span className="text-xs text-red-600 font-medium">
													미수금: {business.outstanding_balance?.toLocaleString() || '0'}원
												</span>
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						</div>
						{selectedBusinessId && (
							<div className="mt-2 text-sm">
								<div className="text-blue-700">
									✓ 선택된 거래처: {businesses.find((b: Business) => b.id === selectedBusinessId)?.business_name}
								</div>
								<div className="text-red-600 font-medium">
									현재 미수금: {businesses.find((b: Business) => b.id === selectedBusinessId)?.outstanding_balance?.toLocaleString() || '0'}원
								</div>
							</div>
						)}
					</div>
				

			{/* 행동 버튼 섹션 (필요 시 활성화) */}
			</div>

			{/* 선택된 거래처의 미결제 주문 목록 */}
			{selectedBusinessId ? (
				<div className="space-y-4">
					{isLoadingOrders ? (
						<div className="text-center text-sm text-gray-500 py-6">미결제 주문을 불러오는 중...</div>
					) : unpaidOrders.length > 0 ? (
						unpaidOrders.map((order) => (
							<Card key={order.orderId} className="shadow-sm hover:shadow-md transition-shadow">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg sm:text-xl">주문 #{order.orderId}</CardTitle>
										<Badge variant={order.orderStatus === 'cancelled' ? 'destructive' : 'secondary'}>
											{order.orderStatus}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center space-x-2">
										<DollarSign className="h-4 w-4 text-red-500" />
										<span className="font-semibold text-red-600">{formatCurrency(order.unpaidAmount)}</span>
									</div>
									<div className="flex items-center space-x-2 text-sm text-gray-600">
										<Calendar className="h-4 w-4" />
										<span>주문일시: {new Date(order.orderDatetime).toLocaleString()}</span>
									</div>
									{order.deliveryDatetime && (
										<div className="flex items-center space-x-2 text-sm text-gray-600">
											<Calendar className="h-4 w-4" />
											<span>배송일시: {new Date(order.deliveryDatetime).toLocaleString()}</span>
										</div>
									)}
								</CardContent>
							</Card>
						))
					) : (
						<div className="text-center text-sm text-gray-500 py-6">해당 거래처의 미결제 주문이 없습니다.</div>
					)}
				</div>
			) : (
				<div className="text-center text-sm text-gray-500 py-6">거래처를 선택하세요.</div>
			)}
		</div>
	)
}
 
export default UnpaidList; 