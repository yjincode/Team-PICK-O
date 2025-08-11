/**
 * 이중 토큰 관리 유틸리티
 * 액세스 토큰(localStorage) + 리프레시 토큰(Cookie)
 * Firebase 지연시간 문제 해결을 위한 자체 JWT 토큰 시스템
 */

import { CookieManager } from './cookieManager'

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token'
  
  /**
   * 토큰 페어 저장 (액세스: localStorage, 리프레시: Cookie)
   */
  static setTokens(accessToken: string, refreshToken: string): void {
    // 액세스 토큰은 localStorage에 (15분 짧은 수명)
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken)
    
    // 리프레시 토큰은 쿠키에 (7일 긴 수명, 더 안전)
    CookieManager.setRefreshToken(refreshToken)
    
    console.log('💾 토큰 페어 저장 완료: 액세스(localStorage) + 리프레시(Cookie)')
  }
  
  /**
   * 액세스 토큰만 설정 (리프레시 토큰 갱신 시 사용)
   */
  static setAccessToken(accessToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken)
    console.log('🔄 액세스 토큰 갱신 완료')
  }
  
  /**
   * 액세스 토큰 조회
   */
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }
  
  /**
   * 리프레시 토큰 조회
   */
  static getRefreshToken(): string | null {
    return CookieManager.getRefreshToken()
  }
  
  /**
   * 모든 토큰 제거
   */
  static removeTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    CookieManager.deleteRefreshToken()
    console.log('🗑️ 모든 토큰 제거 완료')
  }
  
  /**
   * 액세스 토큰 유효성 검사 (만료 여부만 체크, 서명 검증은 백엔드에서)
   */
  static isAccessTokenValid(): boolean {
    const token = this.getAccessToken()
    if (!token) {
      return false
    }
    
    try {
      // JWT 페이로드 디코딩 (서명 검증 없이)
      const parts = token.split('.')
      if (parts.length !== 3) {
        return false
      }
      
      const payload = JSON.parse(atob(parts[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      // 토큰 타입 확인
      if (payload.token_type !== 'access') {
        console.log('❌ 액세스 토큰이 아님')
        return false
      }
      
      // 만료 시간 체크
      if (payload.exp && payload.exp < currentTime) {
        console.log('⏰ 액세스 토큰 만료됨')
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ 액세스 토큰 파싱 오류:', error)
      return false
    }
  }
  
  /**
   * 리프레시 토큰 유효성 검사
   */
  static isRefreshTokenValid(): boolean {
    const token = this.getRefreshToken()
    if (!token) {
      return false
    }
    
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return false
      }
      
      const payload = JSON.parse(atob(parts[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      // 토큰 타입 확인
      if (payload.token_type !== 'refresh') {
        console.log('❌ 리프레시 토큰이 아님')
        return false
      }
      
      // 만료 시간 체크
      if (payload.exp && payload.exp < currentTime) {
        console.log('⏰ 리프레시 토큰 만료됨')
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ 리프레시 토큰 파싱 오류:', error)
      return false
    }
  }
  
  /**
   * 로그인 상태 확인 (액세스 토큰 유효 + 리프레시 토큰 존재)
   */
  static isAuthenticated(): boolean {
    return this.isAccessTokenValid() || this.isRefreshTokenValid()
  }
  
  /**
   * 액세스 토큰에서 사용자 정보 추출 (페이로드만, 검증 없이)
   */
  static getUserInfo(): { user_id?: number; business_name?: string; firebase_uid?: string } | null {
    const token = this.getAccessToken()
    if (!token) {
      return null
    }
    
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }
      
      const payload = JSON.parse(atob(parts[1]))
      return {
        user_id: payload.user_id,
        business_name: payload.business_name,
        firebase_uid: payload.firebase_uid
      }
    } catch (error) {
      console.error('❌ 사용자 정보 추출 오류:', error)
      return null
    }
  }
  
  /**
   * 액세스 토큰 만료까지 남은 시간 (초)
   */
  static getAccessTokenTimeUntilExpiry(): number {
    const token = this.getAccessToken()
    if (!token) {
      return 0
    }
    
    try {
      const parts = token.split('.')
      const payload = JSON.parse(atob(parts[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      return Math.max(0, (payload.exp || 0) - currentTime)
    } catch {
      return 0
    }
  }
}