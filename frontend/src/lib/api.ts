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
  DjangoApiResponse,
  OrderListResponse,
  RefundRequest,
  RefundResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  OrderListItem,
  DocumentRequest,
  DocumentRequestResponse
} from '../types'


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'



// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 기본 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
})
import { TokenManager } from './tokenManager'

// 토큰 갱신 중인지 추적 (중복 요청 방지)
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

// 토큰 갱신 함수 (TokenManager에 위임)
const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) {
    return await refreshPromise
  }

  isRefreshing = true
  refreshPromise = TokenManager.refreshToken()

  try {
    const result = await refreshPromise
    return result
  } finally {
    isRefreshing = false
    refreshPromise = null
  }
}

// Request 인터셉터: 토큰 자동 추가
api.interceptors.request.use(
  async (config) => {
    // 토큰이 필요하지 않은 공개 엔드포인트
    const publicEndpoints = [
      '/business/auth/firebase-to-jwt/',
      '/business/auth/register/',
      '/business/auth/refresh/',
      '/transcription/transcribe/',
      '/transcription/parse-text/'
    ]

    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint))
    
    if (isPublicEndpoint) {
      return config
    }

    // 일반 엔드포인트는 토큰 필요
    const accessToken = TokenManager.getAccessToken()

    if (accessToken && TokenManager.isAccessTokenValid()) {
      config.headers.Authorization = `Bearer ${accessToken}`
      // defaults에도 설정하여 로깅 시 확인 가능하도록
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    } else {
      // 토큰이 없거나 유효하지 않으면 defaults에서도 제거
      delete api.defaults.headers.common['Authorization']
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response 인터셉터: 401 에러 시 토큰 갱신 (1회만)
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // 401 에러이고 아직 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newAccessToken = await refreshAccessToken()
        
        if (newAccessToken) {
          // 새 토큰으로 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        } else {
          // 토큰 갱신 실패 - 로그아웃 처리
          TokenManager.removeTokens()
          return Promise.reject({
            ...error,
            message: '인증이 만료되었습니다. 다시 로그인해주세요.'
          })
        }
      } catch (refreshError) {
        TokenManager.removeTokens()
        return Promise.reject({
          ...error,
          message: '인증이 만료되었습니다. 다시 로그인해주세요.'
        })
      }
    }

    return Promise.reject(error)
  }
)

// 경매가 예측 API 함수들
export const auctionApi = {
  // 실제 경매가 데이터 조회
  getActualAuctionData: async (species?: string, days: number = 7, timestamp?: number) => {
    const params = new URLSearchParams()
    if (species) params.append('species', species)
    params.append('days', days.toString())
    
    // 캐시 방지를 위한 타임스탬프 추가
    if (timestamp) {
      params.append('_t', timestamp.toString())
    }
    
    const response = await api.get(`/prediction/actual/?${params}`)
    return response.data
  },

  // 모든 어종 예측
  predictAllSpecies: async (targetDate: string, environmentalData: any) => {
    const response = await api.post('/prediction/all/', {
      target_date: targetDate,
      environmental_data: environmentalData
    })
    return response.data
  },

  // 단일 어종 예측
  predictSingleSpecies: async (species: string, targetDate: string, environmentalData: any) => {
    const response = await api.post('/prediction/single/', {
      species,
      target_date: targetDate,
      environmental_data: environmentalData
    })
    return response.data
  },

  // 지원하는 어종 목록
  getSupportedSpecies: async () => {
    const response = await api.get('/prediction/species/')
    return response.data
  },

  // 헬스 체크
  healthCheck: async () => {
    const response = await api.get('/prediction/health/')
    return response.data
  }
}

// 거래처 관리 API
export const businessApi = {
  // 모든 거래처 조회 (페이지네이션 지원) - 실제 Django 응답 구조
  getAll: async (params?: { page?: number; page_size?: number }): Promise<DjangoApiResponse<Business>> => {
    const response = await api.get('/business/customers/', { params });
    return response.data;
  },

  // ID로 거래처 조회
  getById: async (id: string): Promise<ApiResponse<Business>> => {
    const response = await api.get(`/business/customers/${id}`)
    return response.data
  },

  // 새 거래처 생성
  // create: async (business: Omit<Business, 'id'>): Promise<ApiResponse<Business>> => {
  //   const response = await api.post('/business/customers/create/', business)
  //   return response.data
  // },
  create: async (business: Omit<Business, 'id'>): Promise<ApiResponse<Business>> => {
    const response = await api.post('/business/customers/create/', business, {
      timeout: 30000,  // 30초로 타임아웃 연장
    })
    return response.data
  },
  

  // 거래처 정보 수정
  update: async (id: number, business: Partial<Business>): Promise<ApiResponse<Business>> => {
    const response = await api.put(`/business/customers/${id}/`, business)
    return response.data
  },

  // 거래처 삭제
  delete: async (id: number): Promise<ApiResponse<void>> => {
    console.log('🗑️ 거래처 삭제 API 호출:', id);
    
    const accessToken = TokenManager.getAccessToken()
    console.log('🔑 Access token exists:', !!accessToken);
    console.log('🔑 Access token valid:', TokenManager.isAccessTokenValid());
    console.log('🔑 Authorization header:', api.defaults.headers.common['Authorization']);
    
    if (!accessToken || !TokenManager.isAccessTokenValid()) {
      throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
    }
    
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

  // 이상 탐지 결과 조회
  getAnomalies: async (params?: { 
    page?: number; 
    page_size?: number;
    severity?: string;
    status?: string;
  }): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/inventory/anomalies/', { params })
    return response.data
  },

  // 이상 탐지 상태 업데이트
  updateAnomaly: async (anomalyId: number, data: { resolved?: boolean; memo?: string }): Promise<ApiResponse<any>> => {
    const response = await api.patch(`/inventory/anomalies/${anomalyId}/`, data)
    return response.data
  },

  // 재고 요약 정보 조회 (대시보드용)
  getSummary: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/inventory/summary/')
    return response.data
  },

  // 주문 등록 시 재고 체크
  checkStock: async (data: {
    order_items: Array<{
      fish_type_id: number;
      quantity: number;
      unit: string;
    }>;
  }): Promise<{
    status: 'ok' | 'warning' | 'insufficient' | 'error';
    items: Array<{
      fish_type_id: number;
      fish_name: string;
      requested_quantity: number;
      available_stock: number;
      ordered_quantity?: number;  // 실제 주문된 수량
      registered_stock?: number;  // 등록된 재고
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
    const response = await api.post('/inventory/stock-check/', data)
    return response.data
  },
}

// 주문 관리 API
export const orderApi = {
  // 모든 주문 조회 (페이지네이션, 필터링) - OrderListSerializer 사용
  getAll: async (params?: { 
    page?: number; 
    page_size?: number;
    status?: string;
    payment_status?: string;
    date?: string;
    business_id?: string;
  }): Promise<OrderListResponse> => {
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
    const response = await api.put(`/orders/${id}/update/`, order)
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

  // 주문 출고 처리
  shipOut: async (id: number): Promise<ApiResponse<{
    message: string;
    order_id: number;
    order_status: string;
    ship_out_datetime: string;
  }>> => {
    const response = await api.post(`/orders/${id}/ship-out/`)
    return response.data
  },
  
  // 거래처별 미수금 주문 조회
  getUnpaidOrdersByBusiness: async (businessId: string): Promise<UnpaidOrder[]> => {
    const response = await api.get(`/business/${businessId}/unpaid-orders`);
    return response.data;
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
    const userInfo = getUserInfoFromToken()
    if (userInfo) {
      return {
        success: true,
        data: userInfo
      }
    } else {
      return {
        success: false,
        data: null
      }
    }
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

  // 매출 통계 조회
  getStats: async (params?: {
    period_type?: 'month' | 'year';
    start_date?: string;
    end_date?: string;
    selected_period?: string;
  }): Promise<{
    total_revenue: number;
    monthly_average?: number;
    daily_average?: number;
    highest_month_revenue?: number;
    highest_period?: string;
    growth_rate: number;
    monthly_data: Array<{
      month: string;
      revenue: number;
      order_count: number;
    }>;
    period_type?: string;
    selected_period?: string;
  }> => {
    const response = await api.get('/sales/stats/', { params })
    return response.data
  },


  // 거래처별 구매 순위 조회
  getBusinessRanking: async (params?: {
    period_type?: 'month' | 'year';
    selected_period?: string;
    limit?: number;
  }): Promise<{
    rankings: Array<{
      business_id: number;
      business_name: string;
      total_purchase: number;
      order_count: number;
      percentage: number;
    }>;
    period_type: string;
    selected_period?: string;
    total_revenue: number;
  }> => {
    const response = await api.get('/sales/business-ranking/', { params })
    return response.data
  },

  // 어종별 판매량 조회
  getFishTypeSales: async (params?: {
    period_type?: 'month' | 'year';
    selected_period?: string;
  }): Promise<{
    fish_sales: Array<{
      fish_type_id: number;
      fish_name: string;
      total_quantity: number;
      unit: string;
      total_revenue: number;
      percentage: number;
    }>;
    period_type: string;
    selected_period?: string;
    total_revenue: number;
  }> => {
    const response = await api.get('/sales/fish-sales/', { params })
    return response.data
  },
}

// Dashboard API
export const dashboardApi = {
  // 대시보드 통계 정보 조회
  getStats: async (): Promise<{
    todayOrders: number;
    lowStockCount: number;
    totalOutstandingBalance: number;
    businessCount: number;
  }> => {
    const response = await api.get('/dashboard/stats/')
    return response.data
  },

  // 최근 주문 목록 조회
  getRecentOrders: async (limit: number = 10): Promise<Array<{
    id: number;
    business_name: string;
    items_summary: string;
    total_price: number;
    order_status: string;
    order_datetime: string;
  }>> => {
    const response = await api.get('/dashboard/recent-orders/', { params: { limit } })
    return response.data
  },

  // 재고 부족 어종 목록
  getLowStockItems: async (): Promise<Array<{
    fish_name: string;
    total_stock: number;
    unit: string;
    status: string;
  }>> => {
    const response = await api.get('/dashboard/low-stock/')
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

export const exebaseApi = {
  // Process order with different input types
  async processOrder(data: FormData): Promise<{
    success: boolean;
    message: string;
    order?: any;
    error?: string;
  }> {
    try {
      const response = await fetch('/ai/order', {
        method: 'POST',
        body: data,
        // Don't set Content-Type header, let the browser set it with the correct boundary
      });
      console.log(response)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '주문 처리 중 오류가 발생했습니다.');
      }
      
      return await response.json();
    } catch (error) {
      console.error('주문 처리 오류:', error);
      throw error;
    }
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

  // 텍스트 파싱 (LLM 기반)
  parseText: async (text: string): Promise<{
    success: boolean;
    data?: {
      items: Array<{
        fish_type_id: number | null;
        quantity: number;
        unit_price?: number | null;
        unit: string;
        fish_name?: string;
      }>;
      memo: string;
      delivery_date?: string;
      business_name?: string;
      business_id?: number;
      unmatched_items?: Array<{
        fish_name: string;
        quantity: number;
        unit: string;
        suggested_matches: Array<{
          fish_name: string;
          similarity: number;
        }>;
      }>;
      validation_warnings?: string[];
    };
    message?: string;
  }> => {
    const response = await api.post('/transcription/parse-text/', 
      { text },
      { timeout: 90000 } // 90초 timeout (LLM 처리 대기)
    );
    return response.data;
  },
}

// 어류 질병 분석 API
export const fishAnalysisApi = {
  // 이미지 분석 요청 - AI 서버 메인 파이프라인 사용
  analyze: async (imageFile: File): Promise<{
    success: boolean;
    message?: string;
    overall_health_status?: string;
    health_evaluation?: any;
    health_grade_info?: any;
    total_detections?: number;
    yolo_confidence_avg?: number;
    detections?: any[];
    model_info?: any;
    image_info?: any;
    error?: string;
    error_type?: string;
    solution?: any;
    vgg_available?: boolean;
  }> => {
    const formData = new FormData()
    formData.append('image', imageFile)

    // AI 서버의 메인 분석 파이프라인 사용 (ViT 검증 → 배경 제거 → YOLO + VGG)
    const response = await api.post('/analysis/predict/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 분석 요청은 2분 타임아웃
    })

    return response.data
  },

  // 분석 목록 조회
  getAll: async (params?: { 
    page?: number; 
    page_size?: number;
  }): Promise<{
    results: Array<{
      id: number;
      status: string;
      overall_health_status: string;
      total_detections: number;
      yolo_confidence_avg: number;
      original_image_url: string;
      processed_image_url: string;
      created_at: string;
      completed_at: string;
    }>;
    total_count: number;
    page: number;
    page_size: number;
    has_next: boolean;
  }> => {
    const response = await api.get('/fish-analysis/analyze/', { params })
    return response.data
  },

  // 분석 결과 상세 조회
  getById: async (analysisId: number): Promise<{
    id: number;
    status: string;
    overall_health_status: string;
    total_detections: number;
    yolo_confidence_avg: number;
    original_image_url: string;
    processed_image_url: string;
    detections: Array<{
      id: number;
      bbox_x: number;
      bbox_y: number;
      bbox_width: number;
      bbox_height: number;
      yolo_confidence: number;
      disease_class: string;
      disease_name_ko: string;
      vgg_confidence: number;
      severity: string;
      description: string;
      treatment_recommendation: string;
      cropped_image_url: string;
      created_at: string;
    }>;
    created_at: string;
    completed_at: string;
    // 오류 관련 필드
    error_type?: string;
    solution?: {
      steps: string[];
      technical_details: string;
    };
  }> => {
    const response = await api.get(`/fish-analysis/analyze/${analysisId}/`)
    return response.data
  },

  // 분석 결과 삭제
  delete: async (analysisId: number): Promise<{
    message: string;
  }> => {
    const response = await api.delete(`/fish-analysis/analyze/${analysisId}/`)
    return response.data
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

  // 결제 상태 롤백 (실제 환불 없이 상태만 변경)
  rollback: async (data: { orderId: number; rollbackReason: string }): Promise<ApiResponse<any>> => {
    const response = await api.post('/payments/rollback/', data)
    return response.data
  },
}

// 주문 취소
export const cancelOrder = async (data: CancelOrderRequest): Promise<CancelOrderResponse> => {
  const response = await api.post(`/orders/cancel/`, data)
  return response.data
}

// 문서 발급 요청
export const requestDocument = async (orderId: number, data: DocumentRequest): Promise<DocumentRequestResponse> => {
  const response = await api.post(`/orders/${orderId}/document-request/`, data)
  return response.data
}

// 문서 발급 요청 목록 조회
export const getDocumentRequests = async (orderId: number): Promise<{
  tax_invoice?: { id: number; status: string; created_at: string; completed_at?: string }
  cash_receipt?: { id: number; status: string; created_at: string; completed_at?: string }
}> => {
  const response = await api.get(`/orders/${orderId}/document-requests/`)
  return response.data
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

// JWT 토큰에서 사용자 정보 추출
export const getUserInfoFromToken = (): { user_id?: number; business_name?: string } | null => {
  try {
    const token = localStorage.getItem('access_token')  // TokenManager와 통일
    if (!token) return null
    
    // JWT 토큰의 payload 부분 디코딩 (base64)
    const payload = token.split('.')[1]
    if (!payload) return null
    
    const decodedPayload = JSON.parse(atob(payload))
    return {
      user_id: decodedPayload.user_id,
      business_name: decodedPayload.business_name
    }
  } catch (error) {
    return null
  }
}




export async function findOrCreateFishType(name: string | undefined, unit: string = "박스", existingFishTypes: FishType[]): Promise<FishType | null> {
  if (!name || typeof name !== "string") return null;

  const trimmedName = name.trim();
  if (!trimmedName) return null;

  let fish = existingFishTypes.find(f => f.name === trimmedName);

  if (!fish) {
    try {
      const created = await fishTypeApi.create({ name: trimmedName, unit });
      fish = created.data;
      existingFishTypes.push(fish);
      console.log(`[어종 등록 완료] ${trimmedName}`);
    } catch (error) {
      console.warn(`[어종 등록 실패] ${trimmedName}`, error);
      return null;
    }
  }

  return fish;
}

export async function findOrCreateBusiness(
  businessName: string,
  phoneNumber: string,
  businesses: Business[]
): Promise<number | null> {
  if (!businessName) return null;

  // 1. 기존 거래처 확인
  const existingBusiness = businesses.find(
    (b) => b.business_name.trim() === businessName.trim()
  );
  if (existingBusiness) {
    console.log(`[기존 거래처 사용] ${businessName} (ID: ${existingBusiness.id})`);
    return existingBusiness.id;
  }

  // 2. 전화번호 정제
  const cleanPhoneNumber = (input?: string): string => {
    const digits = (input || '').replace(/\D/g, '');
    return /^\d{9,12}$/.test(digits) ? digits : '0000000000';
  };

  // 3. 새 거래처 생성
  try {
    const created = await businessApi.create({
      business_name: businessName,
      phone_number: cleanPhoneNumber(phoneNumber),
      address: "주소 미입력",
      memo: "(자동 생성)",
    });

    const createdData = created?.data;
    if (!createdData || typeof createdData.id !== 'number') {
      console.error("[거래처 생성 응답 이상]", created);
      throw new Error("응답 구조가 올바르지 않음 (created.data.id 없음)");
    }

    console.log(`[거래처 등록 완료] ${businessName} (ID: ${createdData.id})`);

    // 4. 생성 후 전체 거래처 목록 다시 조회하여 정확한 정보 확인
    const refreshed = await businessApi.getAll();
    const matched = refreshed.results.find(
      (b) => b.business_name.trim() === businessName.trim()
    );

    if (matched) {
      console.log(`[재조회로 확인된 거래처] ${businessName} (ID: ${matched.id})`);
      return matched.id;
    }

    // fallback: 생성된 ID라도 반환
    console.warn(`[거래처 확인 실패, 생성된 ID 사용] ${businessName} (ID: ${createdData.id})`);
    return createdData.id;
  } catch (error) {
    console.error(`[거래처 등록 실패] ${businessName}`, error);
    return null;
  }
}