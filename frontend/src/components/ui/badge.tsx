import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-surface-elevated",
        secondary: "border-transparent bg-accent-soft text-accent",
        outline: "border-rule bg-surface-elevated text-ink-muted",
        signal: "border-transparent bg-signal-soft text-signal",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
