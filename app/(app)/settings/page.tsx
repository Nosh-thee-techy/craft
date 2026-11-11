/**
 * Purpose: Settings — trust-page visibility for Phase 4 (more arrives in Phase 5).
 * Inputs: signed-in user.
 * Outputs: visibility form for /t/[slug].
 */
import { requireUserId } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getTrustSettings } from "@/lib/trust/service";
import { PageHeader } from "@/components/brand/page-header";
import { TrustSettingsForm } from "@/components/trust/settings-form";

/**
 * House rules for what the public trust page may show.
 */
export default async function SettingsPage() {
  const userId = await requireUserId();
  const settings = await getTrustSettings(userId);

  return (
    <div>
      <PageHeader
        kicker="The house rules"
        title="Settings"
        lede="Choose what your public trust page shows. Private vault files never appear there."
      />
      <TrustSettingsForm
        publicSlug={settings.publicSlug}
        visibility={settings.visibility}
        projects={settings.projects}
        appUrl={env.APP_URL}
      />
    </div>
  );
}
