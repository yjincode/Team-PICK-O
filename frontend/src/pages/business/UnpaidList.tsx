/**
 * 미수금 내역 페이지
 * 특정 거래처의 미결제(결제 상태 pending) 주문 목록을 보여줍니다
 */
import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from 'react-router-dom'
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { AlertTriangle, CreditCard, ChevronLeft, ChevronRight, Phone, MapPin, Building2 } from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { OrderListItem } from "../../types"
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/common/StatusBadges"
import { businessApi, orderApi } from "../../lib/api"

const UnpaidList: React.FC = () => {
	const navigate = useNavigate()
	const { businessId } = useParams<{ businessId: string }>()
	const [businessName, setBusinessName] = useState<string>('')
	const [orders, setOrders] = useState<OrderListItem[]>([])
	const [loading, setLoading] = useState(true)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage] = useState(10)
	const [totalCount, setTotalCount] = useState(0)
	const [totalPages, setTotalPages] = useState(0)
	const [business, setBusiness] = useState<any>(null)

	useEffect(() => {
		const fetchOrders = async () => {
			if (!businessId) {
				setOrders([])
				setLoading(false)
				setBusiness(null)
				return
			}
			try {
				setLoading(true)
				const params: any = {
					page: currentPage,
					page_size: itemsPerPage,
					business_id: businessId,
					payment_status: 'pending'
				}
				const response = await orderApi.getAll(params)
				if ((response as any).pagination) {
					setOrders((response as any).data || [])
					setTotalCount((response as any).pagination.total_count)
					setTotalPages((response as any).pagination.total_pages)
				} else {
					const ordersData = (response as any).data || []
					setOrders(Array.isArray(ordersData) ? ordersData : [])
				}
			
				try {
					const businessRes = await businessApi.getById(Number(businessId))
					console.log("API Response:", businessRes)
					setBusiness(businessRes)
				  } catch (err) {
					console.error("거래처 정보 가져오기 실패:", err)
					setBusiness(null)
				  }
			} catch (error) {
				console.error('미수금 주문 목록 가져오기 실패:', error)
				setOrders([])
			} finally {
				setLoading(false)
			}
		}
		fetchOrders()
	}, [businessId, currentPage, itemsPerPage])

	// 카카오맵 초기화
	useEffect(() => {
		if (!business?.address) return;
		if (typeof window === 'undefined') return;
	  
		const loadKakaoMap = () => {
		  if (!(window as any).kakao) {
			const script = document.createElement('script');
			script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=345d37cd125a6cd69d4a819d26ed9dc0&libraries=services&autoload=false`;
			script.async = true;
			script.onload = () => {
				(window as any).kakao.maps.load(() => {
					initMap();
				  });
			};
			document.head.appendChild(script);
		  } else if ((window as any).kakao.maps) {
			initMap();
		  }
		};
	  
		loadKakaoMap();
	  }, [business]);

	const initMap = () => {
		const { kakao } = window as any;	
		if (!business?.address || !(window as any).kakao) return

		const mapContainer = document.getElementById('map')
		if (!mapContainer) return

		const mapOption = {
			center: new (window as any).kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청 좌표 (기본값)
			level: 3
		}

		const map = new (window as any).kakao.maps.Map(mapContainer, mapOption)

		// 주소-좌표 변환 객체 생성
		const geocoder = new (window as any).kakao.maps.services.Geocoder()

		// 주소로 좌표 검색
		geocoder.addressSearch(business.address, function(result: any, status: any) {
			if (status === (window as any).kakao.maps.services.Status.OK) {
				const coords = new (window as any).kakao.maps.LatLng(result[0].y, result[0].x)

				// 결과값으로 받은 위치를 마커로 표시
				const marker = new kakao.maps.Marker({
					map: map,
					position: coords,
				  });
				  
				// 지도의 중심을 결과값으로 받은 위치로 이동
				map.setCenter(coords)

				// 인포윈도우로 장소에 대한 설명 표시
				const infowindow = new (window as any).kakao.maps.InfoWindow({
					content: `<div style="padding:5px;font-size:12px;">${business.business_name}</div>`
				})
				infowindow.open(map, marker)
			}
		})
	}

	const handleViewDetail = (orderId: number) => {
		navigate(`/orders/${orderId}`)
	}

	const handlePayment = (orderId: number) => {
		navigate(`/orders/${orderId}/payment`)
	}

	const startIndex = (currentPage - 1) * itemsPerPage
	const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="px-6 py-4 bg-white border-b border-gray-200">
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">미수금 주문 목록</h1>
					{business ? (
						<div className="mt-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
							<p className="text-lg font-semibold text-gray-900">{business.business_name}</p>
							<p className="text-sm text-gray-600">📞 {business.phone_number || "전화번호 없음"}</p>
							<p className="text-sm text-gray-600">📍 {business.address || "주소 없음"}</p>
						</div>
					) : (
						<p className="text-sm sm:text-base text-gray-600 mt-1">
							거래처 정보를 불러올 수 없습니다.
						</p>
					)}
				</div>
			</header>

			<div className="p-6">
				{/* 거래처 프로필 카드 */}
				{business && (
					<Card className="mb-6 shadow-lg">
						<CardContent className="p-6">
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* 거래처 정보 */}
								<div className="lg:col-span-2 space-y-4">
									<div className="flex items-center gap-3">
										<div className="p-3 bg-blue-100 rounded-full">
											<Building2 className="h-6 w-6 text-blue-600" />
										</div>
										<div>
											<h2 className="text-2xl font-bold text-gray-900">{business.business_name}</h2>
											<p className="text-sm text-gray-500">거래처 정보</p>
										</div>
									</div>
									
									<div className="space-y-3">
										<div className="flex items-center gap-3">
											<Phone className="h-5 w-5 text-gray-400" />
											<span className="text-gray-700">{business.phone_number || "전화번호 없음"}</span>
										</div>
										<div className="flex items-start gap-3">
											<MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
											<span className="text-gray-700">{business.address || "주소 없음"}</span>
										</div>
									</div>
								</div>

								{/* 지도 */}
								<div className="lg:col-span-1">
									<div className="bg-gray-100 rounded-lg overflow-hidden">
										<div id="map" className="w-full h-48"></div>
									</div>
									<p className="text-xs text-gray-500 mt-2 text-center">위치 정보</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* 주문 목록 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>주문 목록 ({totalCount}건)</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow className="bg-gray-50">
										<TableHead className="font-semibold text-gray-900">번호</TableHead>
										<TableHead className="font-semibold text-gray-900">거래처명</TableHead>
										<TableHead className="font-semibold text-gray-900">주문일자</TableHead>
										<TableHead className="font-semibold text-gray-900">납기일</TableHead>
										<TableHead className="font-semibold text-gray-900">품목 요약</TableHead>
										<TableHead className="font-semibold text-gray-900">총금액</TableHead>
										<TableHead className="font-semibold text-gray-900">결제 상태</TableHead>
										<TableHead className="font-semibold text-gray-900 text-center"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell colSpan={8} className="text-center py-8">
												<div className="flex items-center justify-center gap-2">
													<svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
													<span>주문 목록을 불러오는 중입니다...</span>
												</div>
											</TableCell>
										</TableRow>
									) : orders.length === 0 ? (
										<TableRow>
											<TableCell colSpan={8} className="text-center py-8 text-gray-500">
												조회된 주문이 없습니다.
											</TableCell>
										</TableRow>
									) : (
										orders.map((order, index) => (
											<TableRow 
												key={order.id} 
												className={`hover:bg-gray-50 transition-colors cursor-pointer ${order.has_stock_issues ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}
												onClick={() => handleViewDetail(order.id)}
											>
												<TableCell className="font-medium text-gray-900">
													{totalCount ? (totalCount - startIndex - index) : (index + 1)}
												</TableCell>
												<TableCell className="font-medium">
													<div className="font-semibold text-gray-900">
														{order.business?.business_name || '거래처명 없음'}
													</div>
												</TableCell>
												<TableCell className="text-gray-600">
													{format(new Date(order.order_datetime), "yyyy-MM-dd", { locale: ko })}
												</TableCell>
												<TableCell className="text-gray-600">
													{order.delivery_datetime ? format(new Date(order.delivery_datetime), "yyyy-MM-dd", { locale: ko }) : "-"}
												</TableCell>
												<TableCell className="text-gray-600 max-w-[250px]">
													<div className="flex items-start gap-2">
														{order.has_stock_issues && (
															<AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
														)}
														<div className="flex-1 overflow-hidden">
															{order.items_summary.split('\n').map((item: string, idx: number) => (
																<div 
																	key={idx}
																	className="truncate text-sm"
																	title={item}
																>
																	{item}
																</div>
															))}
														</div>
													</div>
												</TableCell>
												<TableCell className="font-semibold text-gray-900">
													{new Intl.NumberFormat('ko-KR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(order.total_price))}원
												</TableCell>
												<TableCell>
													{/* 결제 상태 표시 (미결제로 필터링되어 있지만 안전하게 표시) */}
													{order.payment ? (
														<PaymentStatusBadge status={order.payment.payment_status} />
													) : (
														<Badge variant="outline" className="text-gray-500 border-gray-300">
															미결제
														</Badge>
													)}
												</TableCell>
												<TableCell className="text-center">
													<div className="flex items-center justify-center gap-2">
														{/* 결제 버튼 - 미결제 상태이고 취소되지 않은 주문일 때만 표시 */}
														{(!order.payment || order.payment.payment_status !== 'paid') && 
														 order.order_status !== 'cancelled' && (
															<Button
																variant="outline"
																size="sm"
																onClick={(e) => {
																	e.stopPropagation()
																	handlePayment(order.id)
																}}
																className="border-green-600 text-green-600 hover:bg-green-50"
															>
																<CreditCard className="h-4 w-4 mr-1" />
																	결제
																</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>

						{/* 페이지네이션 */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-6">
								<div className="text-sm text-gray-700">
									{startIndex + 1} - {endIndex} / {totalCount}건
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
										disabled={currentPage === 1}
									>
										<ChevronLeft className="h-4 w-4" />
										이전
									</Button>

									{(() => {
										const maxVisiblePages = 15
										let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
										let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
										if (endPage - startPage + 1 < maxVisiblePages) {
											startPage = Math.max(1, endPage - maxVisiblePages + 1)
										}
										const pages = [] as number[]
										for (let i = startPage; i <= endPage; i++) {
											pages.push(i)
										}
										return pages.map(page => (
											<Button
												key={page}
												variant={currentPage === page ? "default" : "outline"}
												size="sm"
												onClick={() => setCurrentPage(page)}
												className="w-8 h-8 p-0"
											>
												{page}
											</Button>
										))
									})()}

									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
										disabled={currentPage === totalPages}
									>
										다음
										<ChevronLeft className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export default UnpaidList; 