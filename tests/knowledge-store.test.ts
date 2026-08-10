import { describe, expect, it } from "vitest";
import { getPlaybook, knowledgeSummary, loadKnowledge, searchPlaybooks } from "../services/mcp-server/src/knowledge-store.js";

describe("Casio knowledge store", () => {
  const knowledge = loadKnowledge();

  it("loads the complete Casio model", () => {
    expect(knowledge.meta.برند).toBe("کاسیو پلاس");
    expect(knowledge.دارایی_ها.پلی_بوک_ها).toHaveLength(56);
  });

  it("returns an identified playbook", () => {
    const playbook = getPlaybook(knowledge, 53);
    expect(playbook?.نام_پلی_بوک).toContain("Casio Metric");
    expect(playbook?.مدل_داده).toBeDefined();
  });

  it("filters known gaps", () => {
    const gaps = searchPlaybooks(knowledge, { readiness: "لازم" });
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((item) => item.برچسب_داریم_لازم === "لازم")).toBe(true);
  });

  it("searches Persian domain data", () => {
    const results = searchPlaybooks(knowledge, { domain: "آموزش و کوچینگ" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.دامنه === "آموزش و کوچینگ")).toBe(true);
  });

  it("exposes internally consistent summary counts", () => {
    const summary = knowledgeSummary(knowledge);
    expect(summary.تعداد_کل_پلی_بوک).toBe(56);
    expect(summary.داریم + summary.لازم).toBe(summary.تعداد_کل_پلی_بوک);
  });
});
