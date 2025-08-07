// 인증 관련 타입 정의

// 사용자 상태 타입
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// 구독 플랜 타입
export type SubscriptionPlan = 'basic' | 'premium' | 'enterprise';

// 로그인 단계 타입
export type LoginStep = 'phone' | 'code' | 'register' | 'pending';

// 사용자 등록 요청 데이터
export interface UserRegistrationData {
  firebase_uid: string;
  business_name: string;
  owner_name: string;
  phone_number: string;
  address: string;
}

// 사용자 정보 응답 데이터
export interface UserData {
  id: number;
  business_name: string;
  owner_name: string;
  phone_number: string;
  address: string;
  firebase_uid: string;
  status: UserStatus;
  created_at: string;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

// 사용자 등록 API 응답
export interface UserRegistrationResponse extends ApiResponse {
  user?: UserData;
}

// 사용자 상태 확인 API 응답
export interface UserStatusResponse extends ApiResponse {
  exists: boolean;
  user?: UserData;
}

// Firebase 사용자 정보
export interface FirebaseUserInfo {
  uid: string;
  phoneNumber: string | null;
  idToken: string;
}

// 로그인 폼 데이터
export interface LoginFormData {
  phoneNumber: string;
  verificationCode: string;
  businessName: string;
  ownerName: string;
  address: string;
}

// 에러 상태
export interface ErrorState {
  phoneError: string;
  codeError: string;
  registrationError: string;
}