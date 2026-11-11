/**
 * Purpose: Multi-step onboarding wizard for Phase 5.
 * Inputs: server snapshot; step actions.
 * Outputs: profile, PayPal, verified link ownership, draft, splits, visibility.
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STEPS = [
  "Profile",
  "PayPal",
  "Links",
  "Draft",
  "Money",
  "Visibility",
  "Done",
] as const;

const initial: OnboardingFormState = {};

type WizardProps = {
  snapshot: OnboardingSnapshot;
  appUrl: string;
};

/**
 * Skip-friendly steps. Verified link ownership is the honesty core of this flow.
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

  const activeLinkId = verifyState.linkedAccountId ?? linkState.linkedAccountId ?? snapshot.linkedAccounts[0]?.id;
  const challengeCode =
    linkState.challengeCode ??
    snapshot.linkedAccounts.find((row) => row.id === activeLinkId)?.challengeCode ??
    snapshot.linkedAccounts[0]?.challengeCode;
  const draft = approveState.draft ?? draftState.draft ?? snapshot.draft;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${
              index === step ? "bg-primary/20 text-primary" : "bg-background/40"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <StepCard
          kicker="Who you are"
          title="Name your studio"
          description="This stays editable. Nothing sensitive is inferred later."
        >
          <form action={profileAction} className="space-y-4">
            <Field label="Name" name="name" defaultValue={snapshot.name ?? ""} required />
            <Field label="Craft" name="craft" defaultValue={snapshot.craft ?? ""} required />
            <Field label="Country" name="country" defaultValue={snapshot.country || "KE"} />
            <Footer
              pending={profilePending}
              error={profileState.error}
              onSkip={() => setStep(1)}
              onNext={() => setStep(1)}
              showNext={profileState.ok}
            />
          </form>
        </StepCard>
      ) : null}

      {step === 1 ? (
        <StepCard
          kicker="PayPal sandbox"
          title="Connect sandbox keys"
          description="CRAFT is sandbox-only. Keys stay in env — we only mark that they are present."
        >
          <form action={paypalAction} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {snapshot.paypalConnected
                ? "Sandbox connection already marked on this studio."
                : "When PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set, press connect."}
            </p>
            <Footer
              pending={paypalPending}
              error={paypalState.error}
              submitLabel={snapshot.paypalConnected ? "Connected" : "Mark sandbox connected"}
              submitDisabled={snapshot.paypalConnected}
              onSkip={() => setStep(2)}
              onNext={() => setStep(2)}
              showNext={paypalState.ok || snapshot.paypalConnected}
            />
          </form>
        </StepCard>
      ) : null}

      {step === 2 ? (
        <StepCard
          kicker="Verified link ownership"
          title="Prove a public link is yours"
          description="Place the challenge code in a GitHub bio/README, YouTube description, or RSS/oEmbed feed. Or upload export text."
        >
          <form action={linkAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
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
            <Field label="Handle or feed URL" name="handle" placeholder="nairobi-maker" required />
            <Field label="Explicit URL (optional)" name="url" placeholder="https://…" />
            <Button type="submit" disabled={linkPending}>
              {linkPending ? "Saving…" : "Get challenge code"}
            </Button>
            {linkState.error ? <p className="text-sm text-destructive">{linkState.error}</p> : null}
          </form>

          {challengeCode ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">Challenge code</p>
              <p className="font-mono text-lg">{challengeCode}</p>
              <form action={verifyAction} className="space-y-3">
                <input type="hidden" name="linkedAccountId" value={activeLinkId ?? ""} />
                <div className="space-y-2">
                  <Label htmlFor="exportText">Export / screenshot text (for export fallback)</Label>
                  <Textarea id="exportText" name="exportText" className="min-h-24" />
                </div>
                <Button type="submit" disabled={verifyPending}>
                  {verifyPending ? "Checking…" : "Check verified link ownership"}
                </Button>
                {verifyState.error ? <p className="text-sm text-destructive">{verifyState.error}</p> : null}
                {verifyState.verified ? (
                  <p className="text-sm text-teal">Verified link ownership passed.</p>
                ) : null}
              </form>
            </div>
          ) : null}

          <ul className="mt-4 space-y-2 text-sm">
            {snapshot.linkedAccounts.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border px-4 py-3">
                {row.platform} · {row.handle} · {row.status}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              Skip for now
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              disabled={!(verifyState.verified || snapshot.linkedAccounts.some((row) => row.status === "verified"))}
            >
              Next
            </Button>
          </div>
        </StepCard>
      ) : null}

      {step === 3 ? (
        <StepCard
          kicker="AI profile draft"
          title="Draft from verified links"
          description="Edit freely. Nothing sensitive should be inferred. You must approve before it sticks."
        >
          <form action={draftAction} className="mb-4">
            <Button type="submit" variant="outline" disabled={draftPending}>
              {draftPending ? "Drafting…" : "Draft from verified link ownership"}
            </Button>
            {draftState.error ? <p className="mt-2 text-sm text-destructive">{draftState.error}</p> : null}
          </form>
          {draft ? (
            <form action={approveAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" name="summary" defaultValue={draft.summary} className="min-h-28" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Services (one per line)</Label>
                <Textarea id="services" name="services" defaultValue={draft.services.join("\n")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline (one per line)</Label>
                <Textarea id="timeline" name="timeline" defaultValue={draft.timeline.join("\n")} />
              </div>
              <Footer
                pending={approvePending}
                error={approveState.error}
                submitLabel="Approve draft"
                onSkip={() => setStep(4)}
                onNext={() => setStep(4)}
                showNext={approveState.ok || snapshot.draftApproved}
              />
            </form>
          ) : (
            <Footer pending={false} onSkip={() => setStep(4)} onNext={() => setStep(4)} showNext />
          )}
        </StepCard>
      ) : null}

      {step === 4 ? (
        <StepCard
          kicker="Money setup"
          title="Split rules"
          description="Percentages are saved in code. The AI never calculates them."
        >
          <form action={splitAction} className="space-y-4">
            <Field
              label="Tax %"
              name="taxPct"
              type="number"
              defaultValue={snapshot.splitRules?.taxPct ?? "30"}
              required
            />
            <Field
              label="Savings %"
              name="savingsPct"
              type="number"
              defaultValue={snapshot.splitRules?.savingsPct ?? "20"}
              required
            />
            <Field
              label="Expenses %"
              name="expensesPct"
              type="number"
              defaultValue={snapshot.splitRules?.expensesPct ?? "50"}
              required
            />
            <Footer
              pending={splitPending}
              error={splitState.error}
              onSkip={() => setStep(5)}
              onNext={() => setStep(5)}
              showNext={splitState.ok || Boolean(snapshot.splitRules)}
            />
          </form>
        </StepCard>
      ) : null}

      {step === 5 ? (
        <StepCard
          kicker="Visibility"
          title="What the trust page may show"
          description="Same controls as Settings. Hidden means hidden."
        >
          <form action={visAction} className="space-y-4">
            <Field
              label="Public slug seed"
              name="slugSeed"
              defaultValue={snapshot.publicSlug ?? ""}
              disabled={Boolean(snapshot.publicSlug)}
            />
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="showCounts" defaultChecked={snapshot.visibility.showCounts} />
              Show counts
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="showPortfolio"
                defaultChecked={snapshot.visibility.showPortfolio}
              />
              Show portfolio
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="showCheckout"
                defaultChecked={snapshot.visibility.showCheckout}
              />
              Show quote button
            </label>
            {visState.publicSlug || snapshot.publicSlug ? (
              <p className="text-xs text-muted-foreground">
                Public page: {appUrl}/t/{visState.publicSlug ?? snapshot.publicSlug}
              </p>
            ) : null}
            <Footer
              pending={visPending}
              error={visState.error}
              onSkip={() => setStep(6)}
              onNext={() => setStep(6)}
              showNext={visState.ok || Boolean(snapshot.publicSlug)}
            />
          </form>
        </StepCard>
      ) : null}

      {step === 6 ? (
        <StepCard
          kicker="Done"
          title="Studio is ready"
          description="You can reopen onboarding anytime from the rail."
        >
          <form action={doneAction} className="space-y-4">
            <Footer
              pending={donePending}
              error={doneState.error}
              submitLabel="Finish onboarding"
              onSkip={() => undefined}
              hideSkip
              onNext={() => undefined}
              showNext={false}
            />
            {doneState.ok || snapshot.completedAt ? (
              <Button asChild>
                <Link href="/dashboard">Open the studio</Link>
              </Button>
            ) : null}
          </form>
        </StepCard>
      ) : null}
    </div>
  );
}

function StepCard({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">{kicker}</p>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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

function Footer(props: {
  pending: boolean;
  error?: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  onSkip: () => void;
  onNext: () => void;
  showNext?: boolean;
  hideSkip?: boolean;
}) {
  return (
    <CardFooter className="flex flex-wrap gap-3 px-0 pt-4">
      {!props.hideSkip ? (
        <Button type="button" variant="outline" onClick={props.onSkip}>
          Skip
        </Button>
      ) : null}
      <Button type="submit" disabled={props.pending || props.submitDisabled}>
        {props.pending ? "Saving…" : props.submitLabel ?? "Save"}
      </Button>
      {props.showNext ? (
        <Button type="button" variant="ghost" onClick={props.onNext}>
          Next
        </Button>
      ) : null}
      {props.error ? <p className="w-full text-sm text-destructive">{props.error}</p> : null}
    </CardFooter>
  );
}
