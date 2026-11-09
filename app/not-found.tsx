/**
 * Purpose: Branded 404 so a missing room still feels like CRAFT.
 * Inputs: none.
 * Outputs: a glass miss page with a way home.
 */
import Link from "next/link";
import { PublicChrome } from "@/components/brand/public-chrome";
import { Button } from "@/components/ui/button";

/**
 * Not-found for both public and signed-in routes.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-20 text-center">
      <PublicChrome />
      <h1 className="max-w-lg font-serif text-5xl italic leading-tight md:text-6xl">
        This room isn’t on the floor plan.
      </h1>
      <p className="max-w-md text-muted-foreground">
        The link may have moved, or it was never a public room. Head back to the studio.
      </p>
      <Button asChild>
        <Link href="/">Take me home</Link>
      </Button>
    </main>
  );
}
