/**
 * Purpose: Root HTML shell, fonts, and metadata for every CRAFT route.
 * Inputs: child route trees.
 * Outputs: the document wrapper. Dark by default (product/AI app).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRAFT",
  description:
    "Creators' Records, Assurance, Funds & Trust — a PayPal-centred workspace for Kenyan creatives.",
};

/**
 * Wrap all pages. Feature UIs live in nested layouts.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
