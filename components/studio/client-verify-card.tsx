/**
 * Purpose: Pre-bill client verify card — scan/link before PayPal invoice.
 * Inputs: trust URL, QR data URL, verified link + published proof counts.
 * Outputs: shareable verify panel on the project detail page.
 */
import Link from "next/link";
import { VerifyQr } from "@/components/studio/verify-qr";
import { Button } from "@/components/ui/button";

type ClientVerifyCardProps = {
  trustUrl: string | null;
  qrDataUrl: string | null;
  publicSlug: string | null;
  verifiedLinkCount: number;
  publishedProofCount: number;
};

/**
 * Show clients who this creative is (link ownership + work proofs) before they pay.
 */
export function ClientVerifyCard({
  trustUrl,
  qrDataUrl,
  publicSlug,
  verifiedLinkCount,
  publishedProofCount,
}: ClientVerifyCardProps) {
  return (
    <section className="rounded-[28px] border border-teal/30 bg-teal/8 p-5 md:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-teal">Before you bill</p>
      <h2 className="mt-2 font-display text-2xl tracking-tight">Client verify card</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Share this so the client can scan or open your public page, check verified link ownership
        and Work Proof Tokens, then trust the invoice.
      </p>

      <div className="mt-5 flex flex-wrap items-start gap-6">
        {qrDataUrl && trustUrl ? (
          <VerifyQr dataUrl={qrDataUrl} label="Scan to verify" size={132} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No public slug yet.
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <Link href="/settings">Set trust visibility</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="min-w-[16rem] flex-1 space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Public page: </span>
            {trustUrl ? (
              <a href={trustUrl} className="break-all text-primary underline" target="_blank" rel="noreferrer">
                {trustUrl}
              </a>
            ) : (
              <span className="text-muted-foreground">not published</span>
            )}
          </p>
          <p className="text-muted-foreground">
            {verifiedLinkCount} verified link{verifiedLinkCount === 1 ? "" : "s"} ·{" "}
            {publishedProofCount} published work proof{publishedProofCount === 1 ? "" : "s"}
            {publicSlug ? ` · /t/${publicSlug}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {trustUrl ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={trustUrl} target="_blank" rel="noreferrer">
                  Preview what the client sees
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href="/onboarding">Add verified links</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
