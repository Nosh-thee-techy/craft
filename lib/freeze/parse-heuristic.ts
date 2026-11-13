/**
 * Purpose: Keyword parse of a PayPal limitation notice without an LLM or database.
 * Inputs: pasted notice text.
 * Outputs: ParsedNotice with request types CRAFT can map to the vault.
 *
 * WHY separate from freezeShield.ts: Phase 7 eval must run under plain `tsx`
 * without Next.js `server-only` guards.
 *
 * F4 note: freezeShield.ts tries the LLM first and falls back to this heuristic
 * when the model is missing, times out, or returns invalid JSON.
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
  // Kenya-style / account-level requests (reported, not PayPal-confirmed).
  {
    type: "id_document",
    keywords: [
      "passport",
      "national id",
      "government id",
      "kyc",
      "selfie",
      "identity document",
      "photo id",
      "kra pin",
    ],
  },
  {
    type: "address_proof",
    keywords: [
      "utility bill",
      "proof of address",
      "proof of residence",
      "kplc",
      "water bill",
      "electricity bill",
      "internet bill",
    ],
  },
  {
    type: "bank_statement",
    keywords: ["bank statement", "bank statements", "account statement"],
  },
  {
    type: "source_of_funds",
    keywords: [
      "source of funds",
      "source of the funds",
      "purpose of funds",
      "foreign funds",
      "origin of funds",
    ],
  },
  {
    type: "employment_proof",
    keywords: [
      "proof of employment",
      "employment letter",
      "employer letter",
      "proof of income",
    ],
  },
];

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Turn a free-text deadline into a calendar Date, or null if unknown.
 *
 * Supports ISO dates, "12 November 2026", and "within N days" from `asOf`.
 */
export function parseDeadlineAt(
  deadlineText: string | null | undefined,
  asOf: Date = new Date(),
): Date | null {
  if (!deadlineText?.trim()) {
    return null;
  }
  const text = deadlineText.trim();

  const within = text.match(/^within\s+(\d+)\s+days$/i);
  if (within) {
    const days = Number(within[1]);
    if (!Number.isFinite(days) || days < 0) {
      return null;
    }
    const result = new Date(asOf);
    result.setUTCHours(0, 0, 0, 0);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const named = text.match(
    /^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
  );
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    const date = new Date(Date.UTC(Number(named[3]), month, Number(named[1])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

/**
 * Keyword parse so Freeze Shield and the eval suite work without an LLM key.
 */
export function heuristicParse(rawText: string, asOf: Date = new Date()): ParsedNotice {
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

  // Last resort: generic supporting docs → treat as source_of_funds gap rather than "other".
  if (requests.length === 0) {
    requests.push({
      id: "source_of_funds",
      label: "Supporting documents named in the notice",
      documentType: "source_of_funds",
      keywords: ["document", "proof"],
    });
  }

  const deadlineMatch = rawText.match(
    /\b(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2}|within\s+\d+\s+days)\b/i,
  );
  const deadline = deadlineMatch?.[0] ?? null;
  const deadlineDate = parseDeadlineAt(deadline, asOf);

  let tone: ParsedNotice["tone"] = "calm";
  if (/\b(limited|limitation|restricted|held|frozen|on hold)\b/i.test(rawText)) {
    tone = "restriction";
  } else if (/\b(urgent|immediately|48 hours|24 hours|as soon as)\b/i.test(rawText)) {
    tone = "urgent";
  }

  return {
    deadline,
    deadlineAt: deadlineDate ? deadlineDate.toISOString().slice(0, 10) : null,
    tone,
    summary: rawText.replace(/\s+/g, " ").trim().slice(0, 280),
    requests,
  };
}
