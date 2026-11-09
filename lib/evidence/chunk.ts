/**
 * Purpose: Split extracted evidence text and store pgvector embeddings.
 * Inputs: user id, evidence id, full extracted text.
 * Outputs: rows in `doc_chunks`. No embedding when LLM_API_KEY is unset.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { docChunks } from "@/lib/db/schema";
import { embedTexts, LlmNotConfiguredError } from "@/lib/ai/client";

const CHUNK_CHARS = 1800;
const CHUNK_OVERLAP = 200;

/**
 * Replace chunks for one evidence item.
 */
export async function replaceChunks(
  userId: string,
  evidenceItemId: string,
  text: string,
): Promise<number> {
  await db.delete(docChunks).where(eq(docChunks.evidenceItemId, evidenceItemId));
  const pieces = splitText(text);
  if (pieces.length === 0) {
    return 0;
  }

  let vectors: number[][] = [];
  try {
    vectors = await embedTexts(pieces);
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      throw error;
    }
  }

  await db.insert(docChunks).values(
    pieces.map((chunkText, index) => ({
      userId,
      evidenceItemId,
      chunkText,
      embedding: vectors[index] ?? null,
    })),
  );
  return pieces.length;
}

/**
 * Overlapping character windows. Deterministic; not an LLM.
 */
function splitText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const end = Math.min(start + CHUNK_CHARS, trimmed.length);
    chunks.push(trimmed.slice(start, end));
    if (end === trimmed.length) {
      break;
    }
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}
