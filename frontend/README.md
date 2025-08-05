# Frontend - 수산업 관리 시스템

React + TypeScript + Tailwind CSS 기반의 수산업 관리 시스템 프론트엔드입니다.

## 📁 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── ui/            # 기본 UI 컴포넌트 (Button, Input, Card 등)
│   ├── common/        # 공통 컴포넌트 (StatsCard, WeatherWidget 등)
│   ├── layout/        # 레이아웃 컴포넌트 (Sidebar, MainLayout 등)
│   └── charts/        # 차트 컴포넌트
├── pages/             # 페이지 컴포넌트
│   ├── dashboard/     # 대시보드 페이지
│   ├── customers/     # 거래처 관리 페이지
│   ├── orders/        # 주문 관리 페이지
│   ├── inventory/     # 재고 관리 페이지
│   ├── sales/         # 매출 관리 페이지
│   └── login/         # 로그인 페이지
├── hooks/             # 커스텀 훅
│   ├── useCustomers.ts # 거래처 관리 훅
│   ├── useInventory.ts # 재고 관리 훅
│   └── useOrders.ts   # 주문 관리 훅
├── lib/               # 유틸리티 라이브러리
│   ├── api.ts         # API 통신 라이브러리
│   └── utils.ts       # 공통 유틸리티 함수
├── types/             # TypeScript 타입 정의
│   └── index.ts       # 주요 타입 정의
└── assets/            # 정적 자산 (이미지, 아이콘 등)
```

## 🎨 디자인 시스템

### 색상 팔레트

- **Primary**: 메인 브랜드 색상 (파란색 계열)
- **Secondary**: 보조 액션 색상 (회색 계열)
- **Destructive**: 위험/삭제 액션 색상 (빨간색 계열)
- **Muted**: 비활성 상태 색상

### 반응형 디자인

- **Mobile First**: 모바일 우선 설계
- **Breakpoints**: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- **Touch Friendly**: 터치 디바이스 최적화

## 🔧 개발 가이드

### 컴포넌트 작성 규칙

1. **파일명**: PascalCase 사용 (예: `CustomerList.tsx`)
2. **컴포넌트명**: 파일명과 동일하게 PascalCase 사용
3. **Props 타입**: TypeScript 인터페이스로 정의
4. **주석**: JSDoc 형식으로 상세한 설명 추가

### 코드 스타일

- **들여쓰기**: 2칸 공백
- **세미콜론**: 필수
- **따옴표**: 작은따옴표 우선
- **타입**: 명시적 타입 지정

### 커스텀 훅 작성

```typescript
/**
 * 훅 설명
 * @returns {Object} 반환값 설명
 */
const useCustomHook = () => {
  // 상태 정의
  const [state, setState] = useState()
  
  // 함수 정의
  const handleAction = () => {
    // 로직
  }
  
  return {
    state,
    handleAction
  }
}
```

## 📊 데이터 구조

### 주요 타입 정의

```typescript
// 거래처 정보
interface Business {
  id: number
  business_name: string
  phone_number: string
  address?: string
}

// 어종 정보
interface FishType {
  id: number
  fish_name: string
  aliases?: string[]  // 동의어 배열
  embedding?: number[] // 벡터 검색용
}

// 재고 정보
interface Inventory {
  id: number
  fish_type_id: number
  stock_quantity: number
  unit?: string
  status?: string
  aquarium_photo_path?: string
  fish_type?: FishType  // 조인된 데이터
}

// 주문 정보
interface Order {
  id: number
  business_id: number
  total_price: number
  order_datetime: string
  memo?: string
  source_type: 'voice' | 'text'
  raw_input_path?: string
  transcribed_text?: string
  delivery_date?: string
  status: 'success' | 'failed' | 'pending'
  business?: Business  // 조인된 데이터
  items?: OrderItem[]
}

// 주문 아이템
interface OrderItem {
  id: number
  order_id: number
  fish_type_id: number
  quantity: number
  unit_price?: number
  unit?: string
  fish_type?: FishType  // 조인된 데이터
}

// 결제 정보
interface Payment {
  id: number
  order_id: number
  business_id: number
  amount: number
  method: 'bank_transfer' | 'card' | 'cash'
  status: 'paid' | 'pending' | 'failed'
  paid_at?: string
  created_at: string
}

// SMS 추천
interface SmsRecommendation {
  id: number
  business_id: number
  recommended_text: string
  fish_type: string
  price_trend: '상승' | '하락' | '유지'
  created_at: string
  is_sent: boolean
  sent_at?: string
}

// 시세 데이터
interface PriceData {
  id: number
  fish_type: string
  market_name: string
  date: string
  min_price: number
  max_price: number
  avg_price: number
}
```

## 🚧 개발 상태

### 완료된 기능

- [x] 프로젝트 구조 설정
- [x] 라우팅 시스템 구축
- [x] 기본 컴포넌트 구조
- [x] 커스텀 훅 구현
- [x] 타입 정의
- [x] 스타일링 시스템

### 진행 중인 기능

- [ ] API 연동
- [ ] 실제 데이터 처리
- [ ] 차트 컴포넌트 구현
- [ ] 폼 검증

### 예정된 기능

- [ ] 다크 모드 지원
- [ ] 다국어 지원
- [ ] PWA 지원
- [ ] 테스트 코드 작성

## 🤝 기여 가이드

### 이슈 리포트

버그 발견 시 다음 정보를 포함하여 이슈를 등록해주세요:

1. **환경 정보**: OS, 브라우저, Node.js 버전
2. **재현 방법**: 단계별 재현 방법
3. **예상 동작**: 정상적인 동작 설명

### 풀 리퀘스트

새로운 기능 추가 시:

1. **브랜치 생성**: `feature/기능명`
2. **커밋 메시지**: 명확하고 간결하게 작성
3. **테스트**: 기능 테스트 완료 후 PR 생성

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

프로젝트 관련 문의사항이 있으시면 이슈를 통해 연락해주세요.
