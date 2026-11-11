/**
 * Purpose: Public trust page for a creative. No login. No private files.
 * Inputs: route param `slug`.
 * Outputs: only stats and portfolio items the creative marked visible.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicChrome } from "@/components/brand/public-chrome";
import { Button } from "@/components/ui/button";
import { getTrustPage } from "@/lib/trust/service";

type TrustPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Public proof surface. Hidden sections are omitted entirely.
 */
export default async function TrustPage({ params }: TrustPageProps) {
  const { slug } = await params;
  const page = await getTrustPage(slug);
  if (!page) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-4xl flex-col gap-8 px-5 py-12">
      <PublicChrome />
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">Public trust</p>
        <h1 className="font-serif text-4xl italic tracking-tight md:text-6xl">
          {page.name ?? "Studio"}
        </h1>
        {page.craft ? <p className="text-muted-foreground">{page.craft}</p> : null}
      </section>

      {page.visibility.showCounts ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Verified projects" value={String(page.verifiedProjectCount ?? 0)} />
          <Stat label="Delivery rate" value={`${page.deliveryRate ?? 0}%`} />
          <Stat label="Client confirmations" value={String(page.clientConfirmations ?? 0)} />
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
            PayPal sandbox checkout lands with the project invoice flow. For now, open a studio and send a bill.
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
