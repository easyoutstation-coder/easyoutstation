import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]",
        secondary: "border-[#2A2A2A] bg-[#1C1C1C] text-[#BFBFBF]",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border-[#2A2A2A] text-[#BFBFBF]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
