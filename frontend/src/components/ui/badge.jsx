import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success: "border-transparent bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25",
        warning: "border-transparent bg-amber-500/15 text-amber-500 hover:bg-amber-500/25",
        danger: "border-transparent bg-rose-500/15 text-rose-500 hover:bg-rose-500/25",
        info: "border-transparent bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

function Badge({ className, variant, size, dot, children, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", {
          "bg-emerald-500": variant === "success",
          "bg-amber-500": variant === "warning",
          "bg-rose-500": variant === "danger",
          "bg-indigo-500": variant === "info",
          "bg-current": variant === "default",
        })} />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
export default Badge
