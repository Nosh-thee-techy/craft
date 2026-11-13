/**
 * Purpose: Public landing — brand, one promise, one CTA. Map stays below.
 * Inputs: none.
 * Outputs: quiet first viewport; map as the second section.
 */
import Link from "next/link";
import { BrandMark } from "@/components/brand/mark";
import { HeroCollage } from "@/components/brand/hero-collage";
import { StudioMap } from "@/components/brand/studio-map";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Marketing home. First screen: brand, headline, one line, CTAs — nothing else.
 */
export default function HomePage() {
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

      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-16 px-4 pb-16 pt-2 md:gap-20 md:px-8 md:pb-24 md:pt-4">
        <section className="rise grid min-h-[70vh] items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="min-w-0">
            <h1 className="font-serif text-[clamp(2.6rem,9vw,5.6rem)] leading-[0.95] tracking-tight">
              Get paid.
              <br />
              Keep the <span className="italic text-primary">proof</span>.
            </h1>
            <p className="rise-2 mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              PayPal billing and work proof for Kenyan creatives.
            </p>
            <div className="rise-3 mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Create a studio</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
          <div className="rise-2 min-w-0">
            <HeroCollage />
          </div>
        </section>

        <div className="rise-4 min-w-0">
          <StudioMap />
        </div>

        <section className="pb-4">
          <h2 className="max-w-xl font-serif text-3xl italic leading-tight md:text-4xl">
            Bill. Vault the trail. Answer a hold with proof.
          </h2>
          <Button asChild size="lg" className="mt-6">
            <Link href="/signup">Start free</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
