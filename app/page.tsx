/**
 * Purpose: Public landing — simple words, light-mode control, and a map of CRAFT.
 * Inputs: none.
 * Outputs: hero, path map with photos, short close.
 */
import Link from "next/link";
import { BrandMark } from "@/components/brand/mark";
import { StudioMap } from "@/components/brand/studio-map";
import { ThemeToggle } from "@/components/brand/theme-toggle";
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
  "fashion house",
];

/**
 * Marketing home. Plain language first. The map shows every path.
 */
export default function HomePage() {
  const marquee = [...CRAFTS, ...CRAFTS];

  return (
    <div className="relative min-h-dvh min-w-0 overflow-x-clip">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8 md:py-6">
        <BrandMark />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle labeled />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-12 px-4 pb-16 pt-4 md:gap-20 md:px-8 md:pb-24 md:pt-10">
        <section className="rise max-w-3xl">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-primary">
            For Kenyan creatives on PayPal
          </p>
          <h1 className="font-serif text-[clamp(2.4rem,10vw,6.4rem)] leading-[0.95] tracking-tight">
            Get paid.
            <br />
            Keep the <span className="italic text-primary">proof</span>.
          </h1>
          <p className="rise-2 mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            CRAFT is a simple studio for people who make things. Send a PayPal bill, save
            proof of the work, and know what to do if PayPal holds your money.
          </p>
          <div className="rise-3 mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Create a free studio</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">I already have one</Link>
            </Button>
          </div>
        </section>

        <section className="rise-4 marquee py-1" aria-hidden="true">
          <div className="marquee-track font-display text-xs uppercase tracking-[0.28em] text-foreground/35 md:text-sm">
            {marquee.map((craft, index) => (
              <span key={`${craft}-${index}`} className="flex items-center gap-8">
                {craft}
                <span className="size-1.5 rounded-full bg-accent/80" />
              </span>
            ))}
          </div>
        </section>

        <div className="rise-5 min-w-0">
          <StudioMap />
        </div>

        <section className="glass overflow-hidden rounded-[28px] px-5 py-8 md:rounded-[32px] md:px-14 md:py-14">
          <p className="text-xs uppercase tracking-[0.28em] text-teal">In short</p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl italic leading-tight md:text-5xl">
            Your work is the brand. The money side should be easy to read too.
          </h2>
          <p className="mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
            Built for Nairobi, Mombasa, and every studio in between. PayPal sandbox today.
            Your real invoices when the keys are in.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/signup">Start in two minutes</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
