/**
 * 네비게이션 관련 타입 정의 및 메뉴 구성
 */
import { Home, Users, ShoppingCart, Package, TrendingUp } from "lucide-react"

// 메뉴 아이템 타입 정의
export interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: Array<{
    title: string;
    url: string;
  }>;
}

// 네비게이션 상태 관련 타입
export interface NavigationState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  openItems: string[];
}

// 사이드바 props 타입
export interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// 모바일 네비게이션 관련 타입
export interface MobileNavProps {
  className?: string;
}

// 네비게이션 메뉴 구성 (Sidebar 기준)
export const menuItems: MenuItem[] = [
  {
    title: "메인 화면",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "고객 관리",
    icon: Users,
    url: "/business"
  },
  {
    title: "주문 관리",
    icon: ShoppingCart,
    url: "/orders"
  },
  {
    title: "재고 관리",
    icon: Package,
    items: [
      { title: "어종 재고", url: "/inventory" },
      { title: "어종 관리", url: "/inventory/fish-form" },
      { title: "AI 질병분석", url: "/inventory/disease-analysis" },
    ],
  },
  {
    title: "매출 관리",
    icon: TrendingUp,
    items: [
      { title: "매출 통계", url: "/sales/chart" },
      { title: "경매 시세 예측", url: "/sales/prediction" },
    ],
  },
]
