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
  ApiResponse,
  PaginatedResponse
} from '../types'


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'


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
    console.log('🌐 API 요청:', {
      url: config.url,
      method: config.method?.toUpperCase(),
      hasToken: !!firebaseToken,
      tokenPreview: firebaseToken ? firebaseToken.substring(0, 20) + '...' : 'None'
    });
    
    if (firebaseToken) {
      config.headers.Authorization = `Bearer ${firebaseToken}`
    }
    return config
  },
  (error) => {
    console.error('🚫 API 요청 오류:', error);
    return Promise.reject(error)
  }
)

// 응답 인터셉터: 401 에러 시 자동 로그아웃
api.interceptors.response.use(
  (response) => {
    console.log('✅ API 성공:', {
      url: response.config.url,
      status: response.status,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  (error) => {
    console.error('❌ API 오류:', {
      url: error.config?.url,
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      message: error.response?.data?.message || error.message
    });
    
    if (error.response?.status === 401) {
      console.log('🚫 401 오류 - 인증 실패');
      // 자동 리다이렉트 제거 - AuthContext에서 처리하도록 함
    }
    return Promise.reject(error)
  }
)

// 거래처 관리 API
export const businessApi = {
  // 모든 거래처 조회 (페이지네이션 지원)
  getAll: async (params?: { page?: number; page_size?: number }): Promise<ApiResponse<PaginatedResponse<Business>>> => {
    const response = await api.get('/business/customers/', { params });
    return response.data;
  },

  // ID로 거래처 조회
  getById: async (id: number): Promise<ApiResponse<Business>> => {
    const response = await api.get(`/business/customers/${id}`)
    return response.data
  },

  // 새 거래처 생성
  create: async (business: Omit<Business, 'id'>): Promise<ApiResponse<Business>> => {
    const response = await api.post('/business/customers/create/', business)
    return response.data
  },

  // 거래처 정보 수정
  update: async (id: number, business: Partial<Business>): Promise<ApiResponse<Business>> => {
    const response = await api.put(`/business/customers/${id}/`, business)
    return response.data
  },

  // 거래처 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/business/customers/${id}/`)
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
  getAll: async (params?: { search?: string; status?: string }): Promise<ApiResponse<Inventory[]>> => {
    const response = await api.get('/inventory/', { params })
    return response.data
  },
  
  // 어종 목록 조회 (재고 추가시 선택용)
  getFishTypes: async (): Promise<ApiResponse<FishType[]>> => {
    const response = await api.get('/inventory/fish-types/')
    return response.data
  },

  // ID로 재고 조회
  getById: async (id: number): Promise<ApiResponse<Inventory>> => {
    const response = await api.get(`/inventory/${id}/`)
    return response.data
  },

  // 새 재고 생성
  create: async (inventory: { fish_type_id: number; stock_quantity: number; unit: string; status: string; aquarium_photo_path?: string }): Promise<ApiResponse<Inventory>> => {
    const response = await api.post('/inventory/', inventory)
    return response.data
  },

  // 재고 정보 수정
  update: async (id: number, inventory: Partial<Inventory>): Promise<ApiResponse<Inventory>> => {
    const response = await api.put(`/inventory/${id}/`, inventory)
    return response.data
  },

  // 재고 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/inventory/${id}/`)
    return response.data
  },

  // 재고 로그 조회
  getLogs: async (inventoryId?: number): Promise<ApiResponse<any[]>> => {
    const url = inventoryId ? `/inventory/${inventoryId}/logs/` : '/inventory/logs/'
    const response = await api.get(url)
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

// Firebase Auth API
export const authApi = {
  // 사용자 등록 (회원가입)
  register: async (userData: any): Promise<any> => {
    const response = await api.post('/business/auth/register/', userData)
    return response.data
  },
  
  // 사용자 등록 (별칭 - LoginPage 호환성)
  registerUser: async (userData: any): Promise<any> => {
    const response = await api.post('/business/auth/register/', userData)
    return response.data
  },
  
  // 사용자 상태 확인
  checkUserStatus: async (firebaseUid: string): Promise<any> => {
    const response = await api.get(`/business/auth/status/?firebase_uid=${firebaseUid}`)
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