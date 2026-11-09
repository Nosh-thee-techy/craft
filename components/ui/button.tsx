/**
 * Purpose: shadcn/ui Button primitive, restyled as studio gold glass.
 * Inputs: variant, size, className, standard button props.
 * Outputs: a styled <button> or Slot.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "shine bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(240,195,122,0.28)] hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-background/40 text-foreground backdrop-blur-xl hover:border-primary/50 hover:bg-card",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-foreground/8",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Render a button using the CRAFT design tokens.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
