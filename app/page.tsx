/**
 * Purpose: Public landing page.
 * Inputs: none.
 * Outputs: product pitch plus links to login/signup.
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Marketing shell. Features are not implemented in Phase 0.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm font-medium tracking-[0.2em] text-primary">CRAFT</p>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight">
        Get paid, prove the work, survive a PayPal limitation, and plan the money.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        A PayPal-centred workspace for Kenyan creatives. Built for the PayPal AI
        Hackathon. Phase 0 is the blank, authenticated app — invoices, vault, and
        Freeze Shield come next.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Create an account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
