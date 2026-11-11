/**
 * Purpose: Apply Drizzle SQL migrations using postgres.js.
 * Inputs: DATABASE_URL (from the environment or .env.local).
 * Outputs: schema tables on Postgres; records rows in drizzle.__drizzle_migrations.
 *
 * WHY not drizzle-kit migrate: that CLI hung with no error on Windows. This
 * script is what Render should run on boot as well.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Load KEY=value pairs from a dotenv file without overriding existing env.
 */
function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const isLocal =
  url.includes("localhost") ||
  url.includes("127.0.0.1") ||
  url.includes(".internal") ||
  /[?&]sslmode=disable\b/i.test(url);
const sql = postgres(url, { max: 1, ssl: isLocal ? false : "require" });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./drizzle" });
await sql.end();
console.log("Migrations applied.");
