import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { getCurrentUser, signOut, onAuthStateChange } from '../lib/firebase.ts';
import { tokenManager } from '../lib/utils';  
import { authApi } from '../lib/api';
import { UserData, UserStatus } from '../types/auth';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  login: (user: User, userData: UserData) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState<boolean>(false);

  useEffect(() => {
    console.log('🔧 AuthContext 초기화 시작');
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔥 Firebase Auth 상태 변경:', firebaseUser ? `사용자 있음 (${firebaseUser.uid})` : '사용자 없음');
      
      try {
        if (firebaseUser) {
          // Firebase 사용자가 있는 경우
          const token = tokenManager.getToken();
          console.log('🔑 저장된 토큰:', token ? '있음' : '없음');
          
          if (token && tokenManager.isValidToken(token)) {
            // 토큰이 있으면 사용자 정보 복원
            console.log('🔄 사용자 정보 복원 시도...');
            try {
              const response = await authApi.checkUserStatus(firebaseUser.uid);
              console.log('📊 API 응답:', response);
              
              if (response.exists && response.user) {
                console.log('✅ 사용자 정보 복원 성공');
                // 최신 토큰으로 갱신
                try {
                  const freshToken = await firebaseUser.getIdToken(true);
                  tokenManager.setToken(freshToken);
                  console.log('🔄 토큰 갱신 완료');
                } catch (tokenError) {
                  console.warn('⚠️ 토큰 갱신 실패:', tokenError);
                }
                setUser(firebaseUser);
                setUserData(response.user);
              } else {
                console.log('❌ 사용자 정보 없음 - 상태 초기화');
                setUser(null);
                setUserData(null);
                tokenManager.removeToken();
              }
            } catch (error) {
              console.error('❌ 사용자 정보 복원 실패:', error);
              setUser(null);
              setUserData(null);
              tokenManager.removeToken();
            }
          } else {
            console.log('🔑 토큰 없음 또는 유효하지 않음');
            setUser(firebaseUser);
            setUserData(null);
          }
        } else {
          console.log('🚫 Firebase 사용자 없음 - 완전 초기화');
          setUser(null);
          setUserData(null);
          tokenManager.removeToken();
        }
      } catch (error) {
        console.error('❌ 인증 상태 변경 처리 실패:', error);
        setUser(null);
        setUserData(null);
        tokenManager.removeToken();
      } finally {
        console.log('⏰ AuthContext 로딩 완료');
        setLoading(false);
      }
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      console.log('🧹 AuthContext 정리');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = async (firebaseUser: User, userInfo: UserData): Promise<void> => {
    // 최신 토큰으로 갱신
    try {
      const freshToken = await firebaseUser.getIdToken(true);
      tokenManager.setToken(freshToken);
      console.log('🔄 Login - 토큰 갱신 완료');
    } catch (tokenError) {
      console.warn('⚠️ Login - 토큰 갱신 실패:', tokenError);
    }
    
    setUser(firebaseUser);
    setUserData(userInfo);
    // userInfo는 localStorage에 저장하지 않음 (보안상 이유)
  };

  const logout = async (): Promise<void> => {
    try {
      // 상태 초기화
      setUser(null);
      setUserData(null);
      tokenManager.removeToken();
      
      // Firebase 로그아웃
      await signOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const refreshUserData = async (): Promise<void> => {
    if (!user) return;

    try {
      const response = await authApi.checkUserStatus(user.uid);
      if (response.exists && response.user) {
        setUserData(response.user);
      }
    } catch (error) {
      console.error('사용자 데이터 새로고침 실패:', error);
    }
  };

  const isAuthenticated = !!(user && userData);
  const isApproved = userData?.status === 'approved';

  const value = {
    user,
    userData,
    loading,
    isAuthenticated,
    isApproved,
    login,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}