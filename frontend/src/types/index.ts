// Customer types
export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  total_purchases: number;
  unpaid_amount: number;
  created_at: string;
  updated_at: string;
}

// Fish Item types
export interface FishItem {
  id: number;
  name: string;
  type: string;
  quantity: number;
  price: number;
  status: 'available' | 'sold' | 'reserved';
  created_at: string;
  updated_at: string;
}

// Order types
export interface Order {
  id: number;
  customer_id: number;
  customer_name: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  fish_item_id: number;
  fish_name: string;
  quantity: number;
  price: number;
  total_price: number;
}

// Sales types
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

// API Response types
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

// Form types
export interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
}

export interface FishItemFormData {
  name: string;
  type: string;
  quantity: number;
  price: number;
}

export interface OrderFormData {
  customer_id: number;
  items: Array<{
    fish_item_id: number;
    quantity: number;
  }>;
}

// UI Component props
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

// Responsive breakpoints
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
} 