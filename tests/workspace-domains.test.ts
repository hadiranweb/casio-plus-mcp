import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assignOwner, bootstrapWorkspace, defineDomain, loadWorkspace } from "../src/workspace.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-domains-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
  return d;
}

describe("workspace domains — Level 0 bootstrap", () => {
  it("defines a domain with needs_definition status", () => {
    const d = setup();
    const manifest = defineDomain("acme", { domain_id: "sales", domain_name: "فروش و بازاریابی" }, d);
    expect(manifest.domains).toHaveLength(1);
    expect(manifest.domains[0].domain_id).toBe("sales");
    expect(manifest.domains[0].domain_name).toBe("فروش و بازاریابی");
    expect(manifest.domains[0].status).toBe("needs_definition");
    expect(manifest.domains[0].owner_id).toBe("needs_assignment");
  });

  it("assigns owner to a domain", () => {
    const d = setup();
    defineDomain("acme", { domain_id: "education", domain_name: "آموزش و کوچینگ" }, d);
    const manifest = assignOwner("acme", "education", "coaching_lead", d);
    expect(manifest.domains[0].owner_id).toBe("coaching_lead");
  });

  it("rejects duplicate domain and unknown domain owner assignment", () => {
    const d = setup();
    defineDomain("acme", { domain_id: "sales", domain_name: "فروش" }, d);
    expect(() => defineDomain("acme", { domain_id: "sales", domain_name: "فروش دوباره" }, d)).toThrow("domain_already_exists");
    expect(() => assignOwner("acme", "unknown_domain", "owner", d)).toThrow("domain_not_found");
  });

  it("persists manifest and is readable via loadWorkspace", () => {
    const d = setup();
    defineDomain("acme", { domain_id: "ops", domain_name: "عملیات", owner_id: "ops_lead", status: "field_discovery_required" }, d);
    const ws = loadWorkspace("acme", d);
    expect(ws.manifest?.domains[0].domain_id).toBe("ops");
    expect(ws.manifest?.domains[0].owner_id).toBe("ops_lead");
    expect(ws.manifest?.workspace_manifest_version).toBe("0.1.0");
  });
});
