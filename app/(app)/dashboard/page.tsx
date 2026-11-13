/**
 * Purpose: Calm studio home after login — one greeting, readiness, next step.
 * Inputs: Auth.js session + studio profile rows.
 * Outputs: short dashboard. No Layer essays on first paint.
 */
import { requireUserId } from "@/lib/auth/session";
import { getReadinessForUser } from "@/lib/readiness/service";
import { getStudioProfile } from "@/lib/studio/profile";
import { PageHeader } from "@/components/brand/page-header";
import { ReadinessCard } from "@/components/readiness/readiness-card";
import { ProfileBoard } from "@/components/studio/profile-board";

/**
 * Signed-in home. Prove the work, then bill — keep the first screen quiet.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();
  const profile = await getStudioProfile(userId);
  const readiness = await getReadinessForUser(userId);
  const firstName = profile.name?.split(" ")[0] ?? "creative";

  return (
    <div>
      <PageHeader title={`Hey ${firstName}.`} lede="One next step. Then bill." />
      <ReadinessCard
        result={readiness.result}
        nudges={readiness.nudges}
        plan={readiness.plan}
      />
      <ProfileBoard profile={profile} />
    </div>
  );
}
