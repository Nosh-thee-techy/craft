/**
 * Purpose: Short onboarding — studio, verified link ownership, money + trust page.
 * Inputs: Auth.js session.
 * Outputs: the Phase 5 three-beat wizard.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getOnboardingSnapshot } from "@/lib/onboarding/service";
import { PublicChrome } from "@/components/brand/public-chrome";
import { OnboardingWizard } from "@/components/onboarding/wizard";

/**
 * First light. Three beats, all skippable; verified link ownership is the honesty core.
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
      <div className="rise">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">First light</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Get the studio live
        </h1>
        <p className="rise-2 mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
          Three beats. Skip anything. We prove{" "}
          <span className="text-foreground">verified link ownership</span> — never identity.
        </p>
      </div>
      <OnboardingWizard snapshot={snapshot} appUrl={env.APP_URL} />
    </main>
  );
}
