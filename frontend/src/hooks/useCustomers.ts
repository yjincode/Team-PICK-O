import { useState, useEffect } from 'react'
import { Customer } from '../types'

const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      // 실제 API 호출로 대체
      const mockCustomers: Customer[] = [
        {
          id: 1,
          name: "동해수산",
          phone: "010-1234-5678",
          address: "강원도 동해시",
          total_purchases: 2400000,
          unpaid_amount: 2400000,
          created_at: "2024-01-30",
          updated_at: "2024-01-30",
        },
        {
          id: 2,
          name: "바다마트",
          phone: "010-2345-6789",
          address: "부산시 해운대구",
          total_purchases: 1200000,
          unpaid_amount: 0,
          created_at: "2024-01-29",
          updated_at: "2024-01-29",
        },
      ]
      setCustomers(mockCustomers)
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // 실제 API 호출로 대체
      const newCustomer: Customer = {
        id: customers.length + 1,
        ...customerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setCustomers(prev => [...prev, newCustomer])
      return newCustomer
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 추가에 실패했습니다.')
      throw err
    }
  }

  const updateCustomer = async (id: number, customerData: Partial<Customer>) => {
    try {
      // 실제 API 호출로 대체
      setCustomers(prev => prev.map(customer => 
        customer.id === id 
          ? { ...customer, ...customerData, updated_at: new Date().toISOString() }
          : customer
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 정보 수정에 실패했습니다.')
      throw err
    }
  }

  const deleteCustomer = async (id: number) => {
    try {
      // 실제 API 호출로 대체
      setCustomers(prev => prev.filter(customer => customer.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '고객 삭제에 실패했습니다.')
      throw err
    }
  }

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  }
}

export default useCustomers 