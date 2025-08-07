"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from "./button"
import { cn } from "../../lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface MinimalCalendarProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  className?: string
  maxDate?: Date
  minDate?: Date
  disabled?: boolean
}

export default function MinimalCalendar({
  value,
  onChange,
  placeholder = "날짜를 선택하세요",
  className = "",
  maxDate,
  minDate,
  disabled = false
}: MinimalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null)

  // value prop이 변경될 때 내부 상태 동기화
  useEffect(() => {
    if (value) {
      const newDate = new Date(value);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    } else {
      setSelectedDate(null);
    }
  }, [value?.getTime()]) // value의 시간값이 변경될 때만 실행

  // 한국 시간으로 오늘 날짜 계산 (브라우저 로컬 시간 사용)
  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 월의 첫 번째 날과 마지막 날
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  // 첫 번째 날의 요일 (일요일: 0, 월요일: 1, ...)
  const firstDayWeekday = firstDayOfMonth.getDay()
  
  // 달력에 표시할 날짜들 생성
  const daysInMonth = lastDayOfMonth.getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  // 이전 달로 이동
  const goToPreviousMonth = () => {
    if (disabled) return
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  // 다음 달로 이동
  const goToNextMonth = () => {
    if (disabled) return
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  // 오늘 날짜로 이동 - 한국 시간 기준
  const goToToday = () => {
    if (disabled) return
    setCurrentDate(today)
    setSelectedDate(today)
    onChange?.(today)
  }
  
  // 날짜 선택
  const selectDate = (day: number) => {
    if (disabled) return
    
    const newDate = new Date(year, month, day)
    
    // 최소/최대 날짜 제한 확인
    if (minDate && newDate < minDate) return
    if (maxDate && newDate > maxDate) return
    
    setSelectedDate(newDate)
    onChange?.(newDate)
  }
  
  // 오늘 날짜인지 확인 (현재 보고 있는 월에서만) - 한국 시간 기준
  const isToday = (day: number) => {
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day
  }
  
  // 현재 보고 있는 달이 오늘 날짜의 달인지 확인 - 한국 시간 기준
  const isCurrentMonth = () => {
    return today.getFullYear() === year && today.getMonth() === month
  }
  
  // 선택된 날짜인지 확인
  const isSelected = (day: number) => {
    return selectedDate && 
           selectedDate.getFullYear() === year && 
           selectedDate.getMonth() === month && 
           selectedDate.getDate() === day
  }

  // 날짜가 비활성화되어야 하는지 확인
  const isDisabled = (day: number) => {
    const date = new Date(year, month, day)
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }
  
  const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
  ]
  
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"]

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            disabled={disabled}
            className="h-8 w-8 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Select 
              value={year.toString()} 
              onValueChange={(value) => !disabled && setCurrentDate(new Date(parseInt(value), month, 1))}
              disabled={disabled}
            >
              <SelectTrigger className="border-0 bg-transparent hover:bg-gray-50 h-auto p-1 px-2 rounded-md shadow-none text-sm font-semibold text-gray-700 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 min-w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md shadow-sm">
                {Array.from({ length: 21 }, (_, i) => {
                  const yearOption = new Date().getFullYear() - 10 + i
                  return (
                    <SelectItem key={yearOption} value={yearOption.toString()}>
                      {yearOption}년
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            
            <Select 
              value={month.toString()} 
              onValueChange={(value) => !disabled && setCurrentDate(new Date(year, parseInt(value), 1))}
              disabled={disabled}
            >
              <SelectTrigger className="border-0 bg-transparent hover:bg-gray-50 h-auto p-1 px-2 rounded-md shadow-none text-sm font-semibold text-gray-700 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 min-w-[60px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md shadow-sm">
                {monthNames.map((monthName, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={disabled}
            className="h-8 w-8 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekdays.map((weekday) => (
            <div
              key={weekday}
              className="p-2 text-center text-xs font-medium text-gray-500"
            >
              {weekday}
            </div>
          ))}
        </div>
        
        {/* 달력 그리드 */}
        <div className="grid grid-cols-7">
          {/* 빈 셀들 (이전 달의 마지막 날짜들) */}
          {Array.from({ length: firstDayWeekday }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square p-1" />
          ))}
          
          {/* 현재 달의 날짜들 */}
          {days.map((day) => (
            <div key={day} className="aspect-square p-1">
              <button
                onClick={() => {
                  selectDate(day);
                }}
                disabled={isDisabled(day) || disabled}
                className={cn(
                  "w-full h-full rounded-md text-sm font-medium transition-all duration-200",
                  "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                  {
                    // 오늘 날짜 스타일 (선택되지 않은 경우)
                    "bg-[#152436] text-white hover:bg-[#1a2a3f]": isToday(day) && !isSelected(day) && !isDisabled(day),
                    // 선택된 날짜 스타일 (오늘 날짜가 아닌 경우)
                    "bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-1": isSelected(day) && !isToday(day),
                    // 오늘 날짜이면서 선택된 경우
                    "bg-blue-600 text-white ring-2 ring-[#152436] ring-offset-1": isSelected(day) && isToday(day),
                    // 비활성화된 날짜
                    "text-gray-300 cursor-not-allowed": isDisabled(day),
                    // 일반 날짜 스타일
                    "text-gray-900": !isToday(day) && !isSelected(day) && !isDisabled(day),
                  }
                )}
              >
                {day}
              </button>
            </div>
          ))}
        </div>
        
        {/* 하단 버튼들 */}
        <div className="flex items-center justify-between p-2 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDate(null)
              onChange?.(null)
            }}
            disabled={disabled}
            className="h-6 px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 rounded-md"
          >
            삭제
          </Button>
          
          {!isCurrentMonth() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              disabled={disabled}
              className="h-6 px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 rounded-md"
            >
              오늘
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 