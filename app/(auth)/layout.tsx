/**
 * Purpose: Centered layout for login and signup.
 * Inputs: auth page children.
 * Outputs: a narrow, public-facing column.
 */
import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Public auth chrome. These routes are not gated by Proxy.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-primary">
        CRAFT
      </Link>
      {children}
    </main>
  );
}
