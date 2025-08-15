/**
 * 애플리케이션 타입 정의
 * 백엔드 DB 스키마와 일치하도록 정의
 */

// ==================== DB 스키마 기반 타입 ====================

// 1. 거래처/고객 테이블
export interface Business {
  id: number;
  business_name: string;
  phone_number: string;
  address?: string;
  memo?: string;
  outstanding_balance: number; // 미수금 필드 추가
}

// 2. 어종 테이블
export interface FishType {
  id: number;
  name: string;  // fish_name에서 name으로 변경
  aliases?: string;  // 배열에서 문자열로 변경 (백엔드 모델과 일치)
  scientific_name?: string;
  unit: string;
  notes?: string;
  created_at?: string;
}

// 3. 재고 테이블
export interface Inventory {
  id: number;
  fish_type_id: number;
  stock_quantity: number;
  unit?: string;
  status?: string;
  aquarium_photo_path?: string;
  // 조인된 데이터
  fish_type?: FishType;
}

// ==================== 주문 관련 타입 ====================

// 주문 품목
export interface OrderItem {
  id?: number;
  fish_type: number;
  fish_type_name?: string;  // 백엔드 응답에 포함됨
  item_name_snapshot: string;
  quantity: number;
  unit_price: number;
  unit_price_snapshot?: number;
  unit: string;
  remarks?: string;
}

// 주문 기본 타입 (백엔드 Django 모델과 1:1 매핑)
export interface Order {
  id: number;
  user: number;
  business_id: number;
  business_name?: string;  // 백엔드 응답에 포함됨
  business_phone?: string; // 백엔드 응답에 포함됨
  business_address?: string; // 백엔드 응답에 포함됨
  total_price: number;
  order_datetime: string;
  memo?: string;
  source_type: 'manual' | 'voice' | 'text';
  raw_input_path?: string;
  transcribed_text?: string;
  delivery_datetime?: string;
  ship_out_datetime?: string;
  order_status: 'placed' | 'ready' | 'delivered' | 'cancelled';
  cancel_reason?: string;
  is_urgent: boolean;
  last_updated_at: string;
  items: OrderItem[];
}

// 주문 목록용 타입 (OrderListSerializer와 일치)
export interface OrderListItem {
  id: number;
  business: {
    id: number;
    business_name: string;
    phone_number: string;
  };
  total_price: number;
  order_datetime: string;
  delivery_datetime?: string;
  order_status: 'placed' | 'ready' | 'delivered' | 'cancelled';
  is_urgent: boolean;
  items_summary: string;
  memo?: string;
  source_type: 'manual' | 'voice' | 'text';
  transcribed_text?: string;
  last_updated_at: string;
  payment?: {
    id: number;
    payment_status: 'pending' | 'paid' | 'refunded';
    amount: number;
    method: 'card' | 'cash' | 'bank_transfer';
    paid_at?: string;
  };
}

// ==================== API 응답 관련 타입 ====================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

// ==================== 결제 관련 타입 ====================

// 결제 정보
export interface Payment {
  id: number;
  order: number;
  business: number;
  amount: number;
  method: 'card' | 'cash' | 'bank_transfer';
  payment_status: 'pending' | 'paid' | 'refunded';
  paid_at?: string;
  created_at: string;
  imp_uid?: string;
  merchant_uid?: string;
  receipt_url?: string;
  card_approval_number?: string;
  bank_name?: string;
  payer_name?: string;
  refunded: boolean;
  refund_reason?: string;
  business_name?: string;
  order_total_price?: number;
}

// 토스 페이먼츠 확정 요청
export interface TossConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 수동 결제 완료 요청
export interface MarkPaidRequest {
  orderId: number;
  amount: number;
  method: 'cash' | 'bank_transfer';
  payerName?: string;
  bankName?: string;
}

// 미결제 주문 정보
export interface UnpaidOrder {
  orderId: number;
  businessId: number;
  businessName?: string;
  unpaidAmount: number;
  orderStatus: 'placed' | 'ready' | 'delivered' | 'cancelled';
  orderDatetime: string;
  deliveryDatetime?: string;
}

// 미수금 요약
export interface ARSummary {
  businessId: number;
  businessName: string;
  unpaidTotal: number;
  unpaidOrders: number;
}

// ==================== 환불/취소 관련 타입 ====================

// 환불 요청
export interface RefundRequest {
  orderId: number;
  refundReason: string;
}

// 주문 취소 요청
export interface CancelOrderRequest {
  orderId: number;
  cancelReason: string;
}

// 환불 응답
export interface RefundResponse {
  orderId: number;
  paymentId: number;
  status: 'refunded';
  refundAmount: number;
  refundReason: string;
}

// 주문 취소 응답
export interface CancelOrderResponse {
  orderId: number;
  status: 'cancelled';
  cancelReason: string;
}

// ==================== 폼 데이터 관련 타입 ====================

export interface BusinessFormData {
  business_name: string;
  phone_number: string;
  address?: string;
}

export interface FishTypeFormData {
  fish_name: string;
  aliases?: string[];
}

export interface InventoryFormData {
  fish_type_id: number;
  stock_quantity: number;
  unit?: string;
  status?: string;
}

export interface OrderFormData {
  business_id: number;
  total_price: number;
  memo?: string;
  source_type: 'voice' | 'text';
  delivery_date?: string;
  items: Array<{
    fish_type_id: number;
    quantity: number;
    unit_price?: number;
    unit?: string;
  }>;
}

// ==================== UI 컴포넌트 Props 타입 ====================

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: React.ReactNode;
}

export interface ChartProps {
  data: any[];
  title?: string;
  className?: string;
}

// ==================== 반응형 디자인 관련 타입 ====================

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

// ==================== 기존 호환성을 위한 타입 (점진적 마이그레이션) ====================

// 기존 Customer 타입을 Business로 매핑
export interface Customer extends Business {
  total_purchases?: number;
  unpaid_amount?: number;
  created_at?: string;
  updated_at?: string;
}

// 기존 FishItem 타입을 Inventory로 매핑
export interface FishItem extends Inventory {
  name?: string;
  type?: string;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

// 기존 SalesData 타입
export interface SalesData {
  date: string;
  amount: number;
  quantity: number;
}

export interface SalesSummary {
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  top_selling_items: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
} 