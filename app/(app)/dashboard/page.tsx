/**
 * Purpose: Layer 1 studio home — stable profile, work proofs, scan-to-verify, then bill.
 * Inputs: Auth.js session + studio profile rows.
 * Outputs: profile-first dashboard (doors are secondary).
 */
import { requireUserId } from "@/lib/auth/session";
import { getStudioProfile } from "@/lib/studio/profile";
import { PageHeader } from "@/components/brand/page-header";
import { ProfileBoard } from "@/components/studio/profile-board";

/**
 * Signed-in home. Profile and provenance first; billing comes after verify is ready.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();
  const profile = await getStudioProfile(userId);
  const firstName = profile.name?.split(" ")[0] ?? "creative";

  return (
    <div>
      <PageHeader
        kicker="Studio"
        title={`Hey ${firstName}.`}
        lede="Layer 1: stabilize your profile and Work Proof Tokens, let clients scan to verify, then bill and deliver."
      />
      <ProfileBoard profile={profile} />
    </div>
  );
}
