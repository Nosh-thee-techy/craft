/**
 * Purpose: Colourful status chip for project and invoice states.
 * Inputs: a status string from the database.
 * Outputs: a rounded glass pill.
 */
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  invoiced: "border-primary/40 bg-primary/15 text-primary",
  sent: "border-primary/40 bg-primary/15 text-primary",
  funded: "border-teal/40 bg-teal/15 text-teal",
  paid: "border-teal/40 bg-teal/15 text-teal",
  delivered: "border-accent/40 bg-accent/15 text-accent",
  closed: "border-border bg-muted/70 text-muted-foreground",
};

type StatusPillProps = {
  status: string;
  className?: string;
};

/**
 * Map a backend status onto the studio palette.
 */
export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize tracking-wide",
        TONES[status] ?? TONES.draft,
        className,
      )}
    >
      {status}
    </span>
  );
}
