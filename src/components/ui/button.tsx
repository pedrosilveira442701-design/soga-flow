import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 [&_svg]:size-4",
        primary: "rounded-full bg-gradient-to-r from-[#7C3AED] via-[#5B8DEF] to-[#2E90FA] text-white hover:shadow-[0_8px_20px_rgba(124,58,237,.4)] shadow-[0_4px_12px_rgba(124,58,237,.3)] focus-visible:ring-[#84CAFF] [&_svg]:size-[18px]",
        secondary: "rounded-full bg-gradient-to-r from-[#7C3AED] via-[#5B8DEF] to-[#2E90FA] text-white hover:shadow-[0_6px_16px_rgba(124,58,237,.35)] shadow-[0_3px_10px_rgba(124,58,237,.25)] focus-visible:ring-[#84CAFF] [&_svg]:size-[18px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg [&_svg]:size-4",
        outline: "border-2 border-border bg-card hover:bg-accent hover:border-primary/20 shadow-sm hover:shadow-md rounded-lg [&_svg]:size-4",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-lg [&_svg]:size-4",
        link: "text-primary underline-offset-4 hover:underline [&_svg]:size-4",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base min-w-[140px]",
        xl: "h-14 px-8 text-[17px] min-w-[160px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
