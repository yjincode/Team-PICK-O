import axios from 'axios'
import { Customer, FishItem, Order, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (Firebase 토큰 사용)
api.interceptors.request.use(
  (config) => {
    const firebaseToken = localStorage.getItem('firebase_token')
    if (firebaseToken) {
      config.headers.Authorization = `Bearer ${firebaseToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('firebase_token')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Customer API
export const customerApi = {
  getAll: async (): Promise<ApiResponse<Customer[]>> => {
    const response = await api.get('/customers')
    return response.data
  },

  getById: async (id: number): Promise<ApiResponse<Customer>> => {
    const response = await api.get(`/customers/${id}`)
    return response.data
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Customer>> => {
    const response = await api.post('/customers', customer)
    return response.data
  },

  update: async (id: number, customer: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    const response = await api.put(`/customers/${id}`, customer)
    return response.data
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/customers/${id}`)
    return response.data
  },
}

// Inventory API
export const inventoryApi = {
  getAll: async (): Promise<ApiResponse<FishItem[]>> => {
    const response = await api.get('/inventory')
    return response.data
  },

  getById: async (id: number): Promise<ApiResponse<FishItem>> => {
    const response = await api.get(`/inventory/${id}`)
    return response.data
  },

  create: async (item: Omit<FishItem, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FishItem>> => {
    const response = await api.post('/inventory', item)
    return response.data
  },

  update: async (id: number, item: Partial<FishItem>): Promise<ApiResponse<FishItem>> => {
    const response = await api.put(`/inventory/${id}`, item)
    return response.data
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/inventory/${id}`)
    return response.data
  },

  updateStock: async (id: number, quantity: number): Promise<ApiResponse<FishItem>> => {
    const response = await api.patch(`/inventory/${id}/stock`, { quantity })
    return response.data
  },
}

// Orders API
export const orderApi = {
  getAll: async (): Promise<ApiResponse<Order[]>> => {
    const response = await api.get('/orders')
    return response.data
  },

  getById: async (id: number): Promise<ApiResponse<Order>> => {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  create: async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Order>> => {
    const response = await api.post('/orders', order)
    return response.data
  },

  update: async (id: number, order: Partial<Order>): Promise<ApiResponse<Order>> => {
    const response = await api.put(`/orders/${id}`, order)
    return response.data
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/orders/${id}`)
    return response.data
  },

  updateStatus: async (id: number, status: Order['status']): Promise<ApiResponse<Order>> => {
    const response = await api.patch(`/orders/${id}/status`, { status })
    return response.data
  },
}

// Firebase Auth API
export const authApi = {
  // 사용자 등록 (회원가입)
  register: async (userData: any): Promise<any> => {
    const response = await api.post('/core/auth/register/', userData)
    return response.data
  },
  
  // 사용자 등록 (별칭 - LoginPage 호환성)
  registerUser: async (userData: any): Promise<any> => {
    const response = await api.post('/core/auth/register/', userData)
    return response.data
  },
  
  // 사용자 상태 확인
  checkUserStatus: async (firebaseUid: string): Promise<any> => {
    const response = await api.get(`/core/auth/status/?firebase_uid=${firebaseUid}`)
    return response.data
  },
  
  // 승인 대기 사용자 목록 (개발/테스트용)
  getPendingUsers: async (): Promise<any> => {
    const response = await api.get('/core/auth/pending/')
    return response.data
  },
}

// Sales API
export const salesApi = {
  getAll: async (): Promise<any> => {
    const response = await api.get('/sales')
    return response.data
  },

  getChart: async (): Promise<any> => {
    const response = await api.get('/sales/chart')
    return response.data
  },

  getAuctionPrediction: async (): Promise<any> => {
    const response = await api.get('/sales/auction-prediction')
    return response.data
  },
}

// AI API
export const aiApi = {
  getLogs: async (): Promise<any> => {
    const response = await api.get('/ai/logs')
    return response.data
  },

  runAnalysis: async (data: any): Promise<any> => {
    const response = await api.post('/ai/analysis', data)
    return response.data
  },
}

export default api 