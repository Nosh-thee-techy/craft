/**
 * Purpose: Copilot room — vault-grounded Q&A with citations (Phase 2 F6).
 * Inputs: signed-in session.
 * Outputs: chat UI. Never invents evidence or calculates money.
 */
import { PageHeader } from "@/components/brand/page-header";
import { CopilotChat } from "@/components/copilot/chat";
import { requireUserId } from "@/lib/auth/session";

/**
 * Real Copilot page (placeholder removed).
 */
export default async function CopilotPage() {
  await requireUserId();

  return (
    <div>
      <PageHeader
        kicker="A second pair of eyes"
        title="Copilot"
        lede="Ask why something was flagged or what to upload next. Answers cite your vault and readiness rules only."
      />
      <CopilotChat />
    </div>
  );
}
