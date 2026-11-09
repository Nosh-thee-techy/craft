/**
 * Purpose: Class-name helper used by shadcn/ui primitives.
 * Inputs: any number of clsx-compatible values.
 * Outputs: a merged Tailwind class string.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, with later values winning conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
