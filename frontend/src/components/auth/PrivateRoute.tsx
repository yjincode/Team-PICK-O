import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
}

export function PrivateRoute({ children, requireApproval = true }: PrivateRouteProps): JSX.Element {
  const { user, userData, loading, isAuthenticated, isApproved } = useAuth();
  const location = useLocation();

  console.log('🛡️ PrivateRoute 체크:', {
    loading,
    user: user ? `있음 (${user.uid})` : '없음',
    userData: userData ? `있음 (${userData.business_name})` : '없음',
    isAuthenticated,
    isApproved,
    currentPath: location.pathname
  });

  // 로딩 중일 때
  if (loading) {
    console.log('⏳ PrivateRoute: 로딩 중...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  // Firebase 인증되지 않은 경우
  if (!user) {
    console.log('🚫 PrivateRoute: Firebase 사용자 없음 -> 로그인 페이지로');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 사용자 데이터가 없는 경우 (미등록 사용자)
  if (!userData) {
    console.log('🚫 PrivateRoute: 사용자 데이터 없음 -> 로그인 페이지로');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 승인이 필요한 경우
  if (requireApproval && !isApproved) {
    // 승인 대기 상태
    if (userData.status === 'pending') {
      return <Navigate to="/login" replace />;
    }
    
    // 거절되거나 정지된 상태
    if (userData.status === 'rejected' || userData.status === 'suspended') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">접근 제한</h2>
              <p className="text-gray-600">
                {userData.status === 'rejected' 
                  ? '계정이 승인되지 않았습니다.' 
                  : '계정이 일시정지되었습니다.'
                }
              </p>
              <p className="text-gray-500 text-sm mt-2">
                자세한 사항은 관리자에게 문의하세요.
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy/90"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      );
    }
  }

  // 모든 인증 조건을 만족하는 경우
  console.log('✅ PrivateRoute: 인증 성공 -> 컨텐츠 렌더링');
  return <>{children}</>;
}

// 공개 라우트 (로그인된 사용자는 접근 불가)
interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps): JSX.Element {
  const { isAuthenticated, isApproved, loading } = useAuth();

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  // 이미 승인된 사용자는 대시보드로 리다이렉트
  if (isAuthenticated && isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}