/**
 * 유틸리티 함수들
 * 공통으로 사용되는 헬퍼 함수들을 정의합니다
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * CSS 클래스명을 병합하는 함수
 * clsx와 tailwind-merge를 조합하여 중복 클래스를 제거합니다
 * 
 * @param inputs - 병합할 CSS 클래스들
 * @returns 병합된 CSS 클래스 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 금액을 한국 원화 형식으로 포맷팅하는 함수
 * 
 * @param amount - 포맷팅할 금액
 * @returns 한국 원화 형식의 문자열 (예: ₩1,234,567)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

/**
 * 날짜를 한국어 형식으로 포맷팅하는 함수
 * 
 * @param date - 포맷팅할 날짜 (문자열 또는 Date 객체)
 * @returns 한국어 날짜 형식 (예: 2024년 1월 30일)
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅하는 함수
 * 
 * @param date - 포맷팅할 날짜 (문자열 또는 Date 객체)
 * @returns 한국어 날짜시간 형식 (예: 2024.01.30 14:30)
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
} 