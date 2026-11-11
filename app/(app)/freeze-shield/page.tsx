/**
 * Purpose: Freeze Shield — paste a PayPal limitation notice and build a verified pack.
 * Inputs: signed-in session; optional sample notice on disk; latest pack row.
 * Outputs: notice form + mapping/letter/approve/export UI.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PageHeader } from "@/components/brand/page-header";
import { FreezeNoticeForm } from "@/components/freeze/notice-form";
import { requireUserId } from "@/lib/auth/session";
import { latestPackForUser, toFormState } from "@/lib/freeze/service";

/**
 * Freeze Shield room. Export stays off until the verifier passes and the user approves.
 */
export default async function FreezeShieldPage() {
  const userId = await requireUserId();
  const latest = await latestPackForUser(userId);
  const sampleNotice = await loadSampleNotice();

  return (
    <div>
      <PageHeader
        kicker="Assurance"
        title="Freeze Shield"
        lede="Paste a PayPal limitation notice. CRAFT maps it to vault files you uploaded, checks every claim, and only then lets you approve and export a pack."
      />
      <FreezeNoticeForm
        sampleNotice={sampleNotice}
        initialPack={latest ? toFormState(latest) : null}
      />
    </div>
  );
}

/**
 * Optional sample notice for demos. Missing file is fine — the textarea stays empty.
 */
async function loadSampleNotice(): Promise<string | undefined> {
  try {
    return await readFile(
      join(process.cwd(), "data/eval/paypal-limitation-notice.txt"),
      "utf8",
    );
  } catch {
    return undefined;
  }
}
