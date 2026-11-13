/**
 * Purpose: Preflight + ZIP manifest for Freeze Shield upgrades (Phase 2 E).
 * Inputs: pure preflight/bundle helpers with in-memory buffers.
 * Outputs: oversized file blocks; manifest hashes match file bytes.
 */
import { describe, expect, it } from "vitest";
import { buildResponseBundle } from "@/lib/freeze/bundle";
import { runPreflight, sha256Of } from "@/lib/freeze/preflight";
import { daysUntilDeadline, deadlineReminderDue } from "@/lib/freeze/deadline";
import { gapListFromMapping } from "@/lib/freeze/gaps";
import type { EvidenceMapping } from "@/lib/freeze/schemas";

describe("runPreflight", () => {
  it("blocks an oversized file", () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const result = runPreflight(
      [
        {
          evidenceId: "00000000-0000-4000-8000-000000000001",
          fileName: "bill.pdf",
          mimeType: "application/pdf",
          bytes: big,
          type: "address_proof",
          docDate: new Date("2026-10-01"),
          holderName: "Amina Otieno",
        },
      ],
      "Amina Otieno",
      new Date("2026-11-13"),
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "size")).toBe(true);
  });

  it("blocks a 100-day-old address proof", () => {
    const result = runPreflight(
      [
        {
          evidenceId: "00000000-0000-4000-8000-000000000002",
          fileName: "kplc.pdf",
          mimeType: "application/pdf",
          bytes: Buffer.from("%PDF-1.4"),
          type: "address_proof",
          docDate: new Date("2026-08-05"),
          holderName: "Amina Otieno",
        },
      ],
      "Amina Otieno",
      new Date("2026-11-13"),
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "age")).toBe(true);
  });
});

describe("buildResponseBundle", () => {
  it("writes a manifest whose hashes equal the embedded files", async () => {
    const letterPdf = Buffer.from("%PDF-letter");
    const original = Buffer.from("invoice-bytes");
    const bundle = await buildResponseBundle({
      letterPdf,
      index: [
        {
          requestLabel: "Invoice",
          status: "covered",
          evidenceId: "00000000-0000-4000-8000-000000000003",
          fileName: "01-invoice.pdf",
          sha256: sha256Of(original),
          addedAt: "2026-11-01T00:00:00.000Z",
          type: "invoice",
        },
      ],
      files: [{ exportName: "01-invoice.pdf", bytes: original }],
    });

    expect(bundle.hashes["letter.pdf"]).toBe(sha256Of(letterPdf));
    expect(bundle.hashes["01-invoice.pdf"]).toBe(sha256Of(original));
    expect(bundle.manifest).toContain(bundle.hashes["letter.pdf"]);
    expect(bundle.manifest).toContain("01-invoice.pdf");
    expect(bundle.zipBytes.byteLength).toBeGreaterThan(32);
  });
});

describe("deadline tracker", () => {
  it("counts days left and fires 3-day / 1-day reminders", () => {
    const today = new Date("2026-11-10T12:00:00.000Z");
    expect(daysUntilDeadline(new Date("2026-11-13T00:00:00.000Z"), today)).toBe(3);
    expect(deadlineReminderDue(new Date("2026-11-13T00:00:00.000Z"), today).kind).toBe("3d");
    expect(deadlineReminderDue(new Date("2026-11-11T00:00:00.000Z"), today).kind).toBe("1d");
  });
});

describe("gapListFromMapping", () => {
  it("lists missing account-level asks with reported wording", () => {
    const mapping: EvidenceMapping = {
      covered: [],
      missing: [
        {
          request: {
            id: "1",
            label: "Utility bill",
            documentType: "address_proof",
            keywords: ["utility"],
          },
          reason: "No uploaded address proof.",
        },
      ],
    };
    const gaps = gapListFromMapping(mapping);
    expect(gaps[0]).toMatch(/reportedly asks/i);
  });
});
