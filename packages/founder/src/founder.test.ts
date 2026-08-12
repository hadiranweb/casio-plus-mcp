import { describe, expect, it } from "vitest";
import { buildDraft, FakeStructuredLlm, transitionSps } from "./index.js";
describe("Founder SPS", () => {
  it("preserves the raw statement as input to a validated draft", async () => {
    const draft = await buildDraft(
      "Reduce support delays",
      new FakeStructuredLlm(),
    );
    expect(draft.objective).toContain("Reduce support delays");
    expect(draft.evidence).toEqual([]);
    expect(draft.unknowns.length).toBeGreaterThan(0);
  });
  it("requires confirmation evidence before completion", () => {
    expect(() => transitionSps("validating", "completed")).toThrow(
      "sps_completion_requires_confirmed_specification",
    );
    expect(transitionSps("validating", "completed", true)).toBe("completed");
  });
});
