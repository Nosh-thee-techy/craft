/**
 * Purpose: Money room — income stability score, cash-flow band, plan, splits, investing range.
 * Inputs: signed-in session; live rows via `getMoneyViewForUser` (sample fallback if thin).
 * Outputs: Funds UI driven by the deterministic MoneyView model.
 */
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { MoneyBoard } from "@/components/money/money-board";
import { requireUserId } from "@/lib/auth/session";
import { getMoneyViewForUser } from "@/lib/money/service";
import { sampleMoneyView } from "@/lib/money/sample";

/**
 * Live Money page. Falls back to sample data when the account has no payments yet,
 * so the layout stays reviewable before the first PayPal capture lands.
 */
export default async function MoneyPage() {
  const userId = await requireUserId();
  const live = await getMoneyViewForUser(userId);
  const useSample = live.score.paymentsInWindow === 0 && live.pendingSplits.length === 0;
  const view = useSample ? sampleMoneyView() : live;

  return (
    <div>
      <PageHeader
        kicker="Funds"
        title="Money"
        lede="Income stability and trust score, a cash-flow band, split proposals, and an educational investing range — numbers from code, never invented."
        action={<Wallet className="size-6 text-primary" strokeWidth={1.6} aria-hidden />}
      />
      <MoneyBoard view={view} isSample={useSample} />
    </div>
  );
}
