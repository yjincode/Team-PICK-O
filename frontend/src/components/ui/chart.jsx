import * as React from "react"
import { cn } from "../../lib/utils"

const ChartContainer = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("w-full", className)} {...props}>
    {children}
  </div>
))
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = ({ children, content, formatter, ...props }) => {
  return <>{children}</>
}

const ChartTooltipContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-background p-2 shadow-sm",
      className
    )}
    {...props}
  />
))
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent } 