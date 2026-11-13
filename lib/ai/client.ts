/**
 * Purpose: Single LLM wrapper (JSON-schema outputs, optional vision, embeddings).
 * Inputs: system/user prompts, a zod schema, optional images; LLM_* env.
 * Outputs: parsed JSON matching the schema, or an explicit not-configured error.
 *
 * Provider is swappable via LLM_BASE_URL (OpenAI-compatible). The LLM must
 * never calculate money or invent evidence.
 */
import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("Set LLM_API_KEY to enable the reader and auditor.");
    this.name = "LlmNotConfiguredError";
  }
}

type CompleteJsonInput<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  images?: { mimeType: string; base64: string }[];
  /** Abort after this many ms (Phase 2 F1 doc-reader default 20s). */
  timeoutMs?: number;
};

export class LlmTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms.`);
    this.name = "LlmTimeoutError";
  }
}

type ChatContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/**
 * Ask the configured model for JSON and validate it with zod.
 */
export async function completeJson<T>(input: CompleteJsonInput<T>): Promise<T> {
  const key = env.LLM_API_KEY;
  if (!key) {
    throw new LlmNotConfiguredError();
  }

  const model = env.LLM_MODEL ?? "gpt-4o-mini";
  const base = (env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  const userContent: ChatContent[] = [{ type: "text", text: input.user }];
  for (const image of input.images ?? []) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
    });
  }

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs;
  const timer =
    timeoutMs && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${input.system}\nReply with a JSON object only. Do not invent files, hashes, money, or events.`,
          },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch (error) {
    if (controller.signal.aborted && timeoutMs) {
      throw new LlmTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  const body: unknown = await response.json();
  const content = extractContent(body);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }
  return input.schema.parse(parsedJson);
}

/**
 * Embed texts with a 1536-dimension model so they fit `doc_chunks.embedding`.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = env.LLM_API_KEY;
  if (!key || texts.length === 0) {
    return [];
  }
  const base = (env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });
  if (!response.ok) {
    throw new Error(`Embedding request failed (${response.status}).`);
  }
  const body: unknown = await response.json();
  return extractEmbeddings(body);
}

/**
 * Pull the assistant text out of an OpenAI-style chat payload.
 */
function extractContent(body: unknown): string {
  const parsed = z
    .object({
      choices: z.array(z.object({ message: z.object({ content: z.string() }) })),
    })
    .parse(body);
  const content = parsed.choices[0]?.message.content;
  if (!content) {
    throw new Error("LLM returned an empty message.");
  }
  return content;
}

/**
 * Pull embedding vectors out of an OpenAI-style embeddings payload.
 */
function extractEmbeddings(body: unknown): number[][] {
  const parsed = z
    .object({
      data: z.array(z.object({ embedding: z.array(z.number()) })),
    })
    .parse(body);
  return parsed.data.map((row) => row.embedding);
}
