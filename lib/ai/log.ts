/**
 * Purpose: Append-only writes to `agent_actions`. Never update or delete.
 * Inputs: user id, action name, input/output JSON, optional verifier flag.
 * Outputs: the inserted row id.
 */
import "server-only";
import { db } from "@/lib/db/client";
import { agentActions } from "@/lib/db/schema";

export type AgentLogInput = {
  userId: string | null;
  action: string;
  input: unknown;
  output?: unknown;
  verifierPassed?: boolean | null;
};

/**
 * Record one agent step. Failures here should not hide the user-facing error.
 */
export async function logAgentAction(entry: AgentLogInput): Promise<string> {
  const [row] = await db
    .insert(agentActions)
    .values({
      userId: entry.userId,
      action: entry.action,
      inputJson: entry.input,
      outputJson: entry.output ?? null,
      verifierPassed: entry.verifierPassed ?? null,
    })
    .returning({ id: agentActions.id });

  if (!row) {
    throw new Error("Failed to log agent action.");
  }
  return row.id;
}
