/**
 * Purpose: Test-only stand-in for the `server-only` package.
 * Inputs: none.
 * Outputs: nothing (an empty module).
 *
 * WHY: the real package throws when imported outside a Next.js server build,
 * which would stop tests from importing any module marked `server-only`.
 * vitest.config.ts aliases `server-only` to this file. The guard stays active
 * in the real app; only the test runner swaps it out.
 */
export {};
