/**
 * 텍스트 영역 컴포넌트
 * 여러 줄의 텍스트 입력을 위한 컴포넌트입니다
 * 접근성과 포커스 스타일이 최적화되어 있습니다
 */
import * as React from "react"
import { cn } from "../../lib/utils"

// 텍스트 영역 Props 타입 정의
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea } 