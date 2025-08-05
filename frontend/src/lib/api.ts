/**
 * API 라이브러리
 * 백엔드 API와의 통신을 담당하는 axios 인스턴스와 API 함수들을 정의합니다
 */
import axios from 'axios'
import { 
  Business, 
  Inventory, 
  Order, 
  FishType,
  Payment,
  SmsRecommendation,
  PriceData,
  ApiResponse 
} from '../types'


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'


// axios 인스턴스 생성
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

// 응답 인터셉터: 401 에러 시 자동 로그아웃
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

// 거래처 관리 API
export const businessApi = {
  // 모든 거래처 조회
  getAll: async (): Promise<ApiResponse<Business[]>> => {
    const response = await api.get('/businesses/')
    return response.data
  },

  // ID로 거래처 조회
  getById: async (id: number): Promise<ApiResponse<Business>> => {
    const response = await api.get(`/businesses/${id}`)
    return response.data
  },

  // 새 거래처 생성
  create: async (business: Omit<Business, 'id'>): Promise<ApiResponse<Business>> => {
    const response = await api.post('/businesses', business)
    return response.data
  },

  // 거래처 정보 수정
  update: async (id: number, business: Partial<Business>): Promise<ApiResponse<Business>> => {
    const response = await api.put(`/businesses/${id}`, business)
    return response.data
  },

  // 거래처 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/businesses/${id}`)
    return response.data
  },
}

// 어종 관리 API
export const fishTypeApi = {
  // 모든 어종 조회
  getAll: async (): Promise<ApiResponse<FishType[]>> => {
    const response = await api.get('/fish-types')
    return response.data
  },

  // ID로 어종 조회
  getById: async (id: number): Promise<ApiResponse<FishType>> => {
    const response = await api.get(`/fish-types/${id}`)
    return response.data
  },

  // 새 어종 생성
  create: async (fishType: Omit<FishType, 'id'>): Promise<ApiResponse<FishType>> => {
    const response = await api.post('/fish-types', fishType)
    return response.data
  },

  // 어종 정보 수정
  update: async (id: number, fishType: Partial<FishType>): Promise<ApiResponse<FishType>> => {
    const response = await api.put(`/fish-types/${id}`, fishType)
    return response.data
  },

  // 어종 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/fish-types/${id}`)
    return response.data
  },

  // 어종 검색 (벡터 검색)
  search: async (query: string): Promise<ApiResponse<FishType[]>> => {
    const response = await api.get('/fish-types/search', { params: { q: query } })
    return response.data
  },
}

// 재고 관리 API
export const inventoryApi = {
  // 모든 재고 조회
  getAll: async (): Promise<ApiResponse<Inventory[]>> => {
    const response = await api.get('/inventories')
    return response.data
  },

  // ID로 재고 조회
  getById: async (id: number): Promise<ApiResponse<Inventory>> => {
    const response = await api.get(`/inventories/${id}`)
    return response.data
  },

  // 새 재고 생성
  create: async (inventory: Omit<Inventory, 'id'>): Promise<ApiResponse<Inventory>> => {
    const response = await api.post('/inventories', inventory)
    return response.data
  },

  // 재고 정보 수정
  update: async (id: number, inventory: Partial<Inventory>): Promise<ApiResponse<Inventory>> => {
    const response = await api.put(`/inventories/${id}`, inventory)
    return response.data
  },

  // 재고 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/inventories/${id}`)
    return response.data
  },

  // 재고 수량 업데이트
  updateStock: async (id: number, quantity: number): Promise<ApiResponse<Inventory>> => {
    const response = await api.patch(`/inventories/${id}/stock`, { quantity })
    return response.data
  },
}

// 주문 관리 API
export const orderApi = {
  // 모든 주문 조회
  getAll: async (): Promise<ApiResponse<Order[]>> => {
    const response = await api.get('/orders')
    return response.data
  },

  // ID로 주문 조회
  getById: async (id: number): Promise<ApiResponse<Order>> => {
    const response = await api.get(`/orders/${id}`)
    return response.data
  },

  // 새 주문 생성
  create: async (order: Omit<Order, 'id'>): Promise<ApiResponse<Order>> => {
    const response = await api.post('/orders', order)
    return response.data
  },

  // 주문 정보 수정
  update: async (id: number, order: Partial<Order>): Promise<ApiResponse<Order>> => {
    const response = await api.put(`/orders/${id}`, order)
    return response.data
  },

  // 주문 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/orders/${id}`)
    return response.data
  },

  // 주문 상태 업데이트
  updateStatus: async (id: number, status: Order['status']): Promise<ApiResponse<Order>> => {
    const response = await api.patch(`/orders/${id}/status`, { status })
    return response.data
  },
}


