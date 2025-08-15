/**
 * API 라이브러리
 * 백엔드 API와의 통신을 담당하는 axios 인스턴스와 API 함수들을 정의합니다
 */
import axios from 'axios'
import {
  Business,
  FishType,
  Inventory,
  Order,
  Payment,
  TossConfirmRequest,
  MarkPaidRequest,
  UnpaidOrder,
  ARSummary,
  ApiResponse,
  PaginatedResponse,
  RefundRequest,
  RefundResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  OrderListItem
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

console.log('🚀 API 인스턴스 생성됨:', {
  baseURL: API_BASE_URL,
  fullURL: `${API_BASE_URL}/business/auth/firebase-to-jwt/`
})


// Request interceptor (JWT 토큰 전용, 매우 간단하고 빠름)

import { TokenManager } from './tokenManager'

// 토큰 갱신 중인지 추적
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

// 액세스 토큰 자동 갱신 함수
const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) {
    return await refreshPromise
  }

  isRefreshing = true
  refreshPromise = new Promise(async (resolve) => {
    try {
      const refreshToken = TokenManager.getRefreshToken()

      if (!refreshToken) {
        resolve(null)
        return
      }
      
      console.log('🔄 액세스 토큰 자동 갱신 시작')
      
      const response = await fetch(`${API_BASE_URL}/business/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newAccessToken = data.access_token

        TokenManager.setAccessToken(newAccessToken)
        console.log('✅ 액세스 토큰 자동 갱신 성공')

        resolve(newAccessToken)
      } else {
        console.log('❌ 토큰 갱신 실패 - 리로그인 필요')
        TokenManager.removeTokens()
        resolve(null)
      }
    } catch (error) {
      console.error('❌ 토큰 갱신 오류:', error)
      TokenManager.removeTokens()
      resolve(null)
    }
  })

  const result = await refreshPromise
  isRefreshing = false
  refreshPromise = null

  return result
}

api.interceptors.request.use(
  async (config) => {
    // 🔥 토큰이 필요하지 않은 엔드포인트들
    const publicEndpoints = [
      '/business/auth/firebase-to-jwt/',
      '/business/auth/register/',
      '/business/auth/refresh/'
    ]

    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint))

    if (isPublicEndpoint) {
      console.log('🔓 공개 엔드포인트 - 토큰 없이 요청:', config.url)
      return config
    }

    // 일반 엔드포인트는 토큰 필요
    let accessToken = TokenManager.getAccessToken()

    // 액세스 토큰이 없거나 만료된 경우 갱신 시도
    if (!accessToken || !TokenManager.isAccessTokenValid()) {
      console.log('🔄 액세스 토큰 갱신 필요')
      accessToken = await refreshAccessToken()

      // 갱신에 실패한 경우 로그인 페이지로 리다이렉트
      if (!accessToken) {
        window.location.href = '/login'
        return Promise.reject(new Error('토큰 갱신 실패'))
      }
    }

    // Authorization 헤더에 액세스 토큰 추가
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }



    console.log('🚀 자동 토큰 갱신 API 요청:', {
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method?.toUpperCase(),
      hasAccessToken: !!accessToken,
      tokenTimeLeft: TokenManager.getAccessTokenTimeUntilExpiry() + '초',
      headers: config.headers
    });

    return config
  },
  (error) => {
    console.error('🚫 API 요청 오류:', error);
    return Promise.reject(error)
  }
)

// 응답 인터셉터: 401 오류 시 토큰 갱신 재시도
api.interceptors.response.use(
  (response) => {
    console.log('✅ 자동 토큰 갱신 API 성공:', {
      url: response.config.url,
      status: response.status,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  async (error) => {
    console.error('❌ API 오류:', {
      url: error.config?.url,
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      message: error.response?.data?.error || error.message
    });

    // 401 오류 시 토큰 갱신 후 재시도
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      console.log('🔄 401 오류로 인한 토큰 갱신 및 재시도');
      
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // 새로운 액세스 토큰으로 원래 요청 재시도
        error.config.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(error.config);
      } else {
        // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
        console.log('🚫 토큰 갱신 실패 - 로그인 페이지로 이동');
        TokenManager.removeTokens();
        window.location.href = '/login';
      }
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
  getAll: async (): Promise<{ data: FishType[] }> => {
    const response = await api.get('/fish-registry/fish-types/')
    return { data: response.data }
  },

  // ID로 어종 조회
  getById: async (id: number): Promise<{ data: FishType }> => {
    const response = await api.get(`/fish-registry/fish-types/${id}/`)
    return { data: response.data }
  },

  // 새 어종 생성
  create: async (fishType: Omit<FishType, 'id' | 'created_at'>): Promise<{ data: FishType }> => {
    const response = await api.post('/fish-registry/fish-types/', fishType)
    return { data: response.data }
  },

  // 어종 정보 수정
  update: async (id: number, fishType: Partial<FishType>): Promise<{ data: FishType }> => {
    const response = await api.put(`/fish-registry/fish-types/${id}/`, fishType)
    return { data: response.data }
  },

  // 어종 삭제
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fish-registry/fish-types/${id}/`)
  },

  // 어종 검색
  search: async (query: string): Promise<{ data: FishType[] }> => {
    const response = await api.get('/fish-registry/fish-types/', { params: { search: query } })
    return { data: response.data }
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
  getFishTypes: async (): Promise<{ data: FishType[] }> => {
    const response = await api.get('/fish-registry/fish-types/')
    return { data: response.data }
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

  // 주문 등록 시 재고 체크
  checkStock: async (orderItems: Array<{
    fish_type_id: number;
    quantity: number;
    unit: string;
  }>): Promise<{
    status: 'ok' | 'warning' | 'insufficient' | 'error';
    items: Array<{
      fish_type_id: number;
      fish_name: string;
      requested_quantity: number;
      available_stock: number;
      unit: string;
      status: string;
      shortage?: number;
    }>;
    warnings: string[];
    errors: Array<{
      fish_name?: string;
      fish_type_id?: number;
      message: string;
      shortage?: number;
    }>;
    can_proceed: boolean;
  }> => {
    const response = await api.post('/inventory/stock-check/', { order_items: orderItems })
    return response.data
  },
}

// 주문 관리 API
export const orderApi = {
  // 모든 주문 조회 (페이지네이션) - OrderListSerializer 사용
  getAll: async (params?: { page?: number; page_size?: number }): Promise<ApiResponse<OrderListItem[]>> => {
    const response = await api.get('/orders/', { params })
    return response.data
  },

  // 주문 상세 조회 - OrderDetailSerializer 사용
  getById: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}/`)
    return response.data
  },

  // 새 주문 생성
  create: async (order: Omit<Order, 'id'>): Promise<ApiResponse<Order>> => {
    const response = await api.post('/orders/upload/', order)
    return response.data
  },

  // 주문 정보 수정
  update: async (id: number, order: Partial<Order>): Promise<ApiResponse<Order>> => {
    const response = await api.put(`/orders/${id}/`, order)
    return response.data
  },

  // 주문 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/orders/${id}/`)
    return response.data
  },

  // 주문 상태 업데이트
  updateStatus: async (id: number, status: Order['order_status']): Promise<ApiResponse<Order>> => {
    const response = await api.patch(`/orders/${id}/status/`, { order_status: status })
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
  getAll: async (params?: { page?: number; page_size?: number }): Promise<ApiResponse<Order[]>> => {
    const response = await api.get('/orders/', { params })
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

// STT (Speech-to-Text) API
export const sttApi = {
  // 음성 파일을 텍스트로 변환
  transcribe: async (audioFile: File, language: string = 'ko'): Promise<{
    message: string;
    transcription: string;
    language: string;
  }> => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('language', language)

    // STT API는 인증이 필요 없으므로 직접 fetch 사용
    const response = await fetch(`${API_BASE_URL}/transcription/transcribe/`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'STT 변환 실패')
    }

    return await response.json()
  },
}

// ==================== 결제 관리 API ====================

export const paymentApi = {
  // 토스 페이먼츠 결제 확정
  confirmToss: async (data: TossConfirmRequest): Promise<ApiResponse<any>> => {
    const response = await api.post('/payments/toss/confirm/', data)
    return response.data
  },

  // 수동 결제 완료 (현금/계좌이체)
  markPaid: async (data: MarkPaidRequest): Promise<ApiResponse<any>> => {
    const response = await api.post('/payments/mark-paid/', data)
    return response.data
  },

  // 환불 처리
  refund: async (data: RefundRequest): Promise<ApiResponse<RefundResponse>> => {
    const response = await api.post('/payments/refund/', data)
    return response.data
  },

  // 주문 취소
  cancelOrder: async (data: CancelOrderRequest): Promise<ApiResponse<CancelOrderResponse>> => {
    const response = await api.post('/payments/cancel-order/', data)
    return response.data
  },
}

// ==================== 미수금(AR) 조회 API ====================

export const arApi = {
  // 미결제 주문 목록 조회
  getUnpaidOrders: async (params?: {
    businessId?: number;
    from?: string;
    to?: string
  }): Promise<UnpaidOrder[]> => {
    const response = await api.get('/payments/ar/unpaid-orders/', { params })
    return response.data
  },

  // 거래처별 미수금 요약
  getSummary: async (): Promise<ARSummary[]> => {
    const response = await api.get('/payments/ar/summary/')
    return response.data
  },
}

// 기존 호환성을 위한 별칭 (점진적 마이그레이션)
export const customerApi = businessApi

export { api }