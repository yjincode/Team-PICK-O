import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Firebase 토큰 관리 유틸리티
export const tokenManager = {
  // 토큰 저장
  setToken: (token: string): void => {
    localStorage.setItem('firebase_token', token)
  },

  // 토큰 가져오기
  getToken: (): string | null => {
    return localStorage.getItem('firebase_token')
  },

  // 토큰 삭제
  removeToken: (): void => {
    localStorage.removeItem('firebase_token')
  },

  // 토큰 유효성 검사 (기본적인 형태 확인)
  isValidToken: (token: string): boolean => {
    try {
      // JWT 토큰 형태 확인 (3개 부분으로 나뉘어져 있는지)
      const parts = token.split('.')
      return parts.length === 3
    } catch {
      return false
    }
  }
} 