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
    <div className="grid min-h-full lg:grid-cols-2">
      <AuthPicture />
      <section className="relative flex min-h-full flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <BrandMark />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-14">
          <p className="rise mb-6 max-w-sm text-sm text-muted-foreground">
            Step into the studio. The work stays yours.
          </p>
          <div className="rise-2 w-full max-w-md">{children}</div>
        </div>
      </section>
    </div>
  );
}
