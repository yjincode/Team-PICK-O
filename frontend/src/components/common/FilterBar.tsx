import React from 'react'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import SearchBar from './SearchBar'
import DatePicker from './DatePicker'

/**
 * 필터 옵션 인터페이스
 */
export interface FilterOption {
  /** 옵션 값 */
  value: string
  /** 옵션 표시 텍스트 */
  label: string
}

/**
 * 날짜 필터 인터페이스
 */
export interface DateFilter {
  /** 날짜 필터 라벨 */
  label: string
  /** 선택된 날짜 값 */
  value: Date | undefined
  /** 날짜 변경 핸들러 */
  onChange: (date: Date | undefined) => void
  /** 최대 선택 가능한 날짜 */
  maxDate?: Date
}

/**
 * 선택 필터 인터페이스
 */
export interface SelectFilter {
  /** 필터 라벨 */
  label: string
  /** 선택된 값 */
  value: string
  /** 값 변경 핸들러 */
  onChange: (value: string) => void
  /** 필터 옵션 목록 */
  options: FilterOption[]
  /** placeholder 텍스트 */
  placeholder?: string
  /** 필터 너비 (Tailwind CSS 클래스) */
  width?: string
}

/**
 * FilterBar 컴포넌트의 Props 인터페이스
 */
export interface FilterBarProps {
  /** 선택 필터 목록 */
  selectFilters?: SelectFilter[]
  /** 날짜 필터 목록 */
  dateFilters?: DateFilter[]
  /** 검색 필터 */
  searchFilter?: {
    placeholder?: string
    value: string
    onChange: (value: string) => void
    width?: string
  }
  /** 추가 CSS 클래스 */
  className?: string
  /** 필터바 레이아웃 방향 */
  layout?: 'horizontal' | 'vertical' | 'responsive'
}

/**
 * 재활용 가능한 필터바 컴포넌트
 * 
 * 다양한 필터 옵션(선택 필터, 날짜 필터, 검색 필터)을 지원하며,
 * 레이아웃을 유연하게 조정할 수 있습니다.
 * 
 * @example
 * ```tsx
 * // 기본 사용법 (주문 목록)
 * const [statusFilter, setStatusFilter] = useState("all")
 * const [dateFilter, setDateFilter] = useState<Date>()
 * const [searchQuery, setSearchQuery] = useState("")
 * 
 * <FilterBar
 *   selectFilters={[
 *     {
 *       label: "주문 상태",
 *       value: statusFilter,
 *       onChange: setStatusFilter,
 *       options: [
 *         { value: "all", label: "전체" },
 *         { value: "pending", label: "대기중" },
 *         { value: "paid", label: "결제완료" }
 *       ]
 *     }
 *   ]}
 *   dateFilters={[
 *     {
 *       label: "주문일자",
 *       value: dateFilter,
 *       onChange: setDateFilter
 *     }
 *   ]}
 *   searchFilter={{
 *     placeholder: "거래처명 또는 주문번호 검색",
 *     value: searchQuery,
 *     onChange: setSearchQuery
 *   }}
 * />
 * 
 * // 간단한 검색만 있는 경우 (거래처 목록)
 * <FilterBar
 *   searchFilter={{
 *     placeholder: "거래처명, 전화번호로 검색...",
 *     value: searchQuery,
 *     onChange: setSearchQuery,
 *     width: "w-full"
 *   }}
 * />
 * 
 * // 수평 레이아웃
 * <FilterBar
 *   layout="horizontal"
 *   selectFilters={[...]}
 *   searchFilter={{...}}
 * />
 * ```
 */
const FilterBar: React.FC<FilterBarProps> = ({
  selectFilters = [],
  dateFilters = [],
  searchFilter,
  className = "",
  layout = 'responsive'
}) => {
  /**
   * 레이아웃에 따른 CSS 클래스 반환
   */
  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-row items-center gap-4'
      case 'vertical':
        return 'flex flex-col gap-4'
      case 'responsive':
      default:
        return 'flex flex-col gap-4 md:flex-row md:items-center md:justify-between'
    }
  }

  /**
   * 필터 그룹에 따른 CSS 클래스 반환
   */
  const getFilterGroupClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex items-center gap-4'
      case 'vertical':
        return 'flex flex-col gap-4'
      case 'responsive':
      default:
        return 'flex flex-col gap-4 md:flex-row md:items-center'
    }
  }

  return (
    <div className={`flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className={getLayoutClasses()}>
        {/* 필터 그룹 */}
        <div className={getFilterGroupClasses()}>
          {/* 선택 필터들 */}
          {selectFilters.map((filter, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label htmlFor={`filter-${index}`} className="text-sm font-medium text-gray-700">
                {filter.label}
              </Label>
              <Select value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger className={filter.width || "w-[140px]"}>
                  <SelectValue placeholder={filter.placeholder || "선택"} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* 날짜 필터들 */}
          {dateFilters.map((filter, index) => (
            <div key={`date-${index}`} className="flex items-center gap-2">
              <Label className="text-sm font-medium text-gray-700">
                {filter.label}
              </Label>
              <DatePicker
                value={filter.value}
                onChange={filter.onChange}
                maxDate={filter.maxDate}
                placeholder={`${filter.label} 선택`}
                width="w-[140px]"
              />
            </div>
          ))}
        </div>

        {/* 검색 필터 */}
        {searchFilter && (
          <SearchBar
            placeholder={searchFilter.placeholder || "검색어를 입력하세요"}
            value={searchFilter.value}
            onChange={searchFilter.onChange}
            width={searchFilter.width || "w-[280px]"}
          />
        )}
      </div>
    </div>
  )
}

export default FilterBar 