import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return `₩${amount.toLocaleString()}`
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("ko-KR")
} 