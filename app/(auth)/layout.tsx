/**
 * Purpose: Split-screen studio door for login and signup.
 * Inputs: auth page children.
 * Outputs: photograph on one side, form on the other.
 */
import type { ReactNode } from "react";
import { AuthPicture } from "@/components/brand/auth-picture";
import { BrandMark } from "@/components/brand/mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";

/**
 * Public auth chrome. These routes are not gated by Proxy.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid min-h-dvh min-w-0 lg:grid-cols-2">
      <AuthPicture />
      <section className="relative flex min-h-0 min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-10 md:py-5">
          <BrandMark />
          <ThemeToggle labeled />
        </header>
        <div className="flex flex-1 flex-col justify-center px-4 py-6 md:px-14 md:py-10">
          <p className="rise mb-5 max-w-sm text-sm text-muted-foreground">
            Sign in. Your work stays yours.
          </p>
          <div className="rise-2 w-full max-w-md">{children}</div>
        </div>
      </section>
    </div>
  );
}
