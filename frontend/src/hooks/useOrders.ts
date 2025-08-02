/**
 * 주문 관리 훅
 * 주문 정보를 조회하고 관리하는 커스텀 훅입니다
 */
import { useState, useEffect } from 'react'
import { Order, Business } from '../types'
import { orderApi, businessApi } from '../lib/api'

const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
    fetchBusinesses()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // TODO: 백엔드 API 연동
      // GET /api/orders
      // 응답 예시: { data: Order[], success: true }
      // const response = await orderApi.getAll()
      // if (response.success) {
      //   setOrders(response.data)
      // } else {
      //   throw new Error(response.message || '주문 정보를 불러오는데 실패했습니다.')
      // }
      
      // 목업 데이터 (개발용)
      const mockOrders: Order[] = [
        {
          id: 1,
          business_id: 1,
          total_price: 2400000,
          order_datetime: "2024-01-30T10:30:00",
          memo: "급한 주문입니다",
          source_type: "voice",
          transcribed_text: "고등어 50박스, 갈치 30박스 주문해주세요",
          delivery_date: "2024-02-05",
          status: "pending",
          items: [
            {
              id: 1,
              order_id: 1,
              fish_type_id: 1,
              quantity: 50,
              unit_price: 48000,
              unit: "박스",
            },
            {
              id: 2,
              order_id: 1,
              fish_type_id: 2,
              quantity: 30,
              unit_price: 65000,
              unit: "박스",
            },
          ],
        },
        {
          id: 2,
          business_id: 2,
          total_price: 1200000,
          order_datetime: "2024-01-29T14:15:00",
          memo: "정기 주문",
          source_type: "text",
          transcribed_text: "오징어 25박스 주문",
          delivery_date: "2024-02-03",
          status: "success",
          items: [
            {
              id: 3,
              order_id: 2,
              fish_type_id: 3,
              quantity: 25,
              unit_price: 48000,
              unit: "박스",
            },
          ],
        },
      ]
      
      setOrders(mockOrders)
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchBusinesses = async () => {
    try {
      // TODO: 백엔드 API 연동
      // const response = await businessApi.getAll()
      // if (response.success) {
      //   setBusinesses(response.data)
      // }
      
      // 목업 데이터 (개발용)
      const mockBusinesses: Business[] = [
        {
          id: 1,
          business_name: "동해수산",
          phone_number: "010-1234-5678",
          address: "강원도 동해시",
        },
        {
          id: 2,
          business_name: "바다마트",
          phone_number: "010-2345-6789",
          address: "부산시 해운대구",
        },
      ]
      
      setBusinesses(mockBusinesses)
    } catch (err) {
      console.error('거래처 정보를 불러오는데 실패했습니다:', err)
    }
  }

  const addOrder = async (orderData: Omit<Order, 'id'>) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // POST /api/orders
      // 요청 예시: { business_id: number, total_price: number, items: Array<{fish_type_id: number, quantity: number}> }
      // 응답 예시: { data: Order, success: true }
      // const response = await orderApi.create(orderData)
      // if (response.success) {
      //   setOrders(prev => [...prev, response.data])
      //   return response.data
      // } else {
      //   throw new Error(response.message || '주문 추가에 실패했습니다.')
      // }
      
      const newOrder: Order = {
        id: orders.length + 1,
        ...orderData,
      }
      
      setOrders(prev => [...prev, newOrder])
      return newOrder
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '주문 추가에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const updateOrder = async (id: number, orderData: Partial<Order>) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // PUT /api/orders/:id
      // 요청 예시: { business_id?: number, total_price?: number, status?: string }
      // 응답 예시: { data: Order, success: true }
      // const response = await orderApi.update(id, orderData)
      // if (response.success) {
      //   setOrders(prev => prev.map(order => 
      //     order.id === id ? response.data : order
      //   ))
      //   return response.data
      // } else {
      //   throw new Error(response.message || '주문 수정에 실패했습니다.')
      // }
      
      const updatedOrder: Order = {
        ...orders.find(o => o.id === id)!,
        ...orderData,
      }
      
      setOrders(prev => prev.map(order => 
        order.id === id ? updatedOrder : order
      ))
      return updatedOrder
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '주문 수정에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const deleteOrder = async (id: number) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // DELETE /api/orders/:id
      // 응답 예시: { success: true }
      // const response = await orderApi.delete(id)
      // if (response.success) {
      //   setOrders(prev => prev.filter(order => order.id !== id))
      // } else {
      //   throw new Error(response.message || '주문 삭제에 실패했습니다.')
      // }
      
      setOrders(prev => prev.filter(order => order.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '주문 삭제에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const updateOrderStatus = async (id: number, status: Order['status']) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // PATCH /api/orders/:id/status
      // 요청 예시: { status: 'success' | 'failed' | 'pending' }
      // 응답 예시: { data: Order, success: true }
      // const response = await orderApi.updateStatus(id, status)
      // if (response.success) {
      //   setOrders(prev => prev.map(order => 
      //     order.id === id ? response.data : order
      //   ))
      //   return response.data
      // } else {
      //   throw new Error(response.message || '주문 상태 업데이트에 실패했습니다.')
      // }
      
      const updatedOrder: Order = {
        ...orders.find(o => o.id === id)!,
        status,
      }
      
      setOrders(prev => prev.map(order => 
        order.id === id ? updatedOrder : order
      ))
      return updatedOrder
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '주문 상태 업데이트에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const getOrderById = (id: number) => {
    return orders.find(order => order.id === id)
  }

  const getBusinessById = (id: number) => {
    return businesses.find(business => business.id === id)
  }

  const searchOrders = (searchTerm: string) => {
    if (!searchTerm.trim()) return orders
    
    return orders.filter(order => {
      const business = getBusinessById(order.business_id)
      return business?.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             order.memo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             order.transcribed_text?.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }

  const getOrdersWithBusinesses = () => {
    return orders.map(order => ({
      ...order,
      business: getBusinessById(order.business_id)
    }))
  }

  return {
    orders,
    businesses,
    loading,
    error,
    fetchOrders,
    fetchBusinesses,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    getOrderById,
    getBusinessById,
    searchOrders,
    getOrdersWithBusinesses,
  }
}

export default useOrders 