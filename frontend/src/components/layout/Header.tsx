import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };



  return (
    <header className="bg-transparent px-4 py-6">
      <div className="flex items-center justify-end max-w-7xl mx-auto pr-8 pb-1">
        {/* 프로필 및 로그아웃 */}
        <div className="flex items-center space-x-4">
          {/* 사용자 정보 */}
          <div className="flex items-center space-x-3">
            <User className="h-10 w-10 text-gray-600 bg-gray-200 rounded-full p-2" />
            <div className="hidden sm:block text-left">
              <div className="text-base font-medium text-gray-900">{user?.business_name || '사용자'}</div>
            </div>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-base font-medium">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;