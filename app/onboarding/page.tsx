/**
 * Purpose: Onboarding shell. Protected by Proxy + this page's auth check.
 * Inputs: Auth.js session.
 * Outputs: placeholder until Phase 5.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Onboarding placeholder. */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <PhasePlaceholder
        title="Onboarding"
        phase={5}
        description="Multi-step setup: profile, PayPal sandbox, verified link ownership, AI profile draft, money setup, visibility."
      />
    </main>
  );
}
