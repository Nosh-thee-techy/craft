/**
 * Purpose: CRAFT wordmark used on landing, auth, and the app rail.
 * Inputs: size and optional href.
 * Outputs: a serif italic mark plus a tiny gold spark.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * The studio stamp. Fraunces italic so it feels made, not generated.
 */
export function BrandMark({ href = "/", size = "md", className }: BrandMarkProps) {
  const content = (
    <span className="inline-flex items-baseline gap-2">
      <span
        className={cn(
          "font-serif italic tracking-tight text-foreground",
          size === "sm" ? "text-2xl" : "text-3xl",
        )}
      >
        craft
      </span>
      <span className="mb-1 inline-block size-1.5 rounded-full bg-primary shadow-[0_0_12px_#f0c37a]" />
    </span>
  );

  if (!href) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link href={href} className={cn("transition-opacity hover:opacity-80", className)}>
      {content}
    </Link>
  );
}
