/**
 * Purpose: Glass textarea for project scope.
 * Inputs: standard textarea props plus className.
 * Outputs: a styled <textarea>.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Multi-line text field.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-border bg-[var(--field)] px-4 py-3 text-sm text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
