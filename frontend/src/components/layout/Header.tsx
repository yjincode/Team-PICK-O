import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: Date;
  read: boolean;
}

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // 더미 알림 데이터 (실제로는 API에서 가져올 예정)
  useEffect(() => {
    const dummyNotifications: Notification[] = [
      {
        id: '1',
        message: '새로운 주문이 접수되었습니다.',
        type: 'info',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        message: '재고가 부족합니다. 주문을 확인해주세요.',
        type: 'warning',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
        read: false,
      },
      {
        id: '3',
        message: '정산 처리가 완료되었습니다.',
        type: 'success',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
        read: true,
      },
    ];
    setNotifications(dummyNotifications);
  }, []);

  // 연체 위험 알림 이벤트 리스너
  useEffect(() => {
    const handleOverdueAlert = (event: CustomEvent) => {
      const { businessName, overdueDays, risk } = event.detail;
      
      const newNotification: Notification = {
        id: `overdue-${Date.now()}`,
        message: `⚠️ ${businessName} 거래처가 ${overdueDays}일 연체되었습니다. (위험도: ${risk})`,
        type: 'error',
        timestamp: new Date(),
        read: false,
      };
      
      setNotifications(prev => [newNotification, ...prev]);
    };

    // 이벤트 리스너 등록
    window.addEventListener('overdueAlert', handleOverdueAlert as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('overdueAlert', handleOverdueAlert as EventListener);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  return (
    <div className="relative">
      {/* 새로운 디자인의 통합 위젯 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 w-52">
        {/* 사용자 정보 영역 */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.business_name || '사용자'}</p>
          </div>
        </div>

        {/* 기능 버튼들 */}
        <div className="grid grid-cols-2 gap-2">
          {/* 알림 버튼 */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex flex-col items-center p-2 bg-gray-50 hover:bg-gray-100 rounded transition-all duration-200 group relative"
          >
            <div className="relative">
              <Bell className="w-4 h-4 text-gray-600 group-hover:text-blue-600 mb-1" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-600 group-hover:text-gray-900">알림</span>
          </button>

          {/* 프로필 버튼 */}
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex flex-col items-center p-2 bg-gray-50 hover:bg-gray-100 rounded transition-all duration-200 group"
          >
            <Settings className="w-4 h-4 text-gray-600 group-hover:text-blue-600 mb-1" />
            <span className="text-xs text-gray-600 group-hover:text-gray-900">설정</span>
          </button>
        </div>
      </div>

      {/* 알림 드롭다운 */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">알림</h3>
              <span className="text-xs text-gray-500 bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                {unreadCount}개 새 알림
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">새로운 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      notification.type === 'warning' ? 'bg-yellow-500' :
                      notification.type === 'error' ? 'bg-red-500' :
                      notification.type === 'success' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.timestamp.toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                모든 알림 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 프로필 드롭다운 메뉴 */}
      {showProfileMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors">
              <Settings className="w-4 h-4 text-gray-500" />
              <span>계정 설정</span>
            </button>
            
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors">
              <div className="w-4 h-4 text-gray-500">📊</div>
              <span>대시보드 설정</span>
            </button>
          </div>
          
          <div className="border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors rounded-b-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}

      {/* 클릭 외부 감지로 드롭다운 닫기 */}
      {(showNotifications || showProfileMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowProfileMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default Header;
