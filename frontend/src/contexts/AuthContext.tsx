/**
 * 간단하고 깔끔한 인증 컨텍스트
 * Firebase SMS 인증 + JWT 토큰 시스템
 * 모든 사용자 정보는 토큰 페이로드에서 추출
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ConfirmationResult } from 'firebase/auth'
import { TokenManager } from '../lib/tokenManager'
import { sendPhoneVerification, verifyPhoneCode } from '../lib/firebase'
import { api, authApi } from '../lib/api'
import { UserData } from '../types/auth'

interface AuthContextType {
  // 인증 상태 (토큰 페이로드에서 추출)
  user: UserData | null
  loading: boolean
  isAuthenticated: boolean
  
  // SMS 인증 관련
  sendSMSCode: (phoneNumber: string) => Promise<ConfirmationResult>
  verifySMSCode: (confirmationResult: ConfirmationResult | null, code: string, superToken?: string) => Promise<{ isNewUser: boolean; firebaseToken?: string }>
  
  // 회원가입
  registerUser: (userData: any, firebaseToken: string) => Promise<void>
  
  // 슈퍼계정 직접 인증 (Firebase 완전 우회)
  superAccountDirectLogin: (phoneNumber: string) => Promise<{ isNewUser: boolean }>
  superAccountDirectRegister: (userData: any) => Promise<void>
  
  // 인증 관리
  logout: () => void
  refreshUserData: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // 초기화: 저장된 토큰으로 자동 로그인 복원
  useEffect(() => {
    initializeAuth()
  }, [])

  // 토큰 상태 변화 감지 (토큰이 제거되면 사용자 로그아웃)
  useEffect(() => {
    const checkTokenStatus = () => {
      if (user && !TokenManager.isAuthenticated()) {
        setUser(null)
      }
    }

    // 1초마다 토큰 상태 체크
    const interval = setInterval(checkTokenStatus, 1000)
    return () => clearInterval(interval)
  }, [user])

  const initializeAuth = async () => {
    try {
      setLoading(true)
      
      // 기존 사용자만 토큰 유효성 검사
      if (TokenManager.isAuthenticated()) {
        // JWT 토큰 페이로드에서 사용자 정보 추출
        const userInfo = TokenManager.getUserInfo()
        
        if (userInfo?.user_id && userInfo?.business_name) {
          const userData: UserData = {
            user_id: userInfo.user_id,
            business_name: userInfo.business_name
          }
          
          setUser(userData)
        } else {
          TokenManager.removeTokens()
        }
      }
    } catch (error) {
      TokenManager.removeTokens()
    } finally {
      setLoading(false)
    }
  }

  // Firebase SMS 인증번호 전송
  const sendSMSCode = async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
      const result = await sendPhoneVerification(phoneNumber)
      
      if (result.success && result.confirmationResult) {
        return result.confirmationResult
      } else {
        throw new Error(result.error || 'SMS 전송 실패')
      }
    } catch (error) {
      throw error
    }
  }

  // Firebase 인증번호 확인 및 JWT 교환 (슈퍼계정 지원)
  const verifySMSCode = async (confirmationResult: ConfirmationResult | null, code: string, superToken?: string): Promise<{ isNewUser: boolean; firebaseToken?: string }> => {
    try {
      setLoading(true)
      
      let firebaseToken: string
      
      if (superToken) {
        // 슈퍼계정 처리 - Firebase 인증 건너뛰기
        firebaseToken = superToken
      } else {
        // 일반 Firebase 인증번호 확인
        if (!confirmationResult) {
          throw new Error('인증 세션이 만료되었습니다.')
        }
        
        const authResult = await verifyPhoneCode(confirmationResult, code)
        
        if (authResult.success && authResult.user && authResult.idToken) {
          firebaseToken = authResult.idToken
        } else {
          throw new Error(authResult.error || '인증 실패')
        }
      }
      
      // Firebase ID 토큰(또는 슈퍼계정 토큰)을 JWT로 교환
      const response = await api.post('/business/auth/firebase-to-jwt/', {
        firebase_token: firebaseToken
      })
      
      if (response.data.is_new_user) {
        // 신규 사용자 - Firebase ID 토큰 반환하고 회원가입 단계로
        return { isNewUser: true, firebaseToken: firebaseToken }
      } else {
        // 기존 사용자 - JWT 토큰 저장 및 로그인 처리
        const { access_token, refresh_token, user_id, business_name, status } = response.data
        
        TokenManager.setTokens(access_token, refresh_token)
        
        if (status === 'approved' && business_name) {
          const userData: UserData = { user_id, business_name }
          setUser(userData)
        }
        
        return { isNewUser: false }
      }
      
    } catch (error: any) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 회원가입
  const registerUser = async (userData: any, firebaseToken: string): Promise<void> => {
    try {
      setLoading(true)
      
      const registrationData = {
        ...userData,
        firebase_token: firebaseToken
      }
      
      const response = await api.post('/business/auth/register/', registrationData)
      
      // 회원가입 완료 후 JWT 토큰 저장
      if (response.data.access_token && response.data.refresh_token) {
        TokenManager.setTokens(response.data.access_token, response.data.refresh_token)
      }
      
      // 사용자 상태 업데이트
      const newUserData: UserData = {
        user_id: response.data.user.id,
        business_name: response.data.user.business_name
      }
      setUser(newUserData)
      
    } catch (error: any) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 로그아웃
  const logout = (): void => {
    try {
      TokenManager.removeTokens()
      setUser(null)
    } catch (error) {
    }
  }

  // 슈퍼계정 직접 로그인 (Firebase 완전 우회)
  const superAccountDirectLogin = async (phoneNumber: string): Promise<{ isNewUser: boolean }> => {
    try {
      setLoading(true)      
      const response = await authApi.superAccountLogin(phoneNumber)
      
      if (response.is_new_user) {
        // 신규 슈퍼계정 - 회원가입 필요
        return { isNewUser: true }
      } else {
        // 기존 슈퍼계정 - JWT 토큰 저장 및 로그인 처리
        const { access_token, refresh_token, user_id, business_name, status } = response
        
        TokenManager.setTokens(access_token, refresh_token)
        
        if (status === 'approved' && business_name) {
          const userData: UserData = { user_id, business_name }
          setUser(userData)
        }
        return { isNewUser: false }
      }
      
    } catch (error: any) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 슈퍼계정 직접 회원가입 (Firebase 완전 우회)
  const superAccountDirectRegister = async (userData: any): Promise<void> => {
    try {
      setLoading(true)
      
      
      const response = await authApi.superAccountRegister({
        business_name: userData.business_name,
        owner_name: userData.owner_name,
        address: userData.address
      })
      
      // 회원가입 완료 후 JWT 토큰 저장
      if (response.access_token && response.refresh_token) {
        TokenManager.setTokens(response.access_token, response.refresh_token)
      }
      
      // 사용자 상태 업데이트
      const newUserData: UserData = {
        user_id: response.user.id,
        business_name: response.user.business_name
      }
      setUser(newUserData)
      
    } catch (error: any) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 사용자 데이터 갱신 (토큰 페이로드에서 재추출)
  const refreshUserData = (): void => {
    if (TokenManager.isAuthenticated()) {
      const userInfo = TokenManager.getUserInfo()
      
      if (userInfo?.user_id && userInfo?.business_name) {
        const userData: UserData = {
          user_id: userInfo.user_id,
          business_name: userInfo.business_name
        }
        setUser(userData)
      } else {
        logout()
      }
    } else {
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user && TokenManager.isAuthenticated(),
    sendSMSCode,
    verifySMSCode,
    registerUser,
    superAccountDirectLogin,
    superAccountDirectRegister,
    logout,
    refreshUserData
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Firebase SMS 인증용 reCAPTCHA 컨테이너 */}
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
    </AuthContext.Provider>
  )
}

// Hook for using the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}