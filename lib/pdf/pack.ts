/**
 * Purpose: Build the Freeze Shield PDF from verified letter + vault index.
 * Inputs: cover letter, index, evidence cites with hashes and timestamps, verifier report.
 * Outputs: PDF bytes. Callers must not export until verifier + user approval.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PackDraft, ParsedNotice, VerifierReport } from "@/lib/freeze/schemas";

export type PackPdfInput = {
  studioName: string;
  notice: ParsedNotice;
  draft: PackDraft;
  report: VerifierReport;
};

/**
 * Render a simple readable pack: letter, index, hashes, verifier outcome.
 */
export async function buildPackPdf(input: PackPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const pageSize: [number, number] = [612, 792];
  let page = doc.addPage(pageSize);
  let y = 750;
  const left = 54;
  const width = 504;
  const gold = rgb(0.55, 0.38, 0.12);

  const write = (text: string, size: number, font = regular, color = rgb(0.12, 0.1, 0.08)) => {
    const lines = wrap(text, font, size, width);
    for (const line of lines) {
      if (y < 64) {
        page = doc.addPage(pageSize);
        y = 750;
      }
      page.drawText(line, { x: left, y, size, font, color });
      y -= size + 6;
    }
  };

  write("CRAFT Freeze Shield pack", 18, bold, gold);
  write(`Studio: ${input.studioName}`, 11);
  write(
    `Notice tone: ${input.notice.tone}${input.notice.deadline ? ` · deadline ${input.notice.deadline}` : ""}`,
    11,
  );
  write(
    input.report.passed
      ? "Verifier: every claim matched uploaded source text."
      : "Verifier: blocked. This pack must not be sent.",
    11,
    bold,
  );
  y -= 10;

  write("Cover letter", 14, bold, gold);
  write(input.draft.letter, 11);
  y -= 12;

  write("Evidence index", 14, bold, gold);
  if (input.draft.index.length === 0) {
    write("No vault items were cited.", 11);
  }
  for (const item of input.draft.index) {
    const hash = item.sha256 ?? "—";
    const when = item.addedAt ?? "—";
    write(
      `${item.status === "covered" ? "COVERED" : "MISSING"} · ${item.requestLabel} · ${item.fileName ?? "no file"} · ${item.type ?? "—"} · SHA-256 ${hash} · stored ${when}`,
      10,
    );
  }
  y -= 12;

  write("Verifier report", 14, bold, gold);
  for (const claim of input.report.claims) {
    write(`${claim.passed ? "PASS" : "FAIL"} · ${claim.claim}`, 10);
    write(`Reason: ${claim.reason}`, 9);
  }

  y -= 16;
  write(
    "Hashes and timestamps were computed in code. The AI did not create, alter, or invent these files.",
    9,
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * Greedy wrap using font width. pdf-lib has no built-in paragraph helper.
 */
function wrap(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) {
      lines.push(current);
    }
  }
  return lines;
}
