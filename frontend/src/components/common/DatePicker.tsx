import React, { useState } from 'react'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { CalendarIcon, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import MinimalCalendar from '../ui/MinimalCalendar'

/**
 * DatePicker 컴포넌트의 Props 인터페이스
 */
export interface DatePickerProps {
  /** 선택된 날짜 */
  value?: Date
  /** 날짜 변경 핸들러 */
  onChange: (date: Date | undefined) => void
  /** placeholder 텍스트 */
  placeholder?: string
  /** 날짜 형식 (기본값: "yyyy-MM-dd") */
  dateFormat?: string
  /** 최대 선택 가능한 날짜 */
  maxDate?: Date
  /** 최소 선택 가능한 날짜 */
  minDate?: Date
  /** 날짜 선택 비활성화 여부 */
  disabled?: boolean
  /** 추가 CSS 클래스 */
  className?: string
  /** 날짜 선택기 너비 (Tailwind CSS 클래스) */
  width?: string
  /** 날짜 초기화 버튼 표시 여부 */
  showClearButton?: boolean
  /** 날짜 범위 선택 모드 */
  mode?: 'single' | 'range'
  /** 날짜 범위 선택 시 사용할 props */
  rangeProps?: {
    from?: Date
    to?: Date
    onFromChange?: (date: Date | undefined) => void
    onToChange?: (date: Date | undefined) => void
  }
}

/**
 * 재활용 가능한 날짜 선택 컴포넌트
 * 
 * 단일 날짜 선택과 날짜 범위 선택을 지원하며,
 * 다양한 스타일링 옵션을 제공합니다.
 * 
 * @example
 * ```tsx
 * // 기본 사용법 (단일 날짜)
 * const [selectedDate, setSelectedDate] = useState<Date>()
 * 
 * <DatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   placeholder="날짜를 선택하세요"
 * />
 * 
 * // 날짜 범위 선택
 * const [dateRange, setDateRange] = useState<{from?: Date, to?: Date}>({})
 * 
 * <DatePicker
 *   mode="range"
 *   rangeProps={{
 *     from: dateRange.from,
 *     to: dateRange.to,
 *     onFromChange: (date) => setDateRange(prev => ({ ...prev, from: date })),
 *     onToChange: (date) => setDateRange(prev => ({ ...prev, to: date }))
 *   }}
 *   placeholder="날짜 범위를 선택하세요"
 * />
 * 
 * // 최대/최소 날짜 제한
 * <DatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   maxDate={new Date()}
 *   minDate={new Date('2024-01-01')}
 *   showClearButton={true}
 * />
 * ```
 */
const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "날짜를 선택하세요",
  dateFormat = "yyyy-MM-dd",
  maxDate,
  minDate,
  disabled = false,
  className = "",
  width = "w-[200px]",
  showClearButton = false,
  mode = 'single',
  rangeProps
}) => {
  const [isOpen, setIsOpen] = useState(false)

  /**
   * 날짜를 지정된 형식으로 포맷하는 함수
   */
  const formatDate = (date: Date | undefined) => {
    if (!date) return ""
    return format(date, dateFormat)
  }

  /**
   * 날짜 초기화 핸들러
   */
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mode === 'single') {
      onChange(undefined)
    } else if (rangeProps) {
      rangeProps.onFromChange?.(undefined)
      rangeProps.onToChange?.(undefined)
    }
  }

  /**
   * 날짜 범위 텍스트를 반환하는 함수
   */
  const getRangeText = () => {
    if (!rangeProps?.from && !rangeProps?.to) return placeholder
    
    if (rangeProps.from && rangeProps.to) {
      return `${formatDate(rangeProps.from)} ~ ${formatDate(rangeProps.to)}`
    } else if (rangeProps.from) {
      return `${formatDate(rangeProps.from)} ~`
    } else if (rangeProps.to) {
      return `~ ${formatDate(rangeProps.to)}`
    }
    
    return placeholder
  }

  /**
   * 단일 날짜 텍스트를 반환하는 함수
   */
  const getSingleText = () => {
    return value ? formatDate(value) : placeholder
  }

  return (
    <div className={cn("relative", width, className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && !rangeProps?.from && !rangeProps?.to && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {mode === 'single' ? getSingleText() : getRangeText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {mode === 'single' ? (
            <MinimalCalendar
              value={value || null}
              onChange={(date) => {
                onChange(date || undefined)
                setIsOpen(false)
              }}
              maxDate={maxDate}
              minDate={minDate}
              disabled={disabled}
            />
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">시작일</h4>
                  <MinimalCalendar
                    value={rangeProps?.from || null}
                    onChange={(date) => {
                      rangeProps?.onFromChange?.(date || undefined)
                    }}
                    maxDate={maxDate}
                    minDate={minDate}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">종료일</h4>
                  <MinimalCalendar
                    value={rangeProps?.to || null}
                    onChange={(date) => {
                      rangeProps?.onToChange?.(date || undefined)
                    }}
                    maxDate={maxDate}
                    minDate={minDate}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      
      {/* 날짜 초기화 버튼 */}
      {showClearButton && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-6 w-6 p-0"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

export default DatePicker 