/**
 * Purpose: Guard the hand-maintained Drizzle journal.
 * Inputs: drizzle/meta/_journal.json and the .sql files beside it.
 * Outputs: pass/fail.
 *
 * WHY: drizzle-kit snapshots stopped after 0000, so migrations are written by
 * hand and registered in the journal by hand. Drizzle's migrator silently
 * skips any SQL file the journal does not list, and skips any entry whose
 * `when` is not newer than the last one applied. These checks catch both.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type JournalEntry = { idx: number; when: number; tag: string };

const drizzleDir = resolve(process.cwd(), "drizzle");
const journal = JSON.parse(
  readFileSync(resolve(drizzleDir, "meta/_journal.json"), "utf8"),
) as { entries: JournalEntry[] };

describe("drizzle journal", () => {
  it("numbers entries 0, 1, 2, ... with no gaps", () => {
    expect(journal.entries.map((entry) => entry.idx)).toEqual(
      journal.entries.map((_, position) => position),
    );
  });

  it("has a SQL file for every entry", () => {
    const missing = journal.entries
      .filter((entry) => !existsSync(resolve(drizzleDir, `${entry.tag}.sql`)))
      .map((entry) => entry.tag);
    expect(missing).toEqual([]);
  });

  it("keeps `when` strictly increasing so the migrator applies every entry", () => {
    const stamps = journal.entries.map((entry) => entry.when);
    const sorted = [...stamps].sort((a, b) => a - b);
    expect(stamps).toEqual(sorted);
    expect(new Set(stamps).size).toBe(stamps.length);
  });

  it("registers the Phase 2 invoice-location migration last", () => {
    expect(journal.entries.at(-1)?.tag).toBe("0008_phase2_invoice_location");
  });

  it("has no orphan .sql files outside the journal", () => {
    const tags = new Set(journal.entries.map((entry) => entry.tag));
    const orphans = readdirSync(drizzleDir)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => name.replace(/\.sql$/, ""))
      .filter((tag) => !tags.has(tag));
    expect(orphans).toEqual([]);
  });
});
