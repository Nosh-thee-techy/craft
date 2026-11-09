/**
 * Purpose: Onboarding shell. Protected by Proxy + this page's auth check.
 * Inputs: Auth.js session.
 * Outputs: placeholder until Phase 5.
 */
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { auth } from "@/auth";
import { PublicChrome } from "@/components/brand/public-chrome";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Onboarding placeholder. */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-5 py-12">
      <PublicChrome href="/dashboard" />
      <PhasePlaceholder
        kicker="First light"
        title="Onboarding"
        phase={5}
        icon={<Compass className="size-6" strokeWidth={1.6} />}
        description="Multi-step setup: profile, PayPal sandbox, verified link ownership, an AI profile draft, money setup, and what the world can see."
      />
    </main>
  );
}
