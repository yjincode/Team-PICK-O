import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
}

export function PrivateRoute({ children, requireApproval = true }: PrivateRouteProps): JSX.Element {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log('🔒 PrivateRoute 인증 확인:', {
    loading,
    user: user ? `있음 (${user.user_id})` : '없음',
    isAuthenticated,
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
    console.log('🚫 PrivateRoute: 사용자 없음 -> 로그인 페이지로');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 승인 상태는 백엔드에서 JWT 토큰 검증 시 확인
  // 프론트엔드에서는 단순히 인증된 사용자만 허용
  console.log('✅ PrivateRoute: 인증 성공 -> 컨텐츠 렌더링');
  return <>{children}</>;
}

// 공개 라우트 (로그인된 사용자는 접근 불가)
interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps): JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  // 이미 인증된 사용자는 대시보드로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}