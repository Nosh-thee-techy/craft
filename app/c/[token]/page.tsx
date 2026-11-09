/**
 * Purpose: Public one-click receipt confirmation shell. No login required.
 * Inputs: route param `token`.
 * Outputs: placeholder until Phase 4.
 */
import { PhasePlaceholder } from "@/components/phase-placeholder";

type ConfirmPageProps = {
  params: Promise<{ token: string }>;
};

/** Client confirm-receipt placeholder. */
export default async function ConfirmReceiptPage({ params }: ConfirmPageProps) {
  await params;
  return (
    <main className="mx-auto max-w-2xl p-8">
      <PhasePlaceholder
        title="Confirm receipt"
        phase={4}
        description="A client will confirm delivery here with one click. The timestamp is stored as client_confirmed_at."
      />
    </main>
  );
}
