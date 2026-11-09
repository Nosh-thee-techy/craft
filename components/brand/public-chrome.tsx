/**
 * Purpose: Brand mark + theme toggle for public/out-of-app pages.
 * Inputs: optional mark href.
 * Outputs: a compact top row.
 */
import { BrandMark } from "@/components/brand/mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";

type PublicChromeProps = {
  href?: string;
};

/**
 * Shared header for onboarding, trust, confirm, and 404.
 */
export function PublicChrome({ href = "/" }: PublicChromeProps) {
  return (
    <div className="flex items-center justify-between">
      <BrandMark href={href} />
      <ThemeToggle />
    </div>
  );
}
