/**
 * Purpose: Public client trust page shell. No login required.
 * Inputs: route param `slug`.
 * Outputs: placeholder until Phase 4. Never expose private files.
 */
import { Sparkles } from "lucide-react";
import { PublicChrome } from "@/components/brand/public-chrome";
import { PhasePlaceholder } from "@/components/phase-placeholder";

type TrustPageProps = {
  params: Promise<{ slug: string }>;
};

/** Public trust page placeholder. */
export default async function TrustPage({ params }: TrustPageProps) {
  const { slug } = await params;
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-5 py-12">
      <PublicChrome />
      <p className="text-xs uppercase tracking-[0.28em] text-primary">Public trust · {slug}</p>
      <PhasePlaceholder
        kicker="What clients get to see"
        title="Trust page"
        phase={4}
        icon={<Sparkles className="size-6" strokeWidth={1.6} />}
        description="Verified project count, delivery rate, client confirmations, selected portfolio, and a PayPal checkout — only what the creative marked visible."
      />
    </main>
  );
}
