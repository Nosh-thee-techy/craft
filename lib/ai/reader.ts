/**
 * Purpose: Read an uploaded vault file into text + structured fields.
 * Inputs: evidence id, bytes, mime type. Only what the user uploaded.
 * Outputs: extracted_text / extracted_json on the row. Never creates evidence.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { completeJson, LlmNotConfiguredError } from "@/lib/ai/client";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { evidenceItems } from "@/lib/db/schema";
import { replaceChunks } from "@/lib/evidence/chunk";

const extractionSchema = z.object({
  summary: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type Extraction = z.infer<typeof extractionSchema>;

/**
 * Extract text locally, then optionally ask the LLM to organise fields.
 */
export async function readEvidenceFile(
  userId: string,
  evidenceId: string,
  bytes: Buffer,
  mimeType: string,
): Promise<void> {
  const localText = localTextExtract(bytes, mimeType);
  let extraction: Extraction = {
    summary: localText.slice(0, 800) || "File stored. No text could be read locally.",
    fields: [],
  };

  try {
    extraction = await completeJson({
      system:
        "You organise evidence the user already uploaded. Quote only what is on the page. If a field is not present, omit it. Never invent dates, amounts, names, or files.",
      user: `Mime: ${mimeType}\nLocal text (may be empty for images):\n${localText.slice(0, 8000)}`,
      schema: extractionSchema,
      images: mimeType.startsWith("image/")
        ? [{ mimeType, base64: bytes.toString("base64") }]
        : undefined,
    });
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      await logAgentAction({
        userId,
        action: "evidence.reader",
        input: { evidenceId, mimeType },
        output: { error: error instanceof Error ? error.message : "reader failed" },
        verifierPassed: false,
      });
      throw error;
    }
  }

  const extractedText = [extraction.summary, localText].filter(Boolean).join("\n\n");
  await db
    .update(evidenceItems)
    .set({
      extractedText,
      extractedJson: extraction,
      updatedAt: new Date(),
    })
    .where(eq(evidenceItems.id, evidenceId));

  await replaceChunks(userId, evidenceId, extractedText);
  await logAgentAction({
    userId,
    action: "evidence.reader",
    input: { evidenceId, mimeType },
    output: { summary: extraction.summary, fieldCount: extraction.fields.length },
  });
}

/**
 * UTF-8 extract for text-like files. Images and PDFs wait for vision / later parsers.
 */
function localTextExtract(bytes: Buffer, mimeType: string): string {
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "text/markdown" ||
    mimeType === "text/csv"
  ) {
    return bytes.toString("utf8");
  }
  return "";
}
