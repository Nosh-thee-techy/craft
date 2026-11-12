/**
 * Purpose: Public scan-to-verify trust page — link ownership + work proofs. No private files.
 * Inputs: route param `slug`.
 * Outputs: client-facing provenance surface (QR target).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicChrome } from "@/components/brand/public-chrome";
import { VerifyQr } from "@/components/studio/verify-qr";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { getPublicProvenance } from "@/lib/studio/profile";
import { trustQrDataUrl } from "@/lib/trust/qr";
import { getTrustPage } from "@/lib/trust/service";

type TrustPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Public proof surface. Clients land here from a QR or shared link before paying.
 */
export default async function TrustPage({ params }: TrustPageProps) {
  const { slug } = await params;
  const page = await getTrustPage(slug);
  if (!page) {
    notFound();
  }

  const provenance = await getPublicProvenance(slug);
  const trustUrl = `${env.APP_URL}/t/${slug}`;
  const qrDataUrl = await trustQrDataUrl(trustUrl);

  return (
    <main className="mx-auto flex min-h-full max-w-4xl flex-col gap-8 px-5 py-12">
      <PublicChrome />

      <section className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-primary">Scan to verify</p>
          <h1 className="font-serif text-4xl italic tracking-tight md:text-6xl">
            {page.name ?? "Studio"}
          </h1>
          {page.craft ? <p className="text-muted-foreground">{page.craft}</p> : null}
          <p className="text-sm text-muted-foreground">
            This page shows verified link ownership and hash-bound Work Proof Tokens. It does not
            verify government identity — only public links the creative proved they own, plus
            delivery provenance.
          </p>
        </div>
        <VerifyQr dataUrl={qrDataUrl} label="Share / rescan" size={140} />
      </section>

      {page.visibility.showCounts ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Projects on record" value={String(page.verifiedProjectCount ?? 0)} />
          <Stat label="Delivery rate" value={`${page.deliveryRate ?? 0}%`} />
          <Stat label="Client confirmations" value={String(page.clientConfirmations ?? 0)} />
        </section>
      ) : null}

      {provenance && provenance.verifiedLinks.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Verified link ownership</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {provenance.verifiedLinks.map((link) => (
              <li key={`${link.platform}-${link.handle}`} className="glass rounded-[24px] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">{link.platform}</p>
                <p className="mt-2 font-display text-xl">@{link.handle}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-primary underline"
                >
                  Open public link
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {provenance && provenance.workProofs.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Work Proof Tokens</h2>
          <p className="text-sm text-muted-foreground">
            Hash-bound certificates from delivered files. Educational provenance — not tradeable
            NFTs.
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {provenance.workProofs.map((proof) => (
              <li key={proof.id} className="glass rounded-[24px] p-5">
                <p className="font-mono text-xs text-primary">{proof.proofToken}</p>
                <h3 className="mt-2 font-display text-xl">{proof.clientLabel}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{proof.scope}</p>
                {proof.clientConfirmed ? (
                  <p className="mt-3 text-xs text-teal">Client confirmed receipt</p>
                ) : null}
                <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">
                  sha256:{proof.sha256}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {page.portfolio ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Selected work</h2>
          {page.portfolio.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects published yet.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {page.portfolio.map((item) => (
                <li key={`${item.clientLabel}-${item.scope}`} className="glass rounded-[24px] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">{item.status}</p>
                  <h3 className="mt-2 font-display text-xl">{item.clientLabel}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.scope}</p>
                  {item.confirmed ? (
                    <p className="mt-3 text-xs text-teal">Client confirmed receipt</p>
                  ) : null}
                  {item.portfolioLinks.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs">
                      {item.portfolioLinks.map((link) => (
                        <li key={link}>
                          <a className="text-primary underline" href={link} rel="noreferrer" target="_blank">
                            Portfolio link
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {page.showCheckout ? (
        <section className="glass rounded-[28px] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-teal">New work</p>
          <h2 className="mt-3 font-serif text-3xl italic">Request a quote</h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            You verified the creative. Next they send a PayPal sandbox bill from their studio.
          </p>
          <Button asChild className="mt-6">
            <Link href="/signup">Start a project on CRAFT</Link>
          </Button>
        </section>
      ) : null}
    </main>
  );
}

/**
 * One public stat tile.
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[24px] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight">{value}</p>
    </div>
  );
}
