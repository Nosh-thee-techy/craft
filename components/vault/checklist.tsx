/**
 * Purpose: Show which proof types a project already has.
 * Inputs: completeness from deterministic code.
 * Outputs: a score and six glass chips.
 */
import type { Completeness } from "@/lib/evidence/completeness";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  contract: "Contract",
  invoice: "Invoice",
  payment: "Payment",
  deliverable: "Deliverable",
  comms: "Comms",
  portfolio_link: "Portfolio",
};

type ChecklistProps = {
  completeness: Completeness;
};

/**
 * Completeness is computed in lib/evidence/completeness.ts, never by the LLM.
 */
export function EvidenceChecklist({ completeness }: ChecklistProps) {
  return (
    <div className="glass rounded-[28px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-primary">Completeness</p>
      <p className="mt-2 font-serif text-5xl italic">{completeness.score}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {completeness.present.length} of {completeness.total} proof types on the record.
      </p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {completeness.present.map((type) => (
          <li
            key={type}
            className="rounded-full border border-teal/35 bg-teal/10 px-3 py-1 text-xs text-teal"
          >
            {LABELS[type] ?? type}
          </li>
        ))}
        {completeness.missing.map((type) => (
          <li
            key={type}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground",
            )}
          >
            {LABELS[type] ?? type}
          </li>
        ))}
      </ul>
    </div>
  );
}
