/**
 * Purpose: Layer 1 studio home — stable profile, work proofs, scan-to-verify, then bill.
 * Inputs: Auth.js session + studio profile rows.
 * Outputs: profile-first dashboard with Account Readiness checklist.
 */
import { requireUserId } from "@/lib/auth/session";
import { getReadinessForUser } from "@/lib/readiness/service";
import { getStudioProfile } from "@/lib/studio/profile";
import { PageHeader } from "@/components/brand/page-header";
import { ReadinessCard } from "@/components/readiness/readiness-card";
import { ProfileBoard } from "@/components/studio/profile-board";

/**
 * Signed-in home. Profile and provenance first; billing comes after verify is ready.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();
  const profile = await getStudioProfile(userId);
  const readiness = await getReadinessForUser(userId);
  const firstName = profile.name?.split(" ")[0] ?? "creative";

  return (
    <div>
      <PageHeader
        kicker="Studio"
        title={`Hey ${firstName}.`}
        lede="Layer 1: stabilize your profile and Work Proof Tokens, let clients scan to verify, then bill and deliver."
      />
      <ReadinessCard
        result={readiness.result}
        nudges={readiness.nudges}
        plan={readiness.plan}
      />
      <ProfileBoard profile={profile} />
    </div>
  );
}
