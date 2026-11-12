/**
 * Purpose: Unit tests for pathname → Rehema guide cue mapping.
 * Inputs: sample paths (no UI).
 * Outputs: pass/fail for the right room copy.
 */
import { describe, expect, it } from "vitest";
import { guideForPath } from "@/lib/guide/cues";

describe("guideForPath", () => {
  it("maps Layer 1 and money rooms", () => {
    expect(guideForPath("/dashboard").cue).toBe("dashboard");
    expect(guideForPath("/projects").cue).toBe("projects");
    expect(guideForPath("/projects/abc").cue).toBe("project-detail");
    expect(guideForPath("/money").cue).toBe("money");
    expect(guideForPath("/t/amina-studio").cue).toBe("trust-public");
  });

  it("keeps front-door pages soft", () => {
    expect(guideForPath("/").soft).toBe(true);
    expect(guideForPath("/login").soft).toBe(true);
    expect(guideForPath("/onboarding").soft).toBe(true);
  });
});
