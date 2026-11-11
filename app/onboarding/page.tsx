/**
 * Purpose: Multi-step onboarding — profile, PayPal, verified link ownership, draft, money, visibility.
 * Inputs: Auth.js session.
 * Outputs: the Phase 5 wizard.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getOnboardingSnapshot } from "@/lib/onboarding/service";
import { PublicChrome } from "@/components/brand/public-chrome";
import { OnboardingWizard } from "@/components/onboarding/wizard";

/**
 * First-light setup. Steps are skippable; verified link ownership is the honesty core.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const snapshot = await getOnboardingSnapshot(session.user.id);

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-5 py-12">
      <PublicChrome href="/dashboard" />
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-primary">First light</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">Onboarding</h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Set up your studio. We say verified link ownership — never verified identity.
        </p>
      </div>
      <OnboardingWizard snapshot={snapshot} appUrl={env.APP_URL} />
    </main>
  );
}
