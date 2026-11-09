/**
 * Purpose: Shared page title block so every studio room speaks the same language.
 * Inputs: kicker, title, lede, optional action.
 * Outputs: a rise-animated header.
 */
import type { ReactNode } from "react";

type PageHeaderProps = {
  kicker?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
};

/**
 * Feature-page heading used across dashboard, projects, vault, and the rest.
 */
export function PageHeader({ kicker, title, lede, action }: PageHeaderProps) {
  return (
    <div className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-primary">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display text-4xl leading-none tracking-tight md:text-5xl">{title}</h1>
        {lede ? <p className="mt-3 max-w-xl text-base text-muted-foreground">{lede}</p> : null}
      </div>
      {action}
    </div>
  );
}
