import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { getCurrentUser, signOut, onAuthStateChange } from '../lib/firebase.ts';
import { tokenManager } from '../lib/utils';  
import { authApi } from '../lib/api';
import { UserData, UserStatus } from '../types/auth';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  userId: number | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  login: (user: User, userData: UserData) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  setUserData: (userData: UserData | null) => void;
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
    
    const initAuth = async () => {
      
      // 즉시 현재 사용자 확인 (캐시된 값)
      const currentUser = getCurrentUser();
      if (currentUser) {
        const token = tokenManager.getToken();
        if (token && tokenManager.isValidToken(token)) {
          console.log('⚡ 캐시된 사용자 정보로 즉시 복원');
          
          // 토큰 유효성을 더 엄격하게 검증
          try {
            // 토큰이 실제로 작동하는지 빠른 백엔드 검증
            const response = await authApi.checkUserStatus(currentUser.uid);
            if (response.exists && response.user) {
              console.log('✅ 캐시 복원 성공 - 즉시 인증 완료');
              setUser(currentUser);
              setUserData(response.user);
              setLoading(false);
              
              // 백그라운드에서 토큰 갱신 (사용자 경험 방해하지 않음)
              setTimeout(async () => {
                try {
                  const freshToken = await currentUser.getIdToken(true);
                  tokenManager.setToken(freshToken);
                  console.log('🔄 백그라운드 토큰 갱신 완료');
                } catch (tokenError) {
                  console.warn('⚠️ 백그라운드 토큰 갱신 실패:', tokenError);
                }
              }, 1000);
              
              return; // 즉시 복원 성공하면 onAuthStateChange 기다리지 않음
            }
          } catch (error) {
            console.warn('⚠️ 캐시된 정보 복원 실패 - onAuthStateChange로 폴백:', error);
            // 토큰이 만료되었을 수 있으므로 새로 가져오기 시도
            try {
              const freshToken = await currentUser.getIdToken(true);
              tokenManager.setToken(freshToken);
              const retryResponse = await authApi.checkUserStatus(currentUser.uid);
              if (retryResponse.exists && retryResponse.user) {
                console.log('✅ 토큰 갱신 후 즉시 복원 성공');
                setUser(currentUser);
                setUserData(retryResponse.user);
                setLoading(false);
                return;
              }
            } catch (retryError) {
              console.warn('⚠️ 토큰 갱신 후 재시도도 실패:', retryError);
            }
          }
        }
      }
      
      // 캐시된 정보가 없거나 실패한 경우, onAuthStateChange 기다림
      console.log('⏳ 캐시 복원 불가 - onAuthStateChange 대기');
    };
    
    initAuth();
    
    // 추가적으로 Auth State 변경도 감지 (백그라운드에서)
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
    console.log('💾 Login - 사용자 정보 컨텍스트 저장:', userInfo);
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
      // Firebase 토큰 갱신
      const freshToken = await user.getIdToken(true);
      tokenManager.setToken(freshToken);
      console.log('🔄 refreshUserData - 토큰 갱신 완료');
      
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
  const userId = userData?.id || null;

  // setUserData 함수 추가
  const handleSetUserData = (newUserData: UserData | null) => {
    setUserData(newUserData);
  };

  const value = {
    user,
    userData,
    userId,
    loading,
    isAuthenticated,
    isApproved,
    login,
    logout,
    refreshUserData,
    setUserData: handleSetUserData,
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