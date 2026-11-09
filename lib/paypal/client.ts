/**
 * Purpose: PayPal REST OAuth token (cached) and a thin JSON fetch helper.
 * Inputs: sandbox client id/secret from `lib/env.ts`.
 * Outputs: a bearer token and `paypalFetch` for invoicing + webhook verify.
 *
 * Confirmed 2026-11-09 against PayPal docs:
 * - Token: POST https://api-m.sandbox.paypal.com/v1/oauth2/token
 *   (grant_type=client_credentials, Basic auth).
 * - CRAFT is sandbox-only; live hosts are rejected.
 */
import "server-only";
import { env } from "@/lib/env";

/** Current merchant REST host for sandbox. Live is never used. */
export const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

/**
 * Docs for verify-webhook-signature still show `https://api.sandbox.paypal.com`
 * (no `-m`). The `-m` host is the current REST host used by invoicing; we call
 * verify on the same host. If PayPal ever 404s this path, try the non-`-m` URL.
 */
export const PAYPAL_VERIFY_PATH = "/v1/notifications/verify-webhook-signature";

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

export class PayPalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "PayPalApiError";
  }
}

/**
 * Read sandbox credentials or throw a user-facing error.
 */
export function requirePayPalCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  if (env.PAYPAL_ENV !== "sandbox") {
    throw new Error("CRAFT is sandbox-only. Set PAYPAL_ENV=sandbox.");
  }
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal sandbox credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}

/**
 * Fetch (and cache) a client-credentials access token.
 * WHY cache: token calls are slow and rate-limited; expires_in is typically 9 hours.
 * We refresh 60s early so a concurrent invoice send never uses a stale token.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret } = requirePayPalCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PayPalApiError("PayPal OAuth token request failed.", response.status, body);
  }

  const parsed = body as { access_token?: unknown; expires_in?: unknown };
  if (typeof parsed.access_token !== "string") {
    throw new PayPalApiError("PayPal OAuth response missing access_token.", response.status, body);
  }

  const expiresInSec = typeof parsed.expires_in === "number" ? parsed.expires_in : 300;
  cachedToken = {
    accessToken: parsed.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return cachedToken.accessToken;
}

type PaypalFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  paypalRequestId?: string;
  /**
   * When true, `body` is sent as already-serialized JSON (webhook verify).
   * WHY: PayPal signature postback is picky about the nested event bytes.
   */
  rawJsonBody?: string;
};

/**
 * Call a PayPal REST path with a bearer token. Returns parsed JSON, or null on 204.
 */
export async function paypalFetch<T>(path: string, options: PaypalFetchOptions = {}): Promise<T> {
  const token = await getPayPalAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (options.paypalRequestId) {
    headers["PayPal-Request-Id"] = options.paypalRequestId;
  }

  const response = await fetch(`${PAYPAL_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.rawJsonBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });

  if (response.status === 204) {
    return null as T;
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PayPalApiError(
      `PayPal request failed: ${options.method ?? "GET"} ${path}`,
      response.status,
      body,
    );
  }
  return body as T;
}

/**
 * Turn a PayPal error body into a short message, including the Kenya invoicing limitation.
 */
export function paypalErrorMessage(error: unknown): string {
  if (error instanceof PayPalApiError) {
    const name = extractPayPalIssue(error.body);
    if (error.status === 403 || name.includes("NOT_AUTHORIZED") || name.includes("PERMISSION")) {
      return [
        "PayPal refused invoicing for this sandbox app.",
        "Kenya-based accounts often cannot create invoices.",
        "Workaround: use a US sandbox Business app as the merchant (client id/secret),",
        "and pay with a sandbox Personal buyer.",
        name ? `PayPal said: ${name}` : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
    return name || `PayPal API error (${error.status}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "PayPal request failed.";
}

/**
 * Pull issue/name/message fields out of PayPal's error JSON.
 */
function extractPayPalIssue(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string") {
    return record.message;
  }
  if (typeof record.name === "string") {
    return record.name;
  }
  if (Array.isArray(record.details) && record.details[0] && typeof record.details[0] === "object") {
    const detail = record.details[0] as Record<string, unknown>;
    const issue = typeof detail.issue === "string" ? detail.issue : "";
    const description = typeof detail.description === "string" ? detail.description : "";
    return [issue, description].filter(Boolean).join(" — ");
  }
  return "";
}
