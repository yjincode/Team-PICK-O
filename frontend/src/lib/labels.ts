// 공통 라벨/배지 매핑 유틸

export type Domain =
  | 'orderStatus'
  | 'paymentStatus'
  | 'paymentMethod'
  | 'inventoryStatus'

// 한글 라벨 매핑
const LABELS: Record<Domain, Record<string, string>> = {
  orderStatus: {
    placed: '등록',
    ready: '출고 준비',
    delivered: '완료',
    cancelled: '취소',
  },

  paymentStatus: {
    pending: '결제 대기',
    paid: '결제 완료',
    refunded: '환불됨',
  },

  paymentMethod: {
    card: '카드',
    cash: '현금',
    bank_transfer: '계좌이체',
  },

  inventoryStatus: {
    in_stock: '재고 있음',
    low: '재고 부족',
    out: '품절',
  },
}

// 배지 스타일 매핑 (tailwind classes)
const BADGE: Record<Domain, Record<string, string>> = {
  orderStatus: {
    placed: 'bg-gray-100 text-gray-800',
    ready: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  },

  paymentStatus: {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
  },

  paymentMethod: {
    card: 'bg-blue-100 text-blue-800',
    cash: 'bg-emerald-100 text-emerald-800',
    bank_transfer: 'bg-indigo-100 text-indigo-800',
  },

  inventoryStatus: {
    in_stock: 'bg-green-100 text-green-800',
    low: 'bg-orange-100 text-orange-800',
    out: 'bg-red-100 text-red-800',
  },
}

export const getLabel = (
  domain: Domain,
  code?: string,
  fallback = '-'
): string => {
  if (!code) return fallback
  return LABELS[domain][code] ?? fallback
}

export const getBadgeClass = (
  domain: Domain,
  code?: string,
  fallback = 'bg-gray-100 text-gray-800'
): string => {
  if (!code) return fallback
  return BADGE[domain][code] ?? fallback
}