// 결제 관리 API
export const paymentApi = {
  // 모든 결제 조회
  getAll: async (): Promise<ApiResponse<Payment[]>> => {
    const response = await api.get('/payments')
    return response.data
  },

  // ID로 결제 조회
  getById: async (id: number): Promise<ApiResponse<Payment>> => {
    const response = await api.get(`/payments/${id}`)
    return response.data
  },

  // 새 결제 생성
  create: async (payment: Omit<Payment, 'id' | 'created_at'>): Promise<ApiResponse<Payment>> => {
    const response = await api.post('/payments', payment)
    return response.data
  },

  // 결제 정보 수정
  update: async (id: number, payment: Partial<Payment>): Promise<ApiResponse<Payment>> => {
    const response = await api.put(`/payments/${id}`, payment)
    return response.data
  },

  // 결제 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/payments/${id}`)
    return response.data
  },
}

// SMS 추천 API
export const smsRecommendationApi = {
  // 모든 SMS 추천 조회
  getAll: async (): Promise<ApiResponse<SmsRecommendation[]>> => {
    const response = await api.get('/sms-recommendations')
    return response.data
  },

  // ID로 SMS 추천 조회
  getById: async (id: number): Promise<ApiResponse<SmsRecommendation>> => {
    const response = await api.get(`/sms-recommendations/${id}`)
    return response.data
  },

  // 새 SMS 추천 생성
  create: async (recommendation: Omit<SmsRecommendation, 'id' | 'created_at'>): Promise<ApiResponse<SmsRecommendation>> => {
    const response = await api.post('/sms-recommendations', recommendation)
    return response.data
  },

  // SMS 추천 정보 수정
  update: async (id: number, recommendation: Partial<SmsRecommendation>): Promise<ApiResponse<SmsRecommendation>> => {
    const response = await api.put(`/sms-recommendations/${id}`, recommendation)
    return response.data
  },

  // SMS 추천 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/sms-recommendations/${id}`)
    return response.data
  },

  // SMS 발송 상태 업데이트
  updateSentStatus: async (id: number, isSent: boolean): Promise<ApiResponse<SmsRecommendation>> => {
    const response = await api.patch(`/sms-recommendations/${id}/sent`, { is_sent: isSent })
    return response.data
  },
}

// 시세 데이터 API
export const priceDataApi = {
  // 모든 시세 데이터 조회
  getAll: async (): Promise<ApiResponse<PriceData[]>> => {
    const response = await api.get('/price-data')
    return response.data
  },

  // 어종별 시세 데이터 조회
  getByFishType: async (fishType: string): Promise<ApiResponse<PriceData[]>> => {
    const response = await api.get(`/price-data/fish-type/${fishType}`)
    return response.data
  },

  // 새 시세 데이터 생성
  create: async (priceData: Omit<PriceData, 'id'>): Promise<ApiResponse<PriceData>> => {
    const response = await api.post('/price-data', priceData)
    return response.data
  },

  // 시세 데이터 수정
  update: async (id: number, priceData: Partial<PriceData>): Promise<ApiResponse<PriceData>> => {
    const response = await api.put(`/price-data/${id}`, priceData)
    return response.data
  },

  // 시세 데이터 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/price-data/${id}`)
    return response.data
  },
}


// Firebase Auth API
export const authApi = {
  // 사용자 등록 (회원가입)
  register: async (userData: any): Promise<any> => {
    const response = await api.post('/auth/register/', userData)
    return response.data
  },
  
  // 사용자 등록 (별칭 - LoginPage 호환성)
  registerUser: async (userData: any): Promise<any> => {
    const response = await api.post('/auth/register/', userData)
    return response.data
  },
  
  // 사용자 상태 확인
  checkUserStatus: async (firebaseUid: string): Promise<any> => {
    const response = await api.get(`/auth/status/?firebase_uid=${firebaseUid}`)
    return response.data
  },
  

  // 로그아웃
  logout: async (): Promise<ApiResponse<void>> => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/auth/me')
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

// 기존 호환성을 위한 별칭 (점진적 마이그레이션)
export const customerApi = businessApi