/**
 * Purpose: Keyword parse of a PayPal limitation notice without an LLM or database.
 * Inputs: pasted notice text.
 * Outputs: ParsedNotice with request types CRAFT can map to the vault.
 *
 * WHY separate from freezeShield.ts: Phase 7 eval must run under plain `tsx`
 * without Next.js `server-only` guards.
 */
import {
  type NoticeDocType,
  type NoticeRequest,
  type ParsedNotice,
} from "@/lib/freeze/schemas";

const TYPE_HINTS: { type: NoticeDocType; keywords: string[] }[] = [
  { type: "invoice", keywords: ["invoice", "bill", "proof of sale", "itemised"] },
  { type: "payment", keywords: ["payment", "payout", "transaction", "proof of payment", "receipt"] },
  {
    type: "contract",
    keywords: ["contract", "agreement", "statement of work", "sow", "terms"],
  },
  {
    type: "deliverable",
    keywords: ["deliverable", "delivery", "tracking", "work product", "final files"],
  },
  { type: "comms", keywords: ["email", "message", "correspondence", "chat", "conversation"] },
  {
    type: "portfolio_link",
    keywords: ["website", "portfolio", "samples", "instagram", "shop"],
  },
  { type: "other", keywords: ["passport", "national id", "government id", "kyc", "selfie"] },
];

/**
 * Keyword parse so Freeze Shield and the eval suite work without an LLM key.
 */
export function heuristicParse(rawText: string): ParsedNotice {
  const lower = rawText.toLowerCase();
  const requests: NoticeRequest[] = [];

  for (const hint of TYPE_HINTS) {
    const hit = hint.keywords.find((keyword) => lower.includes(keyword));
    if (!hit) {
      continue;
    }
    requests.push({
      id: hint.type,
      label: `PayPal asked for ${hit}`,
      documentType: hint.type,
      keywords: hint.keywords,
    });
  }

  if (requests.length === 0) {
    requests.push({
      id: "supporting",
      label: "Supporting documents named in the notice",
      documentType: "other",
      keywords: ["document", "proof"],
    });
  }

  const deadlineMatch = rawText.match(
    /\b(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2}|within\s+\d+\s+days)\b/i,
  );

  let tone: ParsedNotice["tone"] = "calm";
  if (/\b(limited|limitation|restricted|held|frozen|on hold)\b/i.test(rawText)) {
    tone = "restriction";
  } else if (/\b(urgent|immediately|48 hours|24 hours|as soon as)\b/i.test(rawText)) {
    tone = "urgent";
  }

  return {
    deadline: deadlineMatch?.[0] ?? null,
    tone,
    summary: rawText.replace(/\s+/g, " ").trim().slice(0, 280),
    requests,
  };
}
