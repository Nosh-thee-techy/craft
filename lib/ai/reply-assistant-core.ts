/**
 * Purpose: Phase 2 F4 — draft a reply to a PayPal follow-up from vault facts only.
 * Inputs: follow-up text, covered vault cites, missing list; optional LLM.
 * Outputs: draft letter. Deterministic template is the fallback.
 */
import { z } from "zod";

export const REPLY_ASSISTANT_TIMEOUT_MS = 20_000;

const draftSchema = z.object({
  letter: z.string().min(1),
});

export type ReplyVaultCite = {
  requestLabel: string;
  fileName: string | null;
  sha256: string | null;
  type: string;
};

export type ReplyAssistantInput = {
  followUp: string;
  covered: ReplyVaultCite[];
  missingLabels: string[];
};

export type ReplyAssistantResult = {
  letter: string;
  source: "llm" | "deterministic";
};

export type ReplyLlm = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}) => Promise<T>;

/**
 * Draft a calm reply. LLM may only name files from `covered`; missing stays missing.
 */
export async function draftFollowUpReply(
  input: ReplyAssistantInput,
  llm?: ReplyLlm,
): Promise<ReplyAssistantResult> {
  const deterministic = canonicalReply(input);

  if (!llm) {
    return { letter: deterministic, source: "deterministic" };
  }

  try {
    const drafted = await llm({
      system:
        "Draft a short reply to a PayPal follow-up. You may only mention files, hashes, and types listed in COVERED. If something is missing, say it is missing. Never invent a file, hash, or date. Never calculate money.",
      user: JSON.stringify({
        followUp: input.followUp.slice(0, 4000),
        covered: input.covered,
        missing: input.missingLabels,
        seed: deterministic,
      }),
      schema: draftSchema,
      timeoutMs: REPLY_ASSISTANT_TIMEOUT_MS,
    });
    return { letter: drafted.letter, source: "llm" };
  } catch {
    return { letter: deterministic, source: "deterministic" };
  }
}

/**
 * Deterministic letter built only from covered cites + missing labels.
 */
export function canonicalReply(input: ReplyAssistantInput): string {
  const lines: string[] = [
    "Hello PayPal review team,",
    "",
    "Thank you for the follow-up. Here is what I can send from my CRAFT vault.",
    "",
  ];

  for (const item of input.covered) {
    lines.push(
      `For “${item.requestLabel}” I am sending ${item.fileName ?? item.type} (type ${item.type}, SHA-256 ${item.sha256 ?? "n/a"}).`,
    );
  }

  for (const label of input.missingLabels) {
    lines.push(`For “${label}” I do not yet have a matching file in the vault.`);
  }

  lines.push("", "Kind regards,", "The studio on CRAFT");
  return lines.join("\n");
}
