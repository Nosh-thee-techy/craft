/**
 * Purpose: Shared Drizzle + postgres.js client.
 * Inputs: `env.DATABASE_URL`.
 * Outputs: `db` for typed queries and `sql` for raw SQL (health checks, extensions).
 *
 * WHY ssl on non-local hosts: Fly/Render hosted Postgres requires TLS.
 * Local docker-compose does not.
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * Decide whether the connection string points at a local Postgres.
 */
function isLocalDatabase(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

const sql = postgres(env.DATABASE_URL, {
  max: 10,
  ssl: isLocalDatabase(env.DATABASE_URL) ? false : "require",
});

export const db = drizzle(sql, { schema });
export { sql };
