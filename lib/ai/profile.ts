/**
 * Purpose: Draft a creative profile from verified link ownership data only.
 * Inputs: user name/craft plus verified publicData blobs.
 * Outputs: summary, services, timeline. User must edit and approve.
 *
 * Never infers sensitive attributes. Never invents clients or money.
 */
import "server-only";
import { completeJson, LlmNotConfiguredError } from "@/lib/ai/client";
import { logAgentAction } from "@/lib/ai/log";
import { profileDraftSchema, type ProfileDraft } from "@/lib/onboarding/schemas";

type DraftInput = {
  userId: string;
  name: string | null;
  craft: string | null;
  verifiedLinks: {
    platform: string;
    handle: string;
    url: string;
    publicData: Record<string, unknown> | null;
  }[];
};

/**
 * Build a draft the creative can edit. Heuristic fallback when no LLM key.
 */
export async function draftProfileFromVerifiedLinks(input: DraftInput): Promise<ProfileDraft> {
  const heuristic = heuristicDraft(input);
  let draft = heuristic;

  try {
    draft = await completeJson({
      system:
        'You draft a short public studio profile for a Kenyan creative. Use only the verified link ownership data provided. Do not invent clients, income, awards, or private facts. Do not infer religion, politics, health, or identity documents. Prefer the wording "verified link ownership".',
      user: JSON.stringify(
        {
          name: input.name,
          craft: input.craft,
          verifiedLinks: input.verifiedLinks,
        },
        null,
        2,
      ),
      schema: profileDraftSchema,
    });
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      await logAgentAction({
        userId: input.userId,
        action: "onboarding.profile_draft",
        input: { linkCount: input.verifiedLinks.length },
        output: { error: error instanceof Error ? error.message : "draft failed" },
        verifierPassed: false,
      });
    }
    draft = heuristic;
  }

  await logAgentAction({
    userId: input.userId,
    action: "onboarding.profile_draft",
    input: { linkCount: input.verifiedLinks.length },
    output: draft,
  });

  return draft;
}

/**
 * Plain draft when the LLM is offline — still only uses verified handles.
 */
function heuristicDraft(input: DraftInput): ProfileDraft {
  const craft = input.craft || "creative work";
  const handles = input.verifiedLinks.map((link) => `${link.platform}:${link.handle}`);
  return {
    summary: `${input.name ?? "This studio"} makes ${craft}. Profile built from verified link ownership${
      handles.length ? ` (${handles.join(", ")})` : ""
    }.`,
    services: [craft, "Client projects", "PayPal invoicing via CRAFT"].slice(0, 3),
    timeline: handles.length
      ? handles.map((handle) => `Connected ${handle}`)
      : ["Add a verified link to build a timeline."],
  };
}
