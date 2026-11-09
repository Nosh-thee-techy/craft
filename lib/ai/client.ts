/**
 * Purpose: Single LLM wrapper (tool calling, JSON-schema, vision).
 * Inputs: prompts, schemas, optional images — not wired in Phase 0.
 * Outputs: throws until Phase 2+.
 *
 * Provider is swappable. The LLM must never calculate money or invent evidence.
 */
import "server-only";

/**
 * Placeholder so later phases import from one module.
 */
export async function completeJson(): Promise<never> {
  throw new Error("lib/ai/client.ts is not implemented until Phase 2.");
}
