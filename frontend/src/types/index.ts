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
}

// 2. 어종 테이블
export interface FishType {
  id: number;
  fish_name: string;
  aliases?: string[];  // 동의어 배열
  embedding?: number[]; // 벡터 검색용 (선택사항)
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

// 4. 주문 테이블
export interface Order {
  id: number;
  business_id: number;
  total_price: number;
  order_datetime: string;
  memo?: string;
  source_type: 'voice' | 'text';
  raw_input_path?: string;
  transcribed_text?: string;
  delivery_date?: string;
  status: 'success' | 'failed' | 'pending';
  // 조인된 데이터
  business?: Business;
  items?: OrderItem[];
}

// 5. 주문 아이템 테이블
export interface OrderItem {
  id: number;
  order_id: number;
  fish_type_id: number;
  quantity: number;
  unit_price?: number;
  unit?: string;
  // 조인된 데이터
  fish_type?: FishType;
}

// 6. SMS 추천 테이블
export interface SmsRecommendation {
  id: number;
  business_id: number;
  recommended_text: string;
  fish_type: string;
  price_trend: '상승' | '하락' | '유지';
  created_at: string;
  is_sent: boolean;
  sent_at?: string;
  // 조인된 데이터
  business?: Business;
}

// 7. 시장 시세 데이터 테이블
export interface PriceData {
  id: number;
  fish_type: string;
  market_name: string;
  date: string;
  min_price: number;
  max_price: number;
  avg_price: number;
}

// 8. 결제 이력 테이블
export interface Payment {
  id: number;
  order_id: number;
  business_id: number;
  amount: number;
  method: 'bank_transfer' | 'card' | 'cash';
  status: 'paid' | 'pending' | 'failed';
  paid_at?: string;
  created_at: string;
  // 조인된 데이터
  order?: Order;
  business?: Business;
}

// ==================== API 응답 관련 타입 ====================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
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

export interface PaymentFormData {
  order_id: number;
  business_id: number;
  amount: number;
  method: 'bank_transfer' | 'card' | 'cash';
  paid_at?: string;
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