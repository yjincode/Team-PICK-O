import axios from 'axios';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 (토큰 추가)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 함수들
export const authAPI = {
  login: (credentials) =>
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
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