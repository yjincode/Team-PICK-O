import * as React from "react"
import { cn } from "../../lib/utils"

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: any
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      {children}
    </div>
  )
)
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipProps {
  children?: React.ReactNode
  content?: React.ReactNode
  formatter?: (value: any) => any
}

const ChartTooltip = ({ children }: ChartTooltipProps) => {
  return <>{children}</>
}

interface ChartTooltipContentProps {
  className?: string
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background p-2 shadow-sm",
        className
      )}
      {...props}
    />
  )
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent } 