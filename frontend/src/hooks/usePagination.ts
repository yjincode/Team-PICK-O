import { useState, useEffect } from 'react'

/**
 * usePagination 훅의 Props 인터페이스
 */
interface UsePaginationProps {
  /** 한 페이지당 표시할 아이템 수 */
  itemsPerPage: number
  /** 전체 아이템 수 */
  totalItems: number
  /** 초기 페이지 번호 (기본값: 1) */
  initialPage?: number
}

/**
 * usePagination 훅의 반환값 인터페이스
 */
interface UsePaginationReturn<T> {
  /** 현재 페이지 번호 */
  currentPage: number
  /** 전체 페이지 수 */
  totalPages: number
  /** 현재 페이지의 시작 인덱스 */
  startIndex: number
  /** 현재 페이지의 끝 인덱스 */
  endIndex: number
  /** 현재 페이지에 표시할 아이템들 */
  currentItems: T[]
  /** 페이지 변경 핸들러 */
  handlePageChange: (page: number) => void
  /** 페이지 리셋 핸들러 */
  resetPage: () => void
}

/**
 * 페이지네이션을 위한 커스텀 훅
 * 
 * 리스트 형태의 데이터를 페이지 단위로 나누어 표시할 때 사용합니다.
 * 페이지 변경, 아이템 슬라이싱, 페이지 리셋 등의 기능을 제공합니다.
 * 
 * @example
 * ```tsx
 * // 기본 사용법
 * const [items, setItems] = useState<Item[]>([])
 * const {
 *   currentPage,
 *   totalPages,
 *   currentItems,
 *   handlePageChange,
 *   resetPage
 * } = usePagination(items, {
 *   itemsPerPage: 10,
 *   totalItems: items.length
 * })
 * 
 * // 페이지 변경 시
 * <button onClick={() => handlePageChange(currentPage + 1)}>
 *   다음 페이지
 * </button>
 * 
 * // 필터 변경 시 페이지 리셋
 * useEffect(() => {
 *   resetPage()
 * }, [filterValue])
 * ```
 */
export const usePagination = <T>(
  items: T[],
  { itemsPerPage, totalItems, initialPage = 1 }: UsePaginationProps
): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState(initialPage)

  // 총 페이지 수 계산
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // 현재 페이지의 시작과 끝 인덱스 계산
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage

  // 현재 페이지에 표시할 아이템들
  const currentItems = items.slice(startIndex, endIndex)

  /**
   * 페이지 변경 핸들러
   * @param page 변경할 페이지 번호
   */
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // 페이지 변경 시 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /**
   * 페이지 리셋 핸들러
   * 첫 번째 페이지로 이동합니다.
   */
  const resetPage = () => {
    setCurrentPage(1)
  }

  // 총 아이템 수가 변경되면 페이지 재계산
  useEffect(() => {
    const newTotalPages = Math.ceil(totalItems / itemsPerPage)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }
  }, [totalItems, itemsPerPage, currentPage])

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    currentItems,
    handlePageChange,
    resetPage,
  }
} 