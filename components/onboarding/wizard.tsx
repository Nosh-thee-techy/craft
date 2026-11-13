/**
 * Purpose: Short, punchy onboarding for Kenyan creatives (Phase 5).
 * Inputs: server snapshot; step actions.
 * Outputs: profile, verified link ownership, draft, PayPal, splits, visibility.
 */
"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  addLinkAction,
  approveDraftAction,
  completeOnboardingAction,
  connectPayPalAction,
  draftProfileAction,
  saveProfileAction,
  saveSplitsAction,
  saveVisibilityAction,
  verifyLinkAction,
} from "@/lib/onboarding/actions";
import type { OnboardingFormState, OnboardingSnapshot } from "@/lib/onboarding/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Three beats instead of seven screens — same data, less ceremony. */
const STEPS = ["You", "Prove", "Run"] as const;

const initial: OnboardingFormState = {};

type WizardProps = {
  snapshot: OnboardingSnapshot;
  appUrl: string;
};

/**
 * Skip-friendly three-step flow. Verified link ownership is the honesty core.
 */
export function OnboardingWizard({ snapshot, appUrl }: WizardProps) {
  const [step, setStep] = useState(0);
  const [profileState, profileAction, profilePending] = useActionState(saveProfileAction, initial);
  const [paypalState, paypalAction, paypalPending] = useActionState(connectPayPalAction, initial);
  const [linkState, linkAction, linkPending] = useActionState(addLinkAction, initial);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyLinkAction, initial);
  const [draftState, draftAction, draftPending] = useActionState(draftProfileAction, initial);
  const [approveState, approveAction, approvePending] = useActionState(approveDraftAction, initial);
  const [splitState, splitAction, splitPending] = useActionState(saveSplitsAction, initial);
  const [visState, visAction, visPending] = useActionState(saveVisibilityAction, initial);
  const [doneState, doneAction, donePending] = useActionState(completeOnboardingAction, initial);

  const activeLinkId =
    verifyState.linkedAccountId ?? linkState.linkedAccountId ?? snapshot.linkedAccounts[0]?.id;
  const challengeCode =
    linkState.challengeCode ??
    snapshot.linkedAccounts.find((row) => row.id === activeLinkId)?.challengeCode ??
    snapshot.linkedAccounts[0]?.challengeCode;
  const draft = approveState.draft ?? draftState.draft ?? snapshot.draft;
  const linkVerified =
    verifyState.verified || snapshot.linkedAccounts.some((row) => row.status === "verified");
  const finished = doneState.ok || Boolean(snapshot.completedAt);

  return (
    <div className="space-y-8">
      <Progress step={step} />

      <div key={step} className="rise space-y-6">
        {step === 0 ? (
          <StepShell
            kicker="Beat 1 · You"
            title="Name the studio"
            blurb="What clients shout across town. Editable later."
          >
            <form action={profileAction} className="space-y-4">
              <Field
                label="Studio name"
                name="name"
                defaultValue={snapshot.name ?? ""}
                placeholder="Amina Studio"
                required
              />
              <Field
                label="Craft"
                name="craft"
                defaultValue={snapshot.craft ?? ""}
                placeholder="Illustration · video · code…"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country" name="country" defaultValue={snapshot.country || "KE"} />
                <Field
                  label="Legal name (optional)"
                  name="legalName"
                  defaultValue={snapshot.legalName ?? ""}
                  placeholder="As on ID"
                />
              </div>

              <details className="group rounded-2xl border border-border/70 bg-background/25 open:bg-background/40">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted-foreground transition-colors group-open:text-foreground [&::-webkit-details-marker]:hidden">
                  Address for invoices{" "}
                  <span className="text-xs text-muted-foreground">(landmark OK · skip fine)</span>
                </summary>
                <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
                  <Field
                    label="Estate"
                    name="addressEstate"
                    defaultValue={snapshot.addressEstate ?? ""}
                  />
                  <Field label="Road" name="addressRoad" defaultValue={snapshot.addressRoad ?? ""} />
                  <Field
                    label="Building"
                    name="addressBuilding"
                    defaultValue={snapshot.addressBuilding ?? ""}
                  />
                  <Field
                    label="Landmark"
                    name="addressLandmark"
                    defaultValue={snapshot.addressLandmark ?? ""}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Town"
                      name="addressTown"
                      defaultValue={snapshot.addressTown ?? ""}
                    />
                    <Field
                      label="County"
                      name="addressCounty"
                      defaultValue={snapshot.addressCounty ?? ""}
                    />
                  </div>
                  <Field
                    label="Plus code"
                    name="plusCode"
                    defaultValue={snapshot.plusCode ?? ""}
                    placeholder="Optional"
                  />
                  <p className="text-xs text-muted-foreground">
                    Proofs later under Vault → Identity and funds. Match checks are code, not AI.
                  </p>
                </div>
              </details>

              <NavRow
                pending={profilePending}
                error={profileState.error}
                submitLabel="Lock it in"
                onSkip={() => setStep(1)}
                onNext={() => setStep(1)}
                showNext={profileState.ok || Boolean(snapshot.name)}
              />
            </form>
          </StepShell>
        ) : null}

        {step === 1 ? (
          <StepShell
            kicker="Beat 2 · Prove"
            title="Own a public link"
            blurb="Verified link ownership — never identity. Drop the code on GitHub, YouTube, or a feed."
          >
            <form action={linkAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Where</Label>
                <select
                  id="platform"
                  name="platform"
                  className="flex h-12 w-full rounded-2xl border border-border bg-[var(--field)] px-4 text-sm"
                  defaultValue="github"
                >
                  <option value="github">GitHub</option>
                  <option value="youtube">YouTube</option>
                  <option value="rss">RSS / oEmbed</option>
                  <option value="export">Upload export fallback</option>
                </select>
              </div>
              <Field
                label="Handle or feed URL"
                name="handle"
                placeholder="nairobi-maker"
                required
              />
              <Field label="Full URL (optional)" name="url" placeholder="https://…" />
              <Button type="submit" disabled={linkPending}>
                {linkPending ? "Minting…" : "Get challenge code"}
              </Button>
              {linkState.error ? (
                <p className="text-sm text-destructive">{linkState.error}</p>
              ) : null}
            </form>

            {challengeCode ? (
              <div className="space-y-4 rounded-2xl border border-primary/35 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Paste this</p>
                <p className="break-all font-mono text-lg tracking-tight">{challengeCode}</p>
                <form action={verifyAction} className="space-y-3">
                  <input type="hidden" name="linkedAccountId" value={activeLinkId ?? ""} />
                  <div className="space-y-2">
                    <Label htmlFor="exportText">Export text (fallback only)</Label>
                    <Textarea id="exportText" name="exportText" className="min-h-20" />
                  </div>
                  <Button type="submit" disabled={verifyPending}>
                    {verifyPending ? "Checking…" : "Check ownership"}
                  </Button>
                  {verifyState.error ? (
                    <p className="text-sm text-destructive">{verifyState.error}</p>
                  ) : null}
                  {verifyState.verified ? (
                    <p className="text-sm text-teal">Verified link ownership — locked.</p>
                  ) : null}
                </form>
              </div>
            ) : null}

            {snapshot.linkedAccounts.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {snapshot.linkedAccounts.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-border/80 px-4 py-2.5 text-muted-foreground"
                  >
                    <span className="text-foreground">{row.platform}</span> · {row.handle} ·{" "}
                    {row.status}
                  </li>
                ))}
              </ul>
            ) : null}

            {linkVerified ? (
              <div className="space-y-4 rounded-2xl border border-border/70 bg-background/30 p-4">
                <p className="text-sm font-medium">Draft the bio from that link</p>
                <form action={draftAction}>
                  <Button type="submit" variant="outline" disabled={draftPending}>
                    {draftPending ? "Drafting…" : "Draft from verified links"}
                  </Button>
                  {draftState.error ? (
                    <p className="mt-2 text-sm text-destructive">{draftState.error}</p>
                  ) : null}
                </form>
                {draft ? (
                  <form action={approveAction} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="summary">Summary</Label>
                      <Textarea
                        id="summary"
                        name="summary"
                        defaultValue={draft.summary}
                        className="min-h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="services">Services (one per line)</Label>
                      <Textarea
                        id="services"
                        name="services"
                        defaultValue={draft.services.join("\n")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline">Timeline (one per line)</Label>
                      <Textarea
                        id="timeline"
                        name="timeline"
                        defaultValue={draft.timeline.join("\n")}
                      />
                    </div>
                    <Button type="submit" disabled={approvePending}>
                      {approvePending ? "Saving…" : "Approve draft"}
                    </Button>
                    {approveState.error ? (
                      <p className="text-sm text-destructive">{approveState.error}</p>
                    ) : null}
                  </form>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Skip for now
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!(linkVerified || approveState.ok || snapshot.draftApproved)}
              >
                Next · money
              </Button>
            </div>
          </StepShell>
        ) : null}

        {step === 2 ? (
          <StepShell
            kicker="Beat 3 · Run"
            title="Money + trust page"
            blurb="Splits in code (AI never maths them). Sandbox PayPal only."
          >
            <form action={paypalAction} className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {snapshot.paypalConnected || paypalState.ok
                  ? "Sandbox marked connected."
                  : "Env keys ready? Mark sandbox."}
              </p>
              <Button
                type="submit"
                variant="outline"
                disabled={paypalPending || snapshot.paypalConnected || paypalState.ok}
              >
                {paypalPending
                  ? "…"
                  : snapshot.paypalConnected || paypalState.ok
                    ? "Connected"
                    : "Connect sandbox"}
              </Button>
              {paypalState.error ? (
                <p className="w-full text-sm text-destructive">{paypalState.error}</p>
              ) : null}
            </form>

            <form action={splitAction} className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Split rules · must hit 100%
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Tax %"
                  name="taxPct"
                  type="number"
                  defaultValue={snapshot.splitRules?.taxPct ?? "30"}
                  required
                />
                <Field
                  label="Save %"
                  name="savingsPct"
                  type="number"
                  defaultValue={snapshot.splitRules?.savingsPct ?? "20"}
                  required
                />
                <Field
                  label="Spend %"
                  name="expensesPct"
                  type="number"
                  defaultValue={snapshot.splitRules?.expensesPct ?? "50"}
                  required
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="outline" disabled={splitPending}>
                  {splitPending ? "Saving…" : "Save splits"}
                </Button>
                {splitState.ok || snapshot.splitRules ? (
                  <span className="text-xs text-teal">Splits locked</span>
                ) : null}
                {splitState.error ? (
                  <p className="w-full text-sm text-destructive">{splitState.error}</p>
                ) : null}
              </div>
            </form>

            <form action={visAction} className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Trust page
              </p>
              <Field
                label="Public slug"
                name="slugSeed"
                defaultValue={snapshot.publicSlug ?? ""}
                placeholder="amina-studio"
                disabled={Boolean(snapshot.publicSlug)}
              />
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showCounts"
                    defaultChecked={snapshot.visibility.showCounts}
                  />
                  Counts
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showPortfolio"
                    defaultChecked={snapshot.visibility.showPortfolio}
                  />
                  Portfolio
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showCheckout"
                    defaultChecked={snapshot.visibility.showCheckout}
                  />
                  Quote button
                </label>
              </div>
              {visState.publicSlug || snapshot.publicSlug ? (
                <p className="text-xs text-muted-foreground">
                  Live at {appUrl}/t/{visState.publicSlug ?? snapshot.publicSlug}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="outline" disabled={visPending}>
                  {visPending ? "Saving…" : "Save visibility"}
                </Button>
                {visState.error ? (
                  <p className="w-full text-sm text-destructive">{visState.error}</p>
                ) : null}
              </div>
            </form>

            <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              {!finished ? (
                <form action={doneAction}>
                  <Button type="submit" disabled={donePending}>
                    {donePending ? "Opening…" : "Open the studio"}
                  </Button>
                </form>
              ) : (
                <Button asChild>
                  <Link href="/dashboard">Open the studio</Link>
                </Button>
              )}
              {doneState.error ? (
                <p className="w-full text-sm text-destructive">{doneState.error}</p>
              ) : null}
            </div>
          </StepShell>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact three-beat progress — highlights the active beat only.
 */
function Progress({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, index) => {
        const active = index === step;
        const done = index < step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors duration-300 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/25 text-primary"
                    : "bg-background/50 text-muted-foreground"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`truncate text-xs uppercase tracking-[0.16em] ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className={`mx-1 hidden h-px flex-1 sm:block ${
                  done ? "bg-primary/40" : "bg-border"
                }`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Step frame without heavy card chrome — glass plane + short copy.
 */
function StepShell({
  kicker,
  title,
  blurb,
  children,
}: {
  kicker: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section className="glass space-y-5 rounded-[28px] p-5 md:p-7">
      <header className="space-y-1.5">
        <p className="text-xs uppercase tracking-[0.22em] text-primary">{kicker}</p>
        <h2 className="font-display text-3xl tracking-tight md:text-4xl">{title}</h2>
        <p className="max-w-xl text-sm text-muted-foreground">{blurb}</p>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/**
 * Labeled input for onboarding forms.
 */
function Field(props: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.name}>{props.label}</Label>
      <Input
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
      />
    </div>
  );
}

/**
 * Skip / save / next controls shared by early beats.
 */
function NavRow(props: {
  pending: boolean;
  error?: string;
  submitLabel?: string;
  onSkip: () => void;
  onNext: () => void;
  showNext?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <Button type="button" variant="outline" onClick={props.onSkip}>
        Skip
      </Button>
      <Button type="submit" disabled={props.pending}>
        {props.pending ? "Saving…" : props.submitLabel ?? "Save"}
      </Button>
      {props.showNext ? (
        <Button type="button" variant="ghost" onClick={props.onNext}>
          Next
        </Button>
      ) : null}
      {props.error ? <p className="w-full text-sm text-destructive">{props.error}</p> : null}
    </div>
  );
}
