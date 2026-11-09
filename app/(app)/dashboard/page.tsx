/**
 * Purpose: Signed-in home. Feature widgets arrive in later phases.
 * Inputs: Auth.js session (via layout).
 * Outputs: a welcome placeholder.
 */
import { auth } from "@/auth";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/**
 * Dashboard shell. PayPal, vault, and money widgets are not built yet.
 */
export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session?.user.email}. Features land from Phase 1 onward.
        </p>
      </div>
      <PhasePlaceholder
        title="Workspace"
        phase={1}
        description="Projects, PayPal invoices, the evidence vault, Freeze Shield, and money tools will appear here after each phase ships."
      />
    </div>
  );
}
