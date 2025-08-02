/**
 * 상어 마스코트 로고 컴포넌트
 * 애플리케이션의 브랜드 로고를 표시합니다
 */
import React from "react"

export const SharkMascot: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img 
        src="/logo.png" 
        alt="바다 대장부 로고" 
        className="w-full h-full object-contain"
      />
    </div>
  )
} 