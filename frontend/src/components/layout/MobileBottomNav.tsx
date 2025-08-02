"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, Users, ShoppingCart, Package, TrendingUp, ChevronUp } from "lucide-react"

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: Array<{
    title: string;
    url: string;
  }>;
}

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
      { title: "거래처 리스트", url: "/customers" },
      { title: "미수금 내역", url: "/customers/unpaid" },
      { title: "정산 처리", url: "/customers/settlement" },
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
      { title: "판매 내역", url: "/sales" },
      { title: "매출 통계", url: "/sales/chart" },
      { title: "경매 시세 예측", url: "/sales/prediction" },
    ],
  },
]

const MobileBottomNav: React.FC = () => {
  const location = useLocation()
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const isActive = (url: string) => {
    return location.pathname === url
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.url) {
      // 직접 링크인 경우 바로 이동
      return
    } else if (item.items) {
      // 하위 메뉴가 있는 경우 모달 토글
      setActiveModal(activeModal === item.title ? null : item.title)
    }
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="flex justify-around items-center h-16 px-2">
        {menuItems.map((item) => (
          <div key={item.title} className="flex flex-col items-center">
            {item.url ? (
              <Link
                to={item.url}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isActive(item.url)
                    ? "text-white bg-white/10"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <item.icon className="h-6 w-6 mb-1" />
                <span className="text-xs">{item.title}</span>
              </Link>
            ) : (
              <button
                onClick={() => handleItemClick(item)}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  activeModal === item.title
                    ? "text-white bg-white/10"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <item.icon className="h-6 w-6 mb-1" />
                <span className="text-xs">{item.title}</span>
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Modal for submenu */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={closeModal}>
          <div className="absolute bottom-16 left-4 right-4 bg-navy rounded-lg shadow-lg border border-white/10">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">{activeModal}</h3>
                <button onClick={closeModal} className="text-white/70 hover:text-white">
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {menuItems.find(item => item.title === activeModal)?.items?.map((subItem) => (
                  <Link
                    key={subItem.title}
                    to={subItem.url}
                    onClick={closeModal}
                    className={`block p-3 rounded-lg text-sm transition-colors ${
                      isActive(subItem.url)
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileBottomNav 