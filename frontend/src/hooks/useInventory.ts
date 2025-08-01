import { useState, useEffect } from 'react'
import { FishItem } from '../types'

const useInventory = () => {
  const [inventory, setInventory] = useState<FishItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      // 실제 API 호출로 대체
      const mockInventory: FishItem[] = [
        {
          id: 1,
          name: "고등어",
          type: "생선",
          quantity: 150,
          price: 48000,
          status: "available",
          created_at: "2024-01-30",
          updated_at: "2024-01-30",
        },
        {
          id: 2,
          name: "갈치",
          type: "생선",
          quantity: 80,
          price: 65000,
          status: "available",
          created_at: "2024-01-30",
          updated_at: "2024-01-30",
        },
        {
          id: 3,
          name: "오징어",
          type: "어류",
          quantity: 25,
          price: 85000,
          status: "available",
          created_at: "2024-01-29",
          updated_at: "2024-01-29",
        },
      ]
      setInventory(mockInventory)
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (itemData: Omit<FishItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // 실제 API 호출로 대체
      const newItem: FishItem = {
        id: inventory.length + 1,
        ...itemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setInventory(prev => [...prev, newItem])
      return newItem
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 추가에 실패했습니다.')
      throw err
    }
  }

  const updateItem = async (id: number, itemData: Partial<FishItem>) => {
    try {
      // 실제 API 호출로 대체
      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { ...item, ...itemData, updated_at: new Date().toISOString() }
          : item
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 정보 수정에 실패했습니다.')
      throw err
    }
  }

  const deleteItem = async (id: number) => {
    try {
      // 실제 API 호출로 대체
      setInventory(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 삭제에 실패했습니다.')
      throw err
    }
  }

  const updateStock = async (id: number, quantity: number) => {
    try {
      // 실제 API 호출로 대체
      setInventory(prev => prev.map(item => 
        item.id === id 
          ? { ...item, quantity, updated_at: new Date().toISOString() }
          : item
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 수량 수정에 실패했습니다.')
      throw err
    }
  }

  return {
    inventory,
    loading,
    error,
    fetchInventory,
    addItem,
    updateItem,
    deleteItem,
    updateStock,
  }
}

export default useInventory 