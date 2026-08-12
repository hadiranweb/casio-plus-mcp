import { describe, expect, it } from "vitest";
import {
  DomainError,
  assertMutable,
  assertNextVersion,
  isTerminal,
  transition,
} from "./index.js";

describe("canonical lifecycle transitions", () => {
  it("permits declared process, island, run, evidence, feedback, knowledge, proposal, and asset transitions", () => {
    expect(transition("process", "draft", "review")).toBe("review");
    expect(transition("island", "validating", "active")).toBe("active");
    expect(transition("run", "running", "evaluating")).toBe("evaluating");
    expect(transition("evidence", "raw", "quarantined")).toBe("quarantined");
    expect(transition("feedback", "validated", "promoted")).toBe("promoted");
    expect(transition("knowledge", "review", "published")).toBe("published");
    expect(transition("versionProposal", "approved", "merged")).toBe("merged");
    expect(transition("asset", "review", "published")).toBe("published");
  });
  it("rejects invalid and terminal lifecycle transitions", () => {
    expect(() => transition("run", "completed", "running")).toThrow(
      DomainError,
    );
    expect(() => transition("island", "draft", "active")).toThrow(
      "invalid_island_transition",
    );
    expect(isTerminal("run", "completed")).toBe(true);
  });
  it("requires a new version instead of silently mutating published or active objects", () => {
    expect(() => assertMutable("published")).toThrow(
      "immutable_versioned_object",
    );
    expect(() => assertMutable("active")).toThrow("immutable_versioned_object");
    expect(() => assertNextVersion("1.0.0", "1.0.0")).toThrow(
      "new_version_required",
    );
    expect(() => assertNextVersion("1.0.0", "1.0.1")).not.toThrow();
  });
});
