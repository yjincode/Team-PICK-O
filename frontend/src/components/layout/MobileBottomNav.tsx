/**
 * 모바일 하단 네비게이션 컴포넌트
 * 모바일에서 하단 네비게이션을 제공하며, 계층적 메뉴 구조를 모달로 표시합니다
 */
"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronUp } from "lucide-react"
import { menuItems, MenuItem } from "../../types/navigation"

const MobileBottomNav: React.FC = () => {
  const location = useLocation()
  // 활성 모달 상태 관리
  const [activeModal, setActiveModal] = useState<string | null>(null)

  // 현재 활성 페이지 확인
  const isActive = (url: string) => {
    return location.pathname === url
  }

  // 메뉴 아이템 클릭 핸들러
  const handleItemClick = (item: MenuItem) => {
    if (item.url) {
      // 직접 링크인 경우 바로 이동
      return
    } else if (item.items) {
      // 하위 메뉴가 있는 경우 모달 토글
      setActiveModal(activeModal === item.title ? null : item.title)
    }
  }

  // 모달 닫기
  const closeModal = () => {
    setActiveModal(null)
  }

  return (
    <>
      {/* 하단 네비게이션 바 */}
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