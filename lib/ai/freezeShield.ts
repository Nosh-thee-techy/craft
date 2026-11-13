/**
 * Purpose: Parse a PayPal limitation notice, map requests to vault files, draft a letter.
 * Inputs: pasted notice text and the user's uploaded evidence (never invented).
 * Outputs: parsed requests, covered/missing lists, a letter that cites uploads only.
 *
 * Money is not calculated here. The LLM may only organise and phrase; mapping
 * prefers item types and retrieved source text.
 */
import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { completeJson, embedTexts, LlmNotConfiguredError } from "@/lib/ai/client";
import { logAgentAction } from "@/lib/ai/log";
import { understandNotice } from "@/lib/ai/notice-understanding-core";
import { db } from "@/lib/db/client";
import { docChunks, evidenceItems, projects } from "@/lib/db/schema";
import { isAccountEvidenceType, type EvidenceType } from "@/lib/evidence/schemas";
import {
  mappingSchema,
  parsedNoticeSchema,
  type EvidenceCite,
  type EvidenceMapping,
  type NoticeRequest,
  type PackDraft,
  type PackIndexItem,
  type ParsedNotice,
  type SourceText,
} from "@/lib/freeze/schemas";

export { heuristicParse } from "@/lib/freeze/parse-heuristic";

/**
 * Parse a pasted PayPal notice into requests (Phase 2 F2).
 *
 * LLM `completeJson` is primary when configured; `heuristicParse` is the
 * deterministic fallback on missing key, timeout, or invalid JSON.
 * Both paths validate with `parsedNoticeSchema`.
 */
export async function parseLimitationNotice(
  userId: string,
  rawText: string,
): Promise<ParsedNotice> {
  const { parsed, source } = await understandNotice(rawText, completeJson);

  await logAgentAction({
    userId,
    action: "freeze.parse",
    input: { chars: rawText.length },
    output: {
      source,
      requestCount: parsed.requests.length,
      tone: parsed.tone,
      deadline: parsed.deadline,
      deadlineAt: parsed.deadlineAt ?? null,
    },
  });

  return parsedNoticeSchema.parse(parsed);
}

type VaultSource = SourceText & {
  evidenceId: string;
  projectId: string | null;
};

/**
 * Map each parsed request onto uploaded vault items. Types + text + optional pgvector.
 */
export async function mapNoticeToVault(
  userId: string,
  parsed: ParsedNotice,
): Promise<{ mapping: EvidenceMapping; sources: VaultSource[] }> {
  const sources = await loadVaultSources(userId);
  const covered: EvidenceMapping["covered"] = [];
  const missing: EvidenceMapping["missing"] = [];

  for (const request of parsed.requests) {
    const matches = await matchesForRequest(userId, request, sources);
    if (matches.length > 0) {
      covered.push({ request, matches });
    } else {
      missing.push({
        request,
        reason: isAccountEvidenceType(request.documentType)
          ? `No uploaded ${request.documentType.replaceAll("_", " ")} in the vault yet. PayPal reportedly asks for this — upload it under Identity and funds.`
          : `No uploaded ${request.documentType.replaceAll("_", " ")} matched this request.`,
      });
    }
  }

  const mapping = mappingSchema.parse({ covered, missing });
  await logAgentAction({
    userId,
    action: "freeze.map",
    input: { requestCount: parsed.requests.length },
    output: { covered: covered.length, missing: missing.length },
  });
  return { mapping, sources };
}

/**
 * Cover letter and index. Only filenames/hashes that exist on `mapping.covered`.
 */
export async function draftPackLetter(
  userId: string,
  parsed: ParsedNotice,
  mapping: EvidenceMapping,
): Promise<PackDraft> {
  const canonical = canonicalLetter(parsed, mapping);

  let letter = canonical.letter;
  try {
    const rewritten = await completeJson({
      system:
        "Rewrite this cover letter in a calm, clear tone. You may only mention files, hashes, and types listed in the index. If a request is missing, say it is missing. Never invent a file, hash, date, amount, or client. Do not calculate money.",
      user: `Index (authoritative):\n${JSON.stringify(canonical.index, null, 2)}\n\nDraft:\n${canonical.letter}`,
      schema: z.object({ letter: z.string().min(1) }),
    });
    letter = rewritten.letter;
  } catch {
    letter = canonical.letter;
  }

  const draft: PackDraft = { letter, index: canonical.index };
  await logAgentAction({
    userId,
    action: "freeze.letter",
    input: { covered: mapping.covered.length, missing: mapping.missing.length },
    output: { chars: letter.length, indexItems: draft.index.length },
  });
  return draft;
}

/**
 * Deterministic letter built only from the mapping. Used as the source of truth.
 */
export function canonicalLetter(parsed: ParsedNotice, mapping: EvidenceMapping): PackDraft {
  const index: PackIndexItem[] = [];
  const lines: string[] = [];

  lines.push("Hello PayPal review team,");
  lines.push("");
  lines.push(
    parsed.deadline
      ? `I am responding to a limitation notice (deadline noted as ${parsed.deadline}).`
      : "I am responding to a limitation notice.",
  );
  lines.push(
    "Each file named below is a vault item with a SHA-256 and a server timestamp. I am not inventing documents.",
  );
  lines.push("");

  for (const item of mapping.covered) {
    const match = item.matches[0];
    if (!match) {
      continue;
    }
    index.push({
      requestLabel: item.request.label,
      status: "covered",
      evidenceId: match.evidenceId,
      fileName: match.fileName,
      sha256: match.sha256,
      addedAt: match.addedAt,
      type: match.type,
    });
    lines.push(
      `For “${item.request.label}” I am sending ${match.fileName ?? match.type} (type ${match.type}, SHA-256 ${match.sha256 ?? "n/a"}, stored ${match.addedAt}).`,
    );
  }

  for (const item of mapping.missing) {
    index.push({
      requestLabel: item.request.label,
      status: "missing",
      evidenceId: null,
      fileName: null,
      sha256: null,
      addedAt: null,
      type: item.request.documentType,
    });
    lines.push(
      `For “${item.request.label}” I do not have a matching file in the vault. ${item.reason}`,
    );
  }

  lines.push("");
  lines.push("Thank you for reviewing the files I actually uploaded.");
  lines.push("");
  lines.push("Kind regards,");
  lines.push("The studio on CRAFT");

  return { letter: lines.join("\n"), index };
}

/**
 * Load every vault row the user owns (project + account-level), for mapping.
 */
export async function loadVaultSources(userId: string): Promise<VaultSource[]> {
  const rows = await db
    .select({
      item: evidenceItems,
      projectName: projects.clientName,
    })
    .from(evidenceItems)
    .leftJoin(projects, eq(evidenceItems.projectId, projects.id))
    .where(eq(evidenceItems.userId, userId));

  return rows.map(({ item, projectName }) => {
    const fileName =
      item.type === "portfolio_link" ? item.storageKey : (item.storageKey?.split("/").pop() ?? null);
    const scopeLabel = projectName ?? "Identity and funds";
    return {
      evidenceId: item.id,
      projectId: item.projectId,
      fileName,
      sha256: item.sha256,
      type: item.type,
      text: [
        item.extractedText,
        item.holderName,
        item.issuer,
        item.addressText,
        scopeLabel,
        fileName,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  });
}

/**
 * Find vault items for one request: type match, keyword text, then vector neighbours.
 */
async function matchesForRequest(
  userId: string,
  request: NoticeRequest,
  sources: VaultSource[],
): Promise<EvidenceCite[]> {
  const found = new Map<string, EvidenceCite>();

  const consider = (source: VaultSource, excerpt: string) => {
    if (found.has(source.evidenceId)) {
      return;
    }
    found.set(source.evidenceId, {
      evidenceId: source.evidenceId,
      type: source.type as EvidenceType,
      fileName: source.fileName,
      sha256: source.sha256,
      addedAt: new Date().toISOString(),
      excerpt: excerpt.slice(0, 220),
    });
  };

  for (const source of sources) {
    if (source.type === request.documentType) {
      consider(source, source.text);
    }
  }

  for (const source of sources) {
    const hay = source.text.toLowerCase();
    if (request.keywords.some((keyword) => hay.includes(keyword.toLowerCase()))) {
      consider(source, source.text);
    }
  }

  const neighbours = await vectorNeighbours(userId, request.label);
  for (const neighbour of neighbours) {
    const source = sources.find((row) => row.evidenceId === neighbour.evidenceItemId);
    if (source) {
      consider(source, neighbour.chunkText);
    }
  }

  return attachAddedAt([...found.values()]);
}

/**
 * Optional pgvector search. Empty when embeddings were never stored.
 */
async function vectorNeighbours(
  userId: string,
  query: string,
): Promise<{ evidenceItemId: string; chunkText: string }[]> {
  let vector: number[] | undefined;
  try {
    const embedded = await embedTexts([query]);
    vector = embedded[0];
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      throw error;
    }
    return [];
  }
  if (!vector || vector.length === 0) {
    return [];
  }

  const literal = `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
  const rows = await db
    .select({
      evidenceItemId: docChunks.evidenceItemId,
      chunkText: docChunks.chunkText,
    })
    .from(docChunks)
    .where(and(eq(docChunks.userId, userId), isNotNull(docChunks.embedding)))
    .orderBy(sql`${docChunks.embedding} <=> ${sql.raw(`'${literal}'::vector`)}`)
    .limit(8);

  return rows;
}

/**
 * Stamp cites with the real added_at from the vault row.
 */
async function attachAddedAt(cites: EvidenceCite[]): Promise<EvidenceCite[]> {
  if (cites.length === 0) {
    return cites;
  }
  const ids = cites.map((cite) => cite.evidenceId);
  const rows = await db
    .select({ id: evidenceItems.id, addedAt: evidenceItems.addedAt })
    .from(evidenceItems)
    .where(inArray(evidenceItems.id, ids));
  const times = new Map(rows.map((row) => [row.id, row.addedAt.toISOString()]));
  return cites.map((cite) => ({
    ...cite,
    addedAt: times.get(cite.evidenceId) ?? cite.addedAt,
  }));
}
