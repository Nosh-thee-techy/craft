/**
 * Purpose: Money room UI — score, forecast band, plan, investing range, split approvals.
 * Inputs: a `MoneyView` from the service (or sample); ledger form actions.
 * Outputs: one composed Funds view. Educational investing copy only.
 */
"use client";

import { useActionState } from "react";
import {
  approveLedgerEntryAction,
  approvePaymentSplitsAction,
  rejectLedgerEntryAction,
  type LedgerFormState,
} from "@/lib/ledger/actions";
import type { MoneyView, PendingSplitGroup } from "@/lib/money/build-view";
import { Button } from "@/components/ui/button";

const initialLedgerState: LedgerFormState = { ok: true, message: "" };

type MoneyBoardProps = {
  view: MoneyView;
  /** True when the page is showing the hand-built sample instead of live rows. */
  isSample?: boolean;
};

/**
 * Render the deterministic Money view model.
 */
export function MoneyBoard({ view, isSample = false }: MoneyBoardProps) {
  const money = formatMoney(view.currency);

  return (
    <div className="space-y-8">
      {isSample ? (
        <p className="rounded-[20px] border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-muted-foreground">
          Showing educational sample data so the layout is visible before live payments land.
        </p>
      ) : null}

      {view.notes.length > 0 ? (
        <ul className="space-y-2 rounded-[20px] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {view.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <ScoreCard view={view} />
        <ForecastCard view={view} money={money} />
        <PlanCard view={view} money={money} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SimulationCard view={view} money={money} />
        <SplitsCard view={view} money={money} isSample={isSample} />
      </section>
    </div>
  );
}

function ScoreCard({ view }: { view: MoneyView }) {
  const { score } = view;
  return (
    <article className="glass rounded-[28px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Score</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">
        Income stability and trust score
      </h2>
      <p className="mt-4 font-display text-5xl tracking-tight">
        {score.total === null ? "—" : score.total}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {score.sufficientData
          ? `${score.band ?? "—"} · ${score.paymentsInWindow} payments in ${score.windowMonths} months`
          : `Need at least a few payments in the last ${score.windowMonths} months.`}
      </p>
      <ul className="mt-5 space-y-2">
        {score.components.map((c) => (
          <li key={c.key} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{c.label}</span>
            <span className="tabular-nums">
              {c.points}/{c.max}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ForecastCard({
  view,
  money,
}: {
  view: MoneyView;
  money: (n: number) => string;
}) {
  const { forecast } = view;
  return (
    <article className="glass rounded-[28px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Forecast</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">Cash-flow band</h2>
      {forecast.kind === "insufficient" ? (
        <p className="mt-4 text-sm text-muted-foreground">{forecast.reason}</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Typical month {money(forecast.baseline.low)} – {money(forecast.baseline.high)}
            <span className="mx-1 text-foreground/40">·</span>
            mid {money(forecast.baseline.mid)}
          </p>
          <ul className="mt-5 space-y-3">
            {forecast.months.map((m) => (
              <li key={m.month} className="rounded-2xl border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.month}</span>
                  {m.lean ? (
                    <span className="text-[11px] uppercase tracking-[0.16em] text-accent">
                      Lean
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {money(m.low)} – {money(m.high)}
                </p>
                {m.warnings[0] ? (
                  <p className="mt-1 text-xs text-accent">{m.warnings[0].message}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Pay window default: {view.payWindowDefault.earlyDays} /{" "}
            {view.payWindowDefault.expectedDays} / {view.payWindowDefault.lateDays} days (
            {view.payWindowDefault.source}).
          </p>
        </>
      )}
    </article>
  );
}

function PlanCard({
  view,
  money,
}: {
  view: MoneyView;
  money: (n: number) => string;
}) {
  const { plan } = view;
  return (
    <article className="glass rounded-[28px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Plan</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">This month</h2>
      {plan.kind === "insufficient" ? (
        <p className="mt-4 text-sm text-muted-foreground">{plan.reason}</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Safe to invest (educational):{" "}
            <span className="font-medium text-foreground">{money(plan.safeToInvest)}</span>
          </p>
          <ul className="mt-5 space-y-3">
            {plan.steps.map((step) => (
              <li key={step.key} className="rounded-2xl border border-border/60 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{step.label}</span>
                  <span className="tabular-nums text-sm">{money(step.amount)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{step.reason}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function SimulationCard({
  view,
  money,
}: {
  view: MoneyView;
  money: (n: number) => string;
}) {
  const { simulation } = view;
  return (
    <article className="glass rounded-[28px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Investing</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">Educational range</h2>
      {simulation.kind === "skipped" ? (
        <p className="mt-4 text-sm text-muted-foreground">{simulation.reason}</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">{simulation.disclaimer}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <SimStat label="Low end" value={money(simulation.totals.endLow)} />
            <SimStat label="Mid" value={money(simulation.totals.endMid)} />
            <SimStat label="High end" value={money(simulation.totals.endHigh)} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Contributed {money(simulation.totals.contributed)} over{" "}
            {simulation.months.length} months. Ranges only — not a promised return.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {simulation.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function SimStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function SplitsCard({
  view,
  money,
  isSample,
}: {
  view: MoneyView;
  money: (n: number) => string;
  isSample: boolean;
}) {
  return (
    <article className="glass rounded-[28px] p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-accent">Splits</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">Proposed allocations</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {view.approvedSplitCount} approved so far. Nothing moves until you accept a proposal.
      </p>
      {view.pendingSplits.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No open proposals. New payments propose splits automatically when rules are set.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {view.pendingSplits.map((group) => (
            <SplitGroup
              key={group.paymentId}
              group={group}
              money={money}
              interactive={!isSample && group.entries.length > 0}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function SplitGroup({
  group,
  money,
  interactive,
}: {
  group: PendingSplitGroup;
  money: (n: number) => string;
  interactive: boolean;
}) {
  const [approveAllState, approveAllAction, approveAllPending] = useActionState(
    approvePaymentSplitsAction,
    initialLedgerState,
  );

  const rows =
    group.entries.length > 0
      ? group.entries.map((e) => ({
          id: e.id,
          bucket: e.bucket,
          amount: e.amount,
          pctApplied: e.pctApplied,
        }))
      : (group.preview?.kind === "proposed" ? group.preview.entries : []).map((e, i) => ({
          id: `preview-${group.paymentId}-${i}`,
          bucket: e.bucket,
          amount: e.amount,
          pctApplied: e.pctApplied,
        }));

  return (
    <li className="rounded-2xl border border-border/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Payment {money(group.paymentAmount)}{" "}
            <span className="text-muted-foreground">({group.currency})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {group.paymentReceivedAt.toISOString().slice(0, 10)}
            {group.entries.length === 0 ? " · preview only" : ""}
          </p>
        </div>
        {interactive ? (
          <form action={approveAllAction}>
            <input type="hidden" name="paymentId" value={group.paymentId} />
            <Button type="submit" size="sm" disabled={approveAllPending}>
              {approveAllPending ? "Saving…" : "Approve all"}
            </Button>
          </form>
        ) : null}
      </div>
      {approveAllState.message && interactive ? (
        <p className="mt-2 text-xs text-muted-foreground">{approveAllState.message}</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <SplitRow
            key={row.id}
            entryId={row.id}
            bucket={row.bucket}
            amountLabel={money(row.amount)}
            pct={row.pctApplied}
            interactive={interactive}
          />
        ))}
      </ul>
    </li>
  );
}

function SplitRow({
  entryId,
  bucket,
  amountLabel,
  pct,
  interactive,
}: {
  entryId: string;
  bucket: string;
  amountLabel: string;
  pct: number | null;
  interactive: boolean;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveLedgerEntryAction,
    initialLedgerState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectLedgerEntryAction,
    initialLedgerState,
  );
  const message = approveState.message || rejectState.message;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/25 px-3 py-2 text-sm">
      <span className="capitalize">
        {bucket}
        {pct !== null ? (
          <span className="ml-2 text-xs text-muted-foreground">{pct}%</span>
        ) : null}
      </span>
      <span className="tabular-nums">{amountLabel}</span>
      {interactive ? (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <form action={approveAction}>
            <input type="hidden" name="entryId" value={entryId} />
            <Button type="submit" size="sm" variant="secondary" disabled={approvePending}>
              Approve
            </Button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="entryId" value={entryId} />
            <Button type="submit" size="sm" variant="outline" disabled={rejectPending}>
              Reject
            </Button>
          </form>
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
        </div>
      ) : null}
    </li>
  );
}

/** Format major units with a currency code (no FX). */
function formatMoney(currency: string): (n: number) => string {
  return (n: number) =>
    `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}
