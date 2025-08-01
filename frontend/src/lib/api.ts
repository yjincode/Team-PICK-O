import axios from 'axios'
import { Customer, FishItem, Order, ApiResponse } from '../types'

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
      localStorage.removeItem('token')
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

// Auth API
export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  refresh: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.post('/auth/refresh')
    return response.data
  },
}

export default api 