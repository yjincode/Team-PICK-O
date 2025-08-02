import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, getCurrentUser, signOut } from '../lib/firebase.ts';
import { authApi, tokenManager } from '../services/api';
import { UserData, UserStatus } from '../types/auth';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  login: (user: User, userData: UserData) => void;
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

  useEffect(() => {
    // Firebase 인증 상태 변화 감지
    const unsubscribe = onAuthStateChange(async (firebaseUser: User | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Firebase ID 토큰 저장
          const idToken = await firebaseUser.getIdToken();
          tokenManager.setToken(idToken);
          
          // 사용자 데이터 조회
          const response = await authApi.checkUserStatus(firebaseUser.uid);
          
          if (response.exists && response.user) {
            setUser(firebaseUser);
            setUserData(response.user);
            localStorage.setItem('userInfo', JSON.stringify(response.user));
          } else {
            // 등록되지 않은 사용자
            setUser(firebaseUser);
            setUserData(null);
            localStorage.removeItem('userInfo');
          }
        } catch (error) {
          console.error('사용자 데이터 조회 실패:', error);
          setUser(null);
          setUserData(null);
          tokenManager.removeToken();
          localStorage.removeItem('userInfo');
        }
      } else {
        // 로그아웃 상태
        setUser(null);
        setUserData(null);
        tokenManager.removeToken();
        localStorage.removeItem('userInfo');
      }
      
      setLoading(false);
    });

    // 페이지 새로고침 시 저장된 사용자 정보 복원
    const initializeAuth = () => {
      const currentUser = getCurrentUser();
      const savedUserInfo = localStorage.getItem('userInfo');
      
      if (currentUser && savedUserInfo) {
        try {
          const parsedUserData = JSON.parse(savedUserInfo) as UserData;
          setUser(currentUser);
          setUserData(parsedUserData);
        } catch (error) {
          console.error('저장된 사용자 정보 파싱 실패:', error);
          localStorage.removeItem('userInfo');
        }
      }
    };

    initializeAuth();

    return () => unsubscribe();
  }, []);

  const login = (firebaseUser: User, userInfo: UserData): void => {
    setUser(firebaseUser);
    setUserData(userInfo);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  };

  const logout = async (): Promise<void> => {
    try {
      // Firebase 로그아웃은 onAuthStateChange에서 처리됨
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
        localStorage.setItem('userInfo', JSON.stringify(response.user));
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