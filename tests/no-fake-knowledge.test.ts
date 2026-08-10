import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("no-fake-knowledge — starter-pack has no fake content", () => {
  it("starter-pack contains only structural fields, no fake content defaults", () => {
    const raw = fs.readFileSync("core/bootstrap/starter-pack.yaml", "utf8");
    const pack: any = parse(raw);
    expect(pack.templates.length).toBeGreaterThan(0);
    for (const tmpl of pack.templates) {
      expect(tmpl.type).toBeTruthy();
      // No template should have fake content like example filled rows or lorem ipsum
      const json = JSON.stringify(tmpl);
      expect(json).not.toContain("لورم");
      expect(json).not.toContain("fake");
      expect(json).not.toContain("نمونه ساختگی");
      // fields should be empty structures only
      if (tmpl.fields) {
        // rows/columns should be empty arrays where present
        if (Array.isArray(tmpl.fields.rows)) expect(tmpl.fields.rows.length).toBe(0);
        if (Array.isArray(tmpl.fields.columns)) expect(tmpl.fields.columns.length).toBe(0);
      }
    }
  });

  it("core has no organizational fake knowledge (brand content)", () => {
    // Core should not contain brand-specific knowledge content like "کاسیو پلاس" as data
    // Example slugs like "casio" as identifier are allowed, but not content
    const files = [
      "core/constitution/principles.yaml",
      "core/constitution/governance.yaml",
      "core/policies/data-quality.yaml",
    ];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      // Should not contain brand content as knowledge, but slug examples are ok
      expect(text).not.toContain("کاسیو پلاس");
      expect(text.toLowerCase()).not.toContain("alex");
      // Starter-pack already checked above; governance may have example but not content
    }
  });
});
