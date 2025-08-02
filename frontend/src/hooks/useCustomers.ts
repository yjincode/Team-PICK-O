/**
 * 거래처 관리 훅
 * 거래처 정보를 조회하고 관리하는 커스텀 훅입니다
 */
import { useState, useEffect } from 'react'
import { Business } from '../types'
import { businessApi } from '../lib/api'

const useCustomers = () => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // TODO: 백엔드 API 연동
      // GET /api/businesses
      // 응답 예시: { data: Business[], success: true }
      // const response = await businessApi.getAll()
      // if (response.success) {
      //   setBusinesses(response.data)
      // } else {
      //   throw new Error(response.message || '거래처 정보를 불러오는데 실패했습니다.')
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
      setError(err instanceof Error ? err.message : '거래처 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const addBusiness = async (businessData: Omit<Business, 'id'>) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // POST /api/businesses
      // 요청 예시: { business_name: string, phone_number: string, address?: string }
      // 응답 예시: { data: Business, success: true }
      // const response = await businessApi.create(businessData)
      // if (response.success) {
      //   setBusinesses(prev => [...prev, response.data])
      //   return response.data
      // } else {
      //   throw new Error(response.message || '거래처 추가에 실패했습니다.')
      // }
      
      const newBusiness: Business = {
        id: businesses.length + 1,
        ...businessData,
      }
      
      setBusinesses(prev => [...prev, newBusiness])
      return newBusiness
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '거래처 추가에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const updateBusiness = async (id: number, businessData: Partial<Business>) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // PUT /api/businesses/:id
      // 요청 예시: { business_name?: string, phone_number?: string, address?: string }
      // 응답 예시: { data: Business, success: true }
      // const response = await businessApi.update(id, businessData)
      // if (response.success) {
      //   setBusinesses(prev => prev.map(business => 
      //     business.id === id ? response.data : business
      //   ))
      //   return response.data
      // } else {
      //   throw new Error(response.message || '거래처 수정에 실패했습니다.')
      // }
      
      const updatedBusiness: Business = {
        ...businesses.find(b => b.id === id)!,
        ...businessData,
      }
      
      setBusinesses(prev => prev.map(business => 
        business.id === id ? updatedBusiness : business
      ))
      return updatedBusiness
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '거래처 수정에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const deleteBusiness = async (id: number) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // DELETE /api/businesses/:id
      // 응답 예시: { success: true }
      // const response = await businessApi.delete(id)
      // if (response.success) {
      //   setBusinesses(prev => prev.filter(business => business.id !== id))
      // } else {
      //   throw new Error(response.message || '거래처 삭제에 실패했습니다.')
      // }
      
      setBusinesses(prev => prev.filter(business => business.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '거래처 삭제에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const getBusinessById = (id: number) => {
    return businesses.find(business => business.id === id)
  }

  const searchBusinesses = (searchTerm: string) => {
    if (!searchTerm.trim()) return businesses
    
    return businesses.filter(business => 
      business.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.phone_number.includes(searchTerm) ||
      (business.address && business.address.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  return {
    businesses,
    loading,
    error,
    fetchBusinesses,
    addBusiness,
    updateBusiness,
    deleteBusiness,
    getBusinessById,
    searchBusinesses,
  }
}

export default useCustomers 