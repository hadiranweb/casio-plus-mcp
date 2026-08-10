import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAssetFromTemplate, draftTitles, saveDraftAsset } from "../services/mcp-server/src/templates.js";
import { loadPlatformKernel } from "../services/mcp-server/src/platform-kernel.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("platform seed templates (vessels, not content)", () => {
  it("creates a draft playbook vessel with null owner and zero evidence", () => {
    const asset = createAssetFromTemplate("playbook", "پلی‌بوک فروش");
    expect(asset.type).toBe("playbook");
    expect(asset.status).toBe("draft");
    expect(asset.owner).toBeNull();
    expect(asset.source).toBe("field_discovery_required");
    expect(asset.evidence_count).toBe(0);
    expect(asset.readiness).toBe("needs_definition");
    expect(asset.return_path).toBeNull();
    // the vessel has structure, not fabricated answers
    expect(Array.isArray(asset.domains)).toBe(true);
    expect((asset.domains as unknown[]).length).toBe(0);
  });

  it("supports every declared primitive that has a template", () => {
    const kernel = loadPlatformKernel();
    const titles = draftTitles(kernel);
    for (const primitive of kernel.primitives) {
      if (titles[primitive]) {
        const asset = createAssetFromTemplate(primitive, "test");
        expect(asset.type).toBe(primitive);
        // automation_spec deliberately stays off until approved (per the model);
        // every other vessel starts as a plain draft
        expect(asset.status).toBe(primitive === "automation_spec" ? "disabled_until_approved" : "draft");
      }
    }
  });

  it("rejects unknown primitives and untemplated ones", () => {
    expect(() => createAssetFromTemplate("not-a-primitive", "x")).toThrow("unknown_primitive");
    const kernel = loadPlatformKernel();
    // feedback_intake and version_proposal are records, not draftable assets
    expect(() => createAssetFromTemplate("feedback_intake", "x", { kernel })).toThrow("no_template_for_primitive");
  });

  it("applies overrides (e.g. an owner when a human claims it)", () => {
    const asset = createAssetFromTemplate("decision", "تصمیم ورود به بازار", {
      overrides: { owner: "مدیر فروش", source: "field_observation", evidence_count: 2, readiness: "templates_only" },
    });
    expect(asset.owner).toBe("مدیر فروش");
    expect(asset.evidence_count).toBe(2);
  });

  it("persists drafts to the workspace data dir", () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-drafts-"));
    dirs.push(d);
    const asset = createAssetFromTemplate("playbook", "پلی‌بوک عملیات");
    const file = saveDraftAsset(asset, d);
    expect(fs.existsSync(file)).toBe(true);
    expect(file).toContain("drafts");
    expect(fs.readFileSync(file, "utf8")).toContain("status: draft");
  });
});
