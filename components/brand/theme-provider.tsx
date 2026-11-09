/**
 * Purpose: Client theme wrapper so dusk/white mode persists across routes.
 * Inputs: child tree.
 * Outputs: next-themes context with class strategy on <html>.
 */
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Dark is the studio default. White mode is an explicit, remembered choice.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="craft-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
