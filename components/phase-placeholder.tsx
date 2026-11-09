/**
 * Purpose: Shared "room warming up" screen for later-phase features.
 * Inputs: title, phase, description, optional kicker.
 * Outputs: a glass studio-room card, not an empty stub.
 */
import type { ReactNode } from "react";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";

type PhasePlaceholderProps = {
  title: string;
  phase: number;
  description: string;
  kicker?: string;
  icon?: ReactNode;
};

/**
 * Render a placeholder so the App Router tree matches CRAFT_BUILD_PLAN.md
 * without implementing feature logic yet.
 */
export function PhasePlaceholder({
  title,
  phase,
  description,
  kicker,
  icon,
}: PhasePlaceholderProps) {
  return (
    <div>
      <PageHeader
        kicker={kicker ?? `Phase ${phase}`}
        title={title}
        lede={description}
      />
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-start gap-6 py-10">
          {icon ? (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              {icon}
            </div>
          ) : null}
          <p className="max-w-lg font-serif text-3xl italic leading-snug text-foreground/90">
            This room is warming up. The lights are on — the tools arrive next.
          </p>
          <span className="rounded-full border border-teal/35 bg-teal/10 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-teal">
            Coming online
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
