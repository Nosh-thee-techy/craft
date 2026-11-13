/**
 * Purpose: Phase 2 F2 — understand a PayPal notice into typed requests + deadline.
 * Inputs: raw notice text + injected LLM (optional); heuristic is always the fallback.
 * Outputs: ParsedNotice validated by the same schema on both paths. No DB / env.
 */
import {
  heuristicParse,
  parseDeadlineAt,
} from "@/lib/freeze/parse-heuristic";
import {
  parsedNoticeSchema,
  type ParsedNotice,
} from "@/lib/freeze/schemas";
import type { z } from "zod";

export const NOTICE_UNDERSTAND_TIMEOUT_MS = 20_000;

export type NoticeLlmCall = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}) => Promise<T>;

export class NoticeLlmTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Notice LLM timed out after ${timeoutMs}ms.`);
    this.name = "NoticeLlmTimeoutError";
  }
}

export type UnderstandNoticeResult = {
  parsed: ParsedNotice;
  /** Which path produced the returned parse. */
  source: "llm" | "heuristic";
};

const SYSTEM = [
  "You extract what PayPal asked a seller to send. Use only the pasted notice.",
  "Map each request to exactly one of: contract, invoice, payment, deliverable, comms, portfolio_link, id_document, address_proof, bank_statement, source_of_funds, employment_proof.",
  "Use id_document/address_proof/bank_statement/source_of_funds/employment_proof for Kenya-style KYC asks (utility bill, ID, bank statement, source of funds, employment).",
  "Never invent a request that is not in the notice. Never invent files.",
  "Set deadlineAt to YYYY-MM-DD when the notice has a clear date, else null.",
  "Set deadline to the original deadline phrase when present, else null.",
].join(" ");

/**
 * LLM primary when `llm` succeeds; heuristic otherwise. Both validated by parsedNoticeSchema.
 */
export async function understandNotice(
  rawText: string,
  llm?: NoticeLlmCall,
): Promise<UnderstandNoticeResult> {
  const heuristic = finalizeDeadline(heuristicParse(rawText));

  if (!llm) {
    return { parsed: parsedNoticeSchema.parse(heuristic), source: "heuristic" };
  }

  try {
    const fromLlm = await llm({
      system: SYSTEM,
      user: rawText.slice(0, 12_000),
      schema: parsedNoticeSchema,
      timeoutMs: NOTICE_UNDERSTAND_TIMEOUT_MS,
    });
    const parsed = parsedNoticeSchema.parse(finalizeDeadline(fromLlm));
    return { parsed, source: "llm" };
  } catch {
    return { parsed: parsedNoticeSchema.parse(heuristic), source: "heuristic" };
  }
}

/**
 * Fill deadlineAt from free-text deadline when the model omitted it.
 */
export function finalizeDeadline(parsed: ParsedNotice): ParsedNotice {
  if (parsed.deadlineAt) {
    return {
      ...parsed,
      deadlineAt: parsed.deadlineAt,
    };
  }
  if (!parsed.deadline) {
    return { ...parsed, deadlineAt: parsed.deadlineAt ?? null };
  }
  const date = parseDeadlineAt(parsed.deadline);
  return {
    ...parsed,
    deadlineAt: date ? date.toISOString().slice(0, 10) : null,
  };
}
