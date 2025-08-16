/**
 * 사이드바 네비게이션 컴포넌트
 * 데스크톱에서 메인 네비게이션을 제공하며, 계층적 메뉴 구조를 지원합니다
 */
"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, Users, ShoppingCart, Package, TrendingUp, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react"
import { SharkMascot } from "../common/SharkMascot"

// 메뉴 아이템 타입 정의
interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: Array<{
    title: string;
    url: string;
  }>;
}

// 네비게이션 메뉴 구성
const menuItems: MenuItem[] = [
  {
    title: "메인 화면",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "고객 관리",
    icon: Users,
    items: [
      { title: "거래처 리스트", url: "/business" },
      { title: "미수금 내역", url: "/business/unpaid" },
      { title: "정산 처리", url: "/business/settlement" },
    ],
  },
  {
    title: "주문 관리",
    icon: ShoppingCart,
    items: [
      { title: "주문 내역", url: "/orders" },
      { title: "AI 분석 로그", url: "/orders/ai-logs" },
    ],
  },
  {
    title: "재고 관리",
    icon: Package,
    items: [
      { title: "어종 재고", url: "/inventory" },
      { title: "어종 정보 관리", url: "/inventory/fish-form" },
    ],
  },
  {
    title: "매출 관리",
    icon: TrendingUp,
    items: [
      { title: "매출 통계", url: "/sales/chart" },
      { title: "경매 시세 예측", url: "/sales/prediction" },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const location = useLocation()
  // 열린 메뉴 아이템 상태 관리
  const [openItems, setOpenItems] = useState<string[]>([])

  // 활성 페이지가 있는 메뉴를 자동으로 열기
  useEffect(() => {
    const activeMenus = menuItems.filter(item => hasActiveChild(item)).map(item => item.title)
    setOpenItems(prev => {
      const newItems = [...prev]
      activeMenus.forEach(title => {
        if (!newItems.includes(title)) {
          newItems.push(title)
        }
      })
      return newItems
    })
  }, [location.pathname])
  // 사이드 드롭다운 상태
  const [sideDropdown, setSideDropdown] = useState<{
    isOpen: boolean;
    menu?: MenuItem;
    position?: { top: number };
  }>({ isOpen: false })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 메뉴 토글 함수
  const toggleItem = (title: string) => {
    setOpenItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  // 사이드 드롭다운 열기
  const openSideDropdown = (menu: MenuItem, buttonElement: HTMLElement) => {
    const rect = buttonElement.getBoundingClientRect()
    setSideDropdown({
      isOpen: true,
      menu,
      position: { top: rect.top }
    })
  }

  // 사이드 드롭다운 닫기
  const closeSideDropdown = () => {
    setSideDropdown({ isOpen: false })
  }

  // 클릭 외부 영역 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeSideDropdown()
      }
    }

    if (sideDropdown.isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [sideDropdown.isOpen])

  // 현재 활성 페이지 확인
  const isActive = (url: string) => {
    return location.pathname === url
  }

  // 부모 메뉴의 하위 항목이 활성화되어 있는지 확인
  const hasActiveChild = (menuItem: MenuItem) => {
    if (!menuItem.items) return false
    return menuItem.items.some(subItem => isActive(subItem.url))
  }

  // 모바일 사이드바 닫기
  const closeMobileSidebar = () => {
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  return (
    <aside className="w-full bg-navy text-white h-screen flex flex-col relative">
      {/* 사이드바 헤더 */}
      <div className={`border-b border-white/10 relative transition-all duration-300 ${
        collapsed ? 'p-2' : 'p-4 sm:p-6'
      }`}>
        {collapsed ? (
          // 접힌 상태: 로고 위치에 >> 아이콘만 표시
          <div className="flex justify-center items-center h-16 sm:h-20">
            {onToggle && (
              <button
                onClick={onToggle}
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded hover:bg-white/10 transition-all duration-300"
                title="사이드바 펼치기"
              >
                <span className="text-white/80 font-mono font-bold text-xl">
                  {'>>'}
                </span>
              </button>
            )}
          </div>
        ) : (
          // 펼쳐진 상태: 로고와 제목
          <div className="flex flex-col items-center space-y-4">
            {/* 접기 버튼 */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 transition-all duration-300 z-10"
                title="사이드바 접기"
              >
                <span className="text-white/80 font-mono font-bold text-lg">
                  {'<<'}
                </span>
              </button>
            )}
            <div className="w-16 h-16 sm:w-20 sm:h-20">
              <SharkMascot />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white text-center">바다 대장부</h1>
          </div>
        )}
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className={`flex-1 space-y-2 overflow-y-auto transition-all duration-300 ${
        collapsed ? 'p-2' : 'p-4'
      }`}>
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.items ? (
              <div>
                <button
                  onClick={(e) => {
                    if (collapsed) {
                      openSideDropdown(item, e.currentTarget)
                    } else {
                      toggleItem(item.title)
                    }
                  }}
                  className={`w-full flex items-center rounded-lg text-left transition-colors touch-target ${
                    collapsed ? 'p-2 justify-center' : 'p-3 justify-between'
                  } ${
                    (!collapsed && openItems.includes(item.title)) || hasActiveChild(item)
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                  title={collapsed ? item.title : undefined}
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3 flex-1 min-w-0'}`}>
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="font-medium text-sm sm:text-base truncate">{item.title}</span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      {openItems.includes(item.title) ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 ml-2" />
                      )}
                    </>
                  )}
                </button>
                
                {!collapsed && openItems.includes(item.title) && (
                  <div className="mt-2 ml-4 sm:ml-6 space-y-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.title}
                        to={subItem.url}
                        onClick={closeMobileSidebar}
                        className={`block p-2 rounded-md text-sm transition-colors touch-target ${
                          isActive(subItem.url)
                            ? "bg-white/15 text-white"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                to={item.url!}
                onClick={closeMobileSidebar}
                className={`flex items-center rounded-lg transition-colors touch-target ${
                  collapsed ? 'p-2 justify-center' : 'space-x-3 p-3'
                } ${
                  isActive(item.url!)
                    ? (collapsed ? "text-white border-l-2 border-white" : "bg-white/15 text-white")
                    : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-sm sm:text-base truncate">{item.title}</span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* 사이드 드롭다운 */}
      {sideDropdown.isOpen && sideDropdown.menu && (
        <div
          ref={dropdownRef}
          className="fixed left-16 bg-navy border border-white/20 rounded-lg shadow-lg py-2 z-50 min-w-[200px]"
          style={{ 
            top: sideDropdown.position?.top || 0,
          }}
        >
          <div className="px-3 py-2 border-b border-white/20">
            <h3 className="font-semibold text-white text-base">{sideDropdown.menu.title}</h3>
          </div>
          <div className="py-1">
            {sideDropdown.menu.items?.map((subItem) => (
              <Link
                key={subItem.title}
                to={subItem.url}
                onClick={() => {
                  closeSideDropdown()
                  closeMobileSidebar()
                }}
                className={`block px-3 py-2 text-base transition-colors ${
                  isActive(subItem.url)
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {subItem.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar; 