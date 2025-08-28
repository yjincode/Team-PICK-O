/**
 * 메인 레이아웃 컴포넌트
 * 데스크톱에서는 사이드바, 모바일에서는 하단 네비게이션을 제공합니다
 * 사이드바 토글 기능 포함
 */
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { Toaster } from 'react-hot-toast';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 데스크톱: 사이드바 (lg 이상에서만 표시) */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>
      
      {/* 모바일: 하단 네비게이션 (lg 미만에서만 표시) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10">
        <MobileBottomNav />
      </div>
      
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 container-responsive pb-20 lg:pb-8">
          {children}
        </div>
      </main>
      
      {/* 토스트 알림 */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '12px 16px',
            minHeight: 'auto',
            lineHeight: '1.4',
            whiteSpace: 'nowrap',
            overflow: 'visible',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

export default MainLayout; 