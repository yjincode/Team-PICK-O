import axios from 'axios';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 (Firebase ID 토큰 추가)
api.interceptors.request.use(
  (config) => {
    const firebaseToken = localStorage.getItem('firebaseIdToken');
    if (firebaseToken) {
      config.headers.Authorization = `Bearer ${firebaseToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그인 페이지로 리다이렉트
      localStorage.removeItem('firebaseIdToken');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 함수들
export const authAPI = {
  // 사용자 등록 (회원가입)
  register: (userData) => api.post('/core/auth/register/', userData),
  
  // 사용자 상태 확인
  checkUserStatus: (firebaseUid) => api.get(`/core/auth/status/?firebase_uid=${firebaseUid}`),
  
  // 승인 대기 사용자 목록 (개발/테스트용)
  getPendingUsers: () => api.get('/core/auth/pending/'),
};

export const customerAPI = {
  getCustomers: () => api.get('/customers'),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
  getUnpaidList: () => api.get('/customers/unpaid'),
};

export const orderAPI = {
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
};

export const inventoryAPI = {
  getFishStock: () => api.get('/inventory/fish'),
  getFishItem: (id) => api.get(`/inventory/fish/${id}`),
  createFishItem: (data) => api.post('/inventory/fish', data),
  updateFishItem: (id, data) => api.put(`/inventory/fish/${id}`, data),
  deleteFishItem: (id) => api.delete(`/inventory/fish/${id}`),
};

export const salesAPI = {
  getSales: () => api.get('/sales'),
  getSalesChart: () => api.get('/sales/chart'),
  getAuctionPrediction: () => api.get('/sales/auction-prediction'),
};

export const aiAPI = {
  getAiLogs: () => api.get('/ai/logs'),
  runAnalysis: (data) => api.post('/ai/analysis', data),
};

export default api; 