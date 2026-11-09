/**
 * Purpose: Public client trust page shell. No login required.
 * Inputs: route param `slug`.
 * Outputs: placeholder until Phase 4. Never expose private files.
 */
import { PhasePlaceholder } from "@/components/phase-placeholder";

type TrustPageProps = {
  params: Promise<{ slug: string }>;
};

/** Public trust page placeholder. */
export default async function TrustPage({ params }: TrustPageProps) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-2xl p-8">
      <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
        Public trust page · {slug}
      </p>
      <PhasePlaceholder
        title="Trust page"
        phase={4}
        description="Verified project count, delivery rate, client confirmations, selected portfolio, and a PayPal checkout button will show only what the creative marked visible."
      />
    </main>
  );
}
