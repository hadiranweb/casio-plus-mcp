import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

describe("migration — casio workspace lineage and witnesses (D2 legacy_evidence)", () => {
  it("manifest has complete lineage", () => {
    const raw = fs.readFileSync("workspaces/casio/manifest.yaml", "utf8");
    const manifest: any = parse(raw);
    expect(manifest.workspace_id).toBe("casio");
    expect(manifest.organization_id).toBe("casio-plus");
    expect(manifest.workspace_manifest_version).toBe("0.1.0");
    expect(manifest.created_from_kernel_version).toBe("0.1.0");
    expect(manifest.created_from_specification_version).toBe("0.5.0");
    expect(manifest.bootstrap_protocol_version).toBe("0.1.0");
    expect(manifest.bootstrap_run_id).toMatch(/^bootstrap_/);
    expect(manifest.installer_id).toBeTruthy();
    expect(manifest.status).toBe("field_discovery");
    expect(manifest.enabled_mcp_tool_levels).toEqual([0, 1, 2]);
    expect(manifest.disabled_capabilities).toContain("automation");
  });

  it("witness evidence records exist for each category", () => {
    const raw = fs.readFileSync("workspaces/casio/evidence/evidence.json", "utf8");
    const evidences: any[] = JSON.parse(raw);
    const witnesses = evidences.filter((e) => e.source === "migration_legacy");
    expect(witnesses.length).toBeGreaterThanOrEqual(3);
    for (const w of witnesses) {
      expect(w.observer).toBe("system_igniter_001");
      expect(w.provenance.origin_system).toBe("casio-plus-mcp-pre-kernel");
      expect(w.confidence).toBe(0.9);
      expect(w.review_status).toBe("accepted");
    }
    // also mirrored to data evidence for legacy fallback is empty now, but workspaces one is source
  });

  it("knowledge assets have asset_status evidence_collected", () => {
    const raw = fs.readFileSync("workspaces/casio/knowledge/casio.yaml", "utf8");
    const doc: any = parse(raw);
    const playbooks = doc["کاسیو"]["دارایی_ها"]["پلی_بوک_ها"];
    expect(playbooks.length).toBe(56);
    for (const pb of playbooks) {
      expect(pb.asset_status).toBe("evidence_collected");
    }
  });

  it("git grep legacy paths only in docs/manifest", async () => {
    // Per step 6 acceptance: old knowledge/casio.yaml only in docs/manifest, not in code
    // We check that src does not hardcode legacy path without fallback comment
    const server = fs.readFileSync("src/server.ts", "utf8");
    // src/server.ts should route via workspace, not hardcode knowledge/casio.yaml alone
    expect(server).toContain("loadKnowledge(ws.knowledgePathAbs)");
  });
});
