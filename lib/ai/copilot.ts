/**
 * Purpose: Phase 2 F6 — retrieve vault/rules snippets and answer with citations.
 * Inputs: user id + question. Tool calls are read-only.
 * Outputs: CopilotResult. No source → “I don't know”. Logged as copilot.answer.
 */
import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { completeJson, embedTexts, LlmNotConfiguredError } from "@/lib/ai/client";
import {
  answerFromVault,
  type CopilotResult,
  type CopilotSnippet,
} from "@/lib/ai/copilot-core";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { docChunks, evidenceItems, users } from "@/lib/db/schema";
import { computeReadiness } from "@/lib/readiness/compute";

/**
 * Answer a studio question from retrieved vault text and readiness rules only.
 */
export async function askCopilot(
  userId: string,
  question: string,
): Promise<CopilotResult> {
  const snippets = await retrieveSnippets(userId, question);
  const result = await answerFromVault(question, snippets, completeJson);

  await logAgentAction({
    userId,
    action: "copilot.answer",
    input: { question: question.slice(0, 500), snippetCount: snippets.length },
    output: {
      source: result.source,
      citationIds: result.citationIds,
      answerChars: result.answer.length,
    },
  });

  return result;
}

/**
 * Read-only retrieval: vault excerpts + readiness rule blurbs. Never invents files.
 */
async function retrieveSnippets(
  userId: string,
  question: string,
): Promise<CopilotSnippet[]> {
  const snippets: CopilotSnippet[] = [];
  const q = question.toLowerCase();

  // Include failed readiness checks when the question smells like “what next / flagged”.
  if (/flag|ready|upload|next|missing|proof|address|id\b/.test(q)) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const evidenceRows = await db
      .select()
      .from(evidenceItems)
      .where(eq(evidenceItems.userId, userId));
    const result = computeReadiness({
      profile: {
        legalName: user?.legalName,
        name: user?.name,
        addressEstate: user?.addressEstate,
        addressRoad: user?.addressRoad,
        addressTown: user?.addressTown,
        addressCounty: user?.addressCounty,
        incomeStatement: user?.incomeStatement,
        bankLinkedAttested: user?.bankLinkedAttested,
      },
      evidence: evidenceRows.map((row) => ({
        type: row.type,
        projectId: row.projectId,
        docDate: row.docDate,
        addressText: row.addressText,
        holderName: row.holderName,
        extractedConfirmed: row.extractedConfirmed,
      })),
    });
    for (const check of result.checks.filter((c) => c.state !== "ok")) {
      snippets.push({
        id: `check-${check.id}`,
        title: check.label,
        text: `${check.state}: ${check.detail}`,
      });
    }
  }

  const vaultRows = await db
    .select({
      id: evidenceItems.id,
      type: evidenceItems.type,
      text: evidenceItems.extractedText,
      holder: evidenceItems.holderName,
      issuer: evidenceItems.issuer,
      address: evidenceItems.addressText,
      key: evidenceItems.storageKey,
    })
    .from(evidenceItems)
    .where(eq(evidenceItems.userId, userId))
    .limit(40);

  for (const row of vaultRows) {
    const blob = [row.text, row.holder, row.issuer, row.address, row.key]
      .filter(Boolean)
      .join("\n");
    if (!blob) continue;
    const hay = blob.toLowerCase();
    const keywords = q.split(/\W+/).filter((w) => w.length > 3);
    if (keywords.some((word) => hay.includes(word)) || snippets.length < 6) {
      snippets.push({
        id: `ev-${row.id}`,
        title: `${row.type}${row.key ? ` · ${row.key.split("/").pop()}` : ""}`,
        text: blob.slice(0, 400),
      });
    }
  }

  const vectorHits = await vectorSnippets(userId, question);
  for (const hit of vectorHits) {
    if (!snippets.some((snip) => snip.id === hit.id)) {
      snippets.push(hit);
    }
  }

  return snippets.slice(0, 12);
}

/**
 * Optional pgvector neighbours when embeddings exist.
 */
async function vectorSnippets(
  userId: string,
  question: string,
): Promise<CopilotSnippet[]> {
  let vector: number[] | undefined;
  try {
    const embedded = await embedTexts([question]);
    vector = embedded[0];
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      throw error;
    }
    return [];
  }
  if (!vector?.length) return [];

  const literal = `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
  const rows = await db
    .select({
      evidenceItemId: docChunks.evidenceItemId,
      chunkText: docChunks.chunkText,
    })
    .from(docChunks)
    .where(and(eq(docChunks.userId, userId), isNotNull(docChunks.embedding)))
    .orderBy(sql`${docChunks.embedding} <=> ${sql.raw(`'${literal}'::vector`)}`)
    .limit(5);

  return rows.map((row) => ({
    id: `chunk-${row.evidenceItemId}`,
    title: "Vault excerpt",
    text: row.chunkText.slice(0, 400),
  }));
}
