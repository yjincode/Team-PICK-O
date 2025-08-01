import { useState, useEffect } from 'react'
import { Order } from '../types'

const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      // 실제 API 호출로 대체
      const mockOrders: Order[] = [
        {
          id: 1,
          customer_id: 1,
          customer_name: "동해수산",
          total_amount: 2400000,
          status: "pending",
          payment_status: "unpaid",
          created_at: "2024-01-30",
          updated_at: "2024-01-30",
          items: [
            {
              id: 1,
              order_id: 1,
              fish_item_id: 1,
              fish_name: "고등어",
              quantity: 50,
              price: 48000,
              total_price: 2400000,
            },
          ],
        },
        {
          id: 2,
          customer_id: 2,
          customer_name: "바다마트",
          total_amount: 1200000,
          status: "completed",
          payment_status: "paid",
          created_at: "2024-01-29",
          updated_at: "2024-01-29",
          items: [
            {
              id: 2,
              order_id: 2,
              fish_item_id: 3,
              fish_name: "오징어",
              quantity: 25,
              price: 48000,
              total_price: 1200000,
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

  const addOrder = async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // 실제 API 호출로 대체
      const newOrder: Order = {
        id: orders.length + 1,
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setOrders(prev => [...prev, newOrder])
      return newOrder
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 추가에 실패했습니다.')
      throw err
    }
  }

  const updateOrder = async (id: number, orderData: Partial<Order>) => {
    try {
      // 실제 API 호출로 대체
      setOrders(prev => prev.map(order => 
        order.id === id 
          ? { ...order, ...orderData, updated_at: new Date().toISOString() }
          : order
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 정보 수정에 실패했습니다.')
      throw err
    }
  }

  const deleteOrder = async (id: number) => {
    try {
      // 실제 API 호출로 대체
      setOrders(prev => prev.filter(order => order.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 삭제에 실패했습니다.')
      throw err
    }
  }

  const updateOrderStatus = async (id: number, status: Order['status']) => {
    try {
      // 실제 API 호출로 대체
      setOrders(prev => prev.map(order => 
        order.id === id 
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 상태 수정에 실패했습니다.')
      throw err
    }
  }

  return {
    orders,
    loading,
    error,
    fetchOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
  }
}

export default useOrders 