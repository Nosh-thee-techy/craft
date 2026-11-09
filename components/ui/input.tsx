/**
 * Purpose: Glass input primitive for auth and project forms.
 * Inputs: standard input props plus className.
 * Outputs: a styled <input>.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text/email/password field used on auth and later project forms.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-2xl border border-border bg-[var(--field)] px-4 py-2 text-sm text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
