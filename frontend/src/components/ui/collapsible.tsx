/**
 * 접을 수 있는 컴포넌트들
 * Radix UI의 Collapsible 컴포넌트를 기반으로 하며, 접을 수 있는 콘텐츠를 제공합니다
 * 접근성이 최적화되어 있습니다
 */
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

// 접을 수 있는 컨테이너 컴포넌트
const Collapsible = CollapsiblePrimitive.Root

// 접을 수 있는 트리거 컴포넌트 (클릭 시 열기/닫기)
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

// 접을 수 있는 콘텐츠 컴포넌트
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent } 