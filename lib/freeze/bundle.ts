/**
 * Purpose: Build the Freeze Shield ZIP: letter.pdf, index.csv, files, manifest.txt.
 * Inputs: PDF bytes, index rows, original file buffers with export names.
 * Outputs: ZIP buffer + per-file SHA-256 map. Call only after verifier + approve + preflight.
 */
import JSZip from "jszip";
import { sha256Of } from "@/lib/freeze/preflight";
import type { PackIndexItem } from "@/lib/freeze/schemas";

export type BundleFile = {
  /** Name inside the ZIP (matches index.csv). */
  exportName: string;
  bytes: Buffer;
};

export type BundleResult = {
  zipBytes: Buffer;
  hashes: Record<string, string>;
  manifest: string;
  indexCsv: string;
};

/**
 * Assemble the ZIP. Manifest hashes must equal sha256 of each embedded file.
 */
export async function buildResponseBundle(input: {
  letterPdf: Buffer;
  index: PackIndexItem[];
  files: BundleFile[];
}): Promise<BundleResult> {
  const zip = new JSZip();
  const hashes: Record<string, string> = {};

  zip.file("letter.pdf", input.letterPdf);
  hashes["letter.pdf"] = sha256Of(input.letterPdf);

  const indexCsv = toIndexCsv(input.index);
  zip.file("index.csv", indexCsv);
  hashes["index.csv"] = sha256Of(Buffer.from(indexCsv, "utf8"));

  for (const file of input.files) {
    zip.file(file.exportName, file.bytes);
    hashes[file.exportName] = sha256Of(file.bytes);
  }

  const manifest = Object.entries(hashes)
    .map(([name, hash]) => `${hash}  ${name}`)
    .join("\n");
  zip.file("manifest.txt", manifest);

  const zipBytes = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
  return { zipBytes, hashes, manifest, indexCsv };
}

/**
 * CSV index aligned with the letter's evidence index.
 */
export function toIndexCsv(index: PackIndexItem[]): string {
  const header = "status,request,file,type,sha256,added_at";
  const rows = index.map((item) =>
    [
      item.status,
      csvEscape(item.requestLabel),
      csvEscape(item.fileName ?? ""),
      csvEscape(item.type ?? ""),
      item.sha256 ?? "",
      item.addedAt ?? "",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
