// API 서비스 - Django 백엔드와의 통신

import { 
  UserRegistrationData, 
  UserRegistrationResponse, 
  UserStatusResponse,
  ApiResponse 
} from '../types/auth';

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// 디버깅용 로그
console.log('🔗 API Base URL:', API_BASE_URL);

// HTTP 클라이언트 클래스
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // 기본 fetch 래퍼
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`📡 API 요청: ${url}`);
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Firebase 토큰이 있으면 Authorization 헤더 추가
    const idToken = localStorage.getItem('firebase_token');
    if (idToken) {
      defaultHeaders['Authorization'] = `Bearer ${idToken}`;
      console.log('🔐 Firebase 토큰 포함됨');
    }

    const config: RequestInit = {
      headers: { ...defaultHeaders, ...options.headers },
      ...options,
    };

    try {
      console.log('📤 요청 설정:', { url, method: config.method || 'GET' });
      const response = await fetch(url, config);
      console.log('📥 응답 상태:', response.status);
      
      // 응답이 JSON이 아닌 경우에도 일단 텍스트로 받아보기
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn('⚠️ JSON이 아닌 응답:', text);
        throw new Error(`서버 응답 오류: ${response.status} - ${text}`);
      }

      if (!response.ok) {
        console.error('❌ API 오류 응답:', data);
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      console.log('✅ API 응답 성공:', data);
      return data as T;
    } catch (error: any) {
      console.error(`❌ API 요청 실패 [${endpoint}]:`, error);
      
      // 네트워크 오류인지 확인
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      }
      
      throw error;
    }
  }

  // GET 요청
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const queryString = params 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  // POST 요청
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT 요청
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE 요청
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// API 클라이언트 인스턴스
const apiClient = new ApiClient(API_BASE_URL);

// 인증 관련 API 함수들
export const authApi = {
  // 사용자 등록
  registerUser: async (userData: UserRegistrationData): Promise<UserRegistrationResponse> => {
    return apiClient.post<UserRegistrationResponse>('/core/auth/register/', userData);
  },

  // 사용자 상태 확인
  checkUserStatus: async (firebaseUid: string): Promise<UserStatusResponse> => {
    return apiClient.get<UserStatusResponse>('/core/auth/status/', { 
      firebase_uid: firebaseUid 
    });
  },

  // 승인 대기 사용자 목록 (개발/테스트용)
  getPendingUsers: async (): Promise<ApiResponse> => {
    return apiClient.get<ApiResponse>('/core/auth/pending/');
  }
};

// Firebase 토큰 관리
export const tokenManager = {
  // 토큰 저장
  setToken: (token: string): void => {
    localStorage.setItem('firebase_token', token);
  },

  // 토큰 가져오기
  getToken: (): string | null => {
    return localStorage.getItem('firebase_token');
  },

  // 토큰 삭제
  removeToken: (): void => {
    localStorage.removeItem('firebase_token');
  },

  // 토큰 유효성 검사 (기본적인 형태 확인)
  isValidToken: (token: string): boolean => {
    try {
      // JWT 토큰 형태 확인 (3개 부분으로 나뉘어져 있는지)
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  }
};

export default apiClient;