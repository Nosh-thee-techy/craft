/**
 * Purpose: Public landing — the brand statement for Kenyan creatives.
 * Inputs: none.
 * Outputs: cinematic hero, craft marquee, four studio rooms, closing CTA.
 */
import Link from "next/link";
import { Archive, Shield, Sparkles, Wallet } from "lucide-react";
import { BrandMark } from "@/components/brand/mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { TiltCard } from "@/components/brand/tilt-card";
import { Button } from "@/components/ui/button";

const CRAFTS = [
  "photographer",
  "illustrator",
  "producer",
  "designer",
  "writer",
  "filmmaker",
  "musician",
  "stylist",
  "animator",
  "architect",
  "potter",
  "tattooist",
  "voice artist",
  "fashion house",
];

const ROOMS = [
  {
    icon: Wallet,
    kicker: "Funds",
    title: "Get paid like the work already shipped.",
    copy: "Draft a project, send a PayPal invoice, and watch the webhook mark it funded. No spreadsheet. No chasing.",
  },
  {
    icon: Archive,
    kicker: "Records",
    title: "Proof that looks as considered as the portfolio.",
    copy: "Hashes, timestamps, and a private vault. When someone asks ‘did you really make this?’ you have the receipts.",
  },
  {
    icon: Shield,
    kicker: "Assurance",
    title: "A freeze should not freeze you.",
    copy: "Paste a PayPal limitation, map it to evidence, and walk out with a pack a human can actually read.",
  },
  {
    icon: Sparkles,
    kicker: "Trust",
    title: "Plan the money without pretending you’re a bank.",
    copy: "Income stability, splits, and a trust page clients can open. Educational, honest, and yours.",
  },
] as const;

/**
 * Marketing home. The product is a studio, not a dashboard.
 */
export default function HomePage() {
  const marquee = [...CRAFTS, ...CRAFTS];

  return (
    <div className="relative min-h-full overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <BrandMark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Open a studio</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-5 pb-24 pt-8 md:px-8 md:pt-16">
        <section className="rise max-w-4xl">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.32em] text-primary">
            Creators’ Records, Assurance, Funds &amp; Trust
          </p>
          <h1 className="font-serif text-[clamp(3.2rem,8vw,7.4rem)] leading-[0.9] tracking-tight">
            Make the money as{" "}
            <span className="italic text-primary">beautiful</span>
            <br />
            as the work.
          </h1>
          <p className="rise-2 mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            CRAFT is a PayPal studio for Kenyan creatives. Get paid. Prove the
            work. Survive a freeze. Plan the next season — without a product that
            looks like accounting software.
          </p>
          <div className="rise-3 mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start creating with proof</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">I already have a studio</Link>
            </Button>
          </div>
        </section>

        <section className="rise-4 marquee py-2" aria-hidden="true">
          <div className="marquee-track font-display text-sm uppercase tracking-[0.28em] text-foreground/35">
            {marquee.map((craft, index) => (
              <span key={`${craft}-${index}`} className="flex items-center gap-10">
                {craft}
                <span className="size-1.5 rounded-full bg-accent/80" />
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {ROOMS.map((room) => (
            <TiltCard key={room.title} className="p-7 md:p-8">
              <room.icon className="mb-6 size-6 text-primary" strokeWidth={1.6} />
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-accent">{room.kicker}</p>
              <h2 className="font-display text-2xl leading-tight tracking-tight">{room.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{room.copy}</p>
            </TiltCard>
          ))}
        </section>

        <section className="glass rise-5 overflow-hidden rounded-[32px] px-8 py-12 md:px-14 md:py-16">
          <p className="text-xs uppercase tracking-[0.28em] text-teal">For the ones who make</p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl italic leading-tight md:text-6xl">
            Your craft is already a brand. The books should feel like one too.
          </h2>
          <p className="mt-6 max-w-lg text-muted-foreground">
            Built around PayPal, for Nairobi to Mombasa and every studio in
            between. Sandbox today. Real invoices when the keys are in.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">Claim your studio name</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
