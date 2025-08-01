"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, Users, ShoppingCart, Package, TrendingUp, ChevronDown, ChevronRight } from "lucide-react"
import { SharkMascot } from "../common/SharkMascot"

const menuItems = [
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

function Sidebar() {
  const location = useLocation()
  const [openItems, setOpenItems] = useState(["고객 관리"])

  const toggleItem = (title) => {
    setOpenItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const isActive = (url) => {
    return location.pathname === url
  }

  return (
    <aside className="w-64 bg-navy text-white h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20">
            <SharkMascot />
          </div>
          <h1 className="text-xl font-bold text-white">바다 대장부</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.items ? (
              <div>
                <button
                  onClick={() => toggleItem(item.title)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    openItems.includes(item.title)
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.title}</span>
                  </div>
                  {openItems.includes(item.title) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {openItems.includes(item.title) && (
                  <div className="mt-2 ml-6 space-y-1">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.title}
                        to={subItem.url}
                        className={`block p-2 rounded-md text-sm transition-colors ${
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
                to={item.url}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isActive(item.url)
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar; 