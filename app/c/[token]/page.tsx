/**
 * Purpose: Public one-click receipt confirmation shell. No login required.
 * Inputs: route param `token`.
 * Outputs: placeholder until Phase 4.
 */
import { CheckCircle2 } from "lucide-react";
import { PublicChrome } from "@/components/brand/public-chrome";
import { PhasePlaceholder } from "@/components/phase-placeholder";

type ConfirmPageProps = {
  params: Promise<{ token: string }>;
};

/** Client confirm-receipt placeholder. */
export default async function ConfirmReceiptPage({ params }: ConfirmPageProps) {
  await params;
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-5 py-12">
      <PublicChrome />
      <PhasePlaceholder
        kicker="One click, on the record"
        title="Confirm receipt"
        phase={4}
        icon={<CheckCircle2 className="size-6" strokeWidth={1.6} />}
        description="A client will confirm delivery here with one click. The timestamp is stored as client_confirmed_at — never guessed."
      />
    </main>
  );
}
