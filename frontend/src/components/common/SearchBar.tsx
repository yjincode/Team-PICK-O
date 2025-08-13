import React from 'react'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'

/**
 * SearchBar 컴포넌트의 Props 인터페이스
 */
interface SearchBarProps {
  /** 검색창에 표시될 placeholder 텍스트 */
  placeholder?: string
  /** 검색어 값 */
  value: string
  /** 검색어 변경 시 호출되는 콜백 함수 */
  onChange: (value: string) => void
  /** 추가 CSS 클래스 */
  className?: string
  /** 검색창 너비 (Tailwind CSS 클래스) */
  width?: string
  /** 검색창 비활성화 여부 */
  disabled?: boolean
}

/**
 * 재활용 가능한 검색바 컴포넌트
 * 
 * 검색 기능이 필요한 모든 페이지에서 사용할 수 있는 공용 컴포넌트입니다.
 * 검색 아이콘과 입력 필드가 포함되어 있으며, 다양한 스타일링 옵션을 제공합니다.
 * 
 * @example
 * ```tsx
 * // 기본 사용법
 * const [searchQuery, setSearchQuery] = useState("")
 * 
 * <SearchBar
 *   placeholder="거래처명 또는 주문번호 검색"
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   width="w-[280px]"
 * />
 * 
 * // 전체 너비 검색바
 * <SearchBar
 *   placeholder="검색어를 입력하세요"
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   width="w-full"
 * />
 * 
 * // 비활성화된 검색바
 * <SearchBar
 *   placeholder="검색 중..."
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   disabled={true}
 * />
 * ```
 */
const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "검색어를 입력하세요",
  value,
  onChange,
  className = "",
  width = "w-[280px]",
  disabled = false
}) => {
  return (
    <div className={`relative ${width} ${className}`}>
      {/* 검색 아이콘 */}
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      
      {/* 검색 입력 필드 */}
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
        disabled={disabled}
      />
    </div>
  )
}

export default SearchBar 