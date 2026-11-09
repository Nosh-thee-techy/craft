/**
 * Purpose: Root HTML shell, studio fonts, and the shared dusk atmosphere.
 * Inputs: child route trees.
 * Outputs: the branded document wrapper for every CRAFT screen.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Geist_Mono, Outfit, Syne } from "next/font/google";
import { Atmosphere } from "@/components/brand/atmosphere";
import { ThemeProvider } from "@/components/brand/theme-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRAFT — proof as beautiful as the work",
  description:
    "Creators' Records, Assurance, Funds & Trust. A PayPal studio for Kenyan creatives: get paid, prove the work, survive a freeze, plan the money.",
};

/**
 * Wrap all pages in the same sky, grain, and type system.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${syne.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <Atmosphere />
          <div className="relative z-10 min-h-full">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
