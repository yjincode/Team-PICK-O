import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop: Sidebar is always visible */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10">
        <MobileBottomNav />
      </div>
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 container-responsive pb-20 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout; 