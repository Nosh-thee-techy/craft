/**
 * Purpose: Form label primitive wrapping Radix Label.
 * Inputs: standard label props plus className.
 * Outputs: a styled <label>.
 */
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

/**
 * Accessible label for form controls.
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
