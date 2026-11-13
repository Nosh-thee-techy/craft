/**
 * Purpose: Phase 2 F7 — one-sentence explanation per pre-invoice flag.
 * Inputs: flags from checkInvoice (code decides the set); optional LLM for wording.
 * Outputs: same flags with an explanation. LLM cannot add or remove a flag.
 */
import type { InvoiceFlag } from "@/lib/readiness/invoice-check";
import { z } from "zod";

export const FLAG_EXPLAIN_TIMEOUT_MS = 20_000;

const explainedSchema = z.object({
  explanations: z.array(
    z.object({
      code: z.string(),
      sentence: z.string().min(1),
      attachFirst: z.string().min(1),
    }),
  ),
});

export type ExplainedFlag = InvoiceFlag & {
  sentence: string;
  attachFirst: string;
};

export type FlagExplainResult = {
  flags: ExplainedFlag[];
  source: "llm" | "deterministic";
};

export type FlagLlm = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}) => Promise<T>;

const DEFAULTS: Record<
  InvoiceFlag["code"],
  { sentence: string; attachFirst: string }
> = {
  amount_spike: {
    sentence: "This bill is large compared with your recent paid work.",
    attachFirst: "A signed contract or scope for this client.",
  },
  new_client_country: {
    sentence: "This client country has not appeared on your account before.",
    attachFirst: "Client communications that show the job and location.",
  },
  low_completeness: {
    sentence: "This project is missing vault proof PayPal often looks for.",
    attachFirst: "Contract and invoice for this project.",
  },
  seller_mismatch: {
    sentence: "Seller details on the invoice differ from your profile name.",
    attachFirst: "Align the invoice seller name with your legal name.",
  },
  no_contract: {
    sentence: "There is no contract on file for this client yet.",
    attachFirst: "Upload the signed contract or statement of work.",
  },
};

/**
 * Explain each flag in one sentence. Flag set is frozen from code.
 */
export async function explainInvoiceFlags(
  flags: InvoiceFlag[],
  llm?: FlagLlm,
): Promise<FlagExplainResult> {
  const deterministic: ExplainedFlag[] = flags.map((flag) => ({
    ...flag,
    ...DEFAULTS[flag.code],
  }));

  if (!llm || flags.length === 0) {
    return { flags: deterministic, source: "deterministic" };
  }

  try {
    const drafted = await llm({
      system:
        "Explain each pre-invoice flag in one sentence and say what to attach first. You may only explain the codes provided. Do not add or remove a flag. Do not calculate money.",
      user: JSON.stringify({ flags, seed: deterministic }),
      schema: explainedSchema,
      timeoutMs: FLAG_EXPLAIN_TIMEOUT_MS,
    });

    const byCode = new Map(drafted.explanations.map((row) => [row.code, row]));
    const merged = flags.map((flag) => {
      const extra = byCode.get(flag.code);
      return {
        ...flag,
        sentence: extra?.sentence ?? DEFAULTS[flag.code].sentence,
        attachFirst: extra?.attachFirst ?? DEFAULTS[flag.code].attachFirst,
      };
    });
    return { flags: merged, source: "llm" };
  } catch {
    return { flags: deterministic, source: "deterministic" };
  }
}
