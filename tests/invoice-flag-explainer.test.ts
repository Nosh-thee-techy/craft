/**
 * Purpose: F7 flag explainer — cannot add/remove flags; LLM only words them.
 */
import { describe, expect, it, vi } from "vitest";
import { explainInvoiceFlags } from "@/lib/ai/invoice-flag-explainer-core";
import type { InvoiceFlag } from "@/lib/readiness/invoice-check";

const flags: InvoiceFlag[] = [
  {
    code: "amount_spike",
    severity: "warn",
    reason: "First invoice is above 500.",
  },
  {
    code: "new_client_country",
    severity: "info",
    reason: "Client country US is new.",
  },
];

describe("explainInvoiceFlags", () => {
  it("returns one explanation per input flag without an LLM", async () => {
    const { flags: out, source } = await explainInvoiceFlags(flags);
    expect(source).toBe("deterministic");
    expect(out.map((f) => f.code)).toEqual(["amount_spike", "new_client_country"]);
    expect(out[0]?.sentence.length).toBeGreaterThan(10);
  });

  it("keeps the flag set even if the LLM invents an extra code", async () => {
    const llm = vi.fn().mockResolvedValue({
      explanations: [
        {
          code: "amount_spike",
          sentence: "Large first bill.",
          attachFirst: "Contract",
        },
        {
          code: "invented_flag",
          sentence: "Should be ignored",
          attachFirst: "Nothing",
        },
      ],
    });
    const { flags: out } = await explainInvoiceFlags(flags, llm);
    expect(out.map((f) => f.code)).toEqual(["amount_spike", "new_client_country"]);
    expect(out.some((f) => (f.code as string) === "invented_flag")).toBe(false);
  });

  it("falls back on LLM failure", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("down"));
    const { source, flags: out } = await explainInvoiceFlags(flags, llm);
    expect(source).toBe("deterministic");
    expect(out).toHaveLength(2);
  });
});
