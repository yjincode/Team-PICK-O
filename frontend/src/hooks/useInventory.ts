/**
 * 재고 관리 훅
 * 재고 정보를 조회하고 관리하는 커스텀 훅입니다
 */
import { useState, useEffect } from 'react'
import { Inventory, FishType } from '../types'
import { inventoryApi, fishTypeApi } from '../lib/api'

const useInventory = () => {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [fishTypes, setFishTypes] = useState<FishType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInventory()
    fetchFishTypes()
  }, [])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // TODO: 백엔드 API 연동
      // GET /api/inventories
      // 응답 예시: { data: Inventory[], success: true }
      // const response = await inventoryApi.getAll()
      // if (response.success) {
      //   setInventory(response.data)
      // } else {
      //   throw new Error(response.message || '재고 정보를 불러오는데 실패했습니다.')
      // }
      
      // 목업 데이터 (개발용)
      const mockInventory: Inventory[] = [
        {
          id: 1,
          fish_type_id: 1,
          stock_quantity: 150,
          unit: "박스",
          status: "available",
          aquarium_photo_path: "/photos/godeung-eo.jpg",
        },
        {
          id: 2,
          fish_type_id: 2,
          stock_quantity: 80,
          unit: "박스",
          status: "available",
          aquarium_photo_path: "/photos/galchi.jpg",
        },
        {
          id: 3,
          fish_type_id: 3,
          stock_quantity: 25,
          unit: "박스",
          status: "low",
          aquarium_photo_path: "/photos/ojingeo.jpg",
        },
      ]
      
      setInventory(mockInventory)
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchFishTypes = async () => {
    try {
      // TODO: 백엔드 API 연동
      // GET /api/fish-types
      // const response = await fishTypeApi.getAll()
      // if (response.success) {
      //   setFishTypes(response.data)
      // }
      
      // 목업 데이터 (개발용)
      const mockFishTypes: FishType[] = [
        {
          id: 1,
          fish_name: "고등어",
          aliases: ["광어", "넙치"],
        },
        {
          id: 2,
          fish_name: "갈치",
          aliases: ["가자미"],
        },
        {
          id: 3,
          fish_name: "오징어",
          aliases: ["문어"],
        },
      ]
      
      setFishTypes(mockFishTypes)
    } catch (err) {
      console.error('어종 정보를 불러오는데 실패했습니다:', err)
    }
  }

  const addInventory = async (inventoryData: Omit<Inventory, 'id'>) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // POST /api/inventories
      // 요청 예시: { fish_type_id: number, stock_quantity: number, unit?: string, status?: string }
      // 응답 예시: { data: Inventory, success: true }
      // const response = await inventoryApi.create(inventoryData)
      // if (response.success) {
      //   setInventory(prev => [...prev, response.data])
      //   return response.data
      // } else {
      //   throw new Error(response.message || '재고 추가에 실패했습니다.')
      // }
      
      const newInventory: Inventory = {
        id: inventory.length + 1,
        ...inventoryData,
      }
      
      setInventory(prev => [...prev, newInventory])
      return newInventory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '재고 추가에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const updateInventory = async (id: number, inventoryData: Partial<Inventory>) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // PUT /api/inventories/:id
      // 요청 예시: { fish_type_id?: number, stock_quantity?: number, unit?: string, status?: string }
      // 응답 예시: { data: Inventory, success: true }
      // const response = await inventoryApi.update(id, inventoryData)
      // if (response.success) {
      //   setInventory(prev => prev.map(item => 
      //     item.id === id ? response.data : item
      //   ))
      //   return response.data
      // } else {
      //   throw new Error(response.message || '재고 수정에 실패했습니다.')
      // }
      
      const updatedInventory: Inventory = {
        ...inventory.find(item => item.id === id)!,
        ...inventoryData,
      }
      
      setInventory(prev => prev.map(item => 
        item.id === id ? updatedInventory : item
      ))
      return updatedInventory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '재고 수정에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const deleteInventory = async (id: number) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // DELETE /api/inventories/:id
      // 응답 예시: { success: true }
      // const response = await inventoryApi.delete(id)
      // if (response.success) {
      //   setInventory(prev => prev.filter(item => item.id !== id))
      // } else {
      //   throw new Error(response.message || '재고 삭제에 실패했습니다.')
      // }
      
      setInventory(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '재고 삭제에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const updateStock = async (id: number, quantity: number) => {
    try {
      setError(null)
      
      // TODO: 백엔드 API 연동
      // PATCH /api/inventories/:id/stock
      // 요청 예시: { quantity: number }
      // 응답 예시: { data: Inventory, success: true }
      // const response = await inventoryApi.updateStock(id, quantity)
      // if (response.success) {
      //   setInventory(prev => prev.map(item => 
      //     item.id === id ? response.data : item
      //   ))
      //   return response.data
      // } else {
      //   throw new Error(response.message || '재고 수량 업데이트에 실패했습니다.')
      // }
      
      const updatedInventory: Inventory = {
        ...inventory.find(item => item.id === id)!,
        stock_quantity: quantity,
      }
      
      setInventory(prev => prev.map(item => 
        item.id === id ? updatedInventory : item
      ))
      return updatedInventory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '재고 수량 업데이트에 실패했습니다.'
      setError(errorMessage)
      throw err
    }
  }

  const getInventoryById = (id: number) => {
    return inventory.find(item => item.id === id)
  }

  const getFishTypeById = (id: number) => {
    return fishTypes.find(fishType => fishType.id === id)
  }

  const searchInventory = (searchTerm: string) => {
    if (!searchTerm.trim()) return inventory
    
    return inventory.filter(item => {
      const fishType = getFishTypeById(item.fish_type_id)
      return fishType?.fish_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             fishType?.aliases?.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()))
    })
  }

  const getInventoryWithFishTypes = () => {
    return inventory.map(item => ({
      ...item,
      fish_type: getFishTypeById(item.fish_type_id)
    }))
  }

  return {
    inventory,
    fishTypes,
    loading,
    error,
    fetchInventory,
    fetchFishTypes,
    addInventory,
    updateInventory,
    deleteInventory,
    updateStock,
    getInventoryById,
    getFishTypeById,
    searchInventory,
    getInventoryWithFishTypes,
  }
}

export default useInventory 