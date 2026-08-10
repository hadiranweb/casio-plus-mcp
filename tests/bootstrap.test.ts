import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapWorkspace, getWorkspace } from "../src/workspace.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-bootstrap-idem-"));
  dirs.push(d);
  process.env.CASIO_WORKSPACES_DIR = d;
  process.env.CASIO_WORKSPACES_DATA_DIR = path.join(d, "data");
  return d;
}

describe("bootstrap idempotency — create_workspace", () => {
  it("creates workspace and second call with same id fails but manifest remains (idempotent failure)", () => {
    const d = setup();
    const ws1 = bootstrapWorkspace({ id: "sandbox", displayName: "Sandbox" }, d);
    expect(ws1.config.id).toBe("sandbox");
    expect(fs.existsSync(path.join(d, "sandbox", "manifest.yaml"))).toBe(true);

    expect(() => bootstrapWorkspace({ id: "sandbox", displayName: "Again" }, d)).toThrow("workspace_already_exists");
    // manifest still valid and single
    const ws2 = getWorkspace("sandbox", d);
    expect(ws2?.config.displayName).toBe("Sandbox");
    expect(ws2?.manifest?.workspace_id).toBe("sandbox");
  });

  it("bootstrap creates guided empty structure with no fake knowledge", () => {
    const d = setup();
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, d);
    // manifest has no fake domains
    expect(ws.manifest?.domains.length).toBe(0);
    // knowledge vessel is empty guided
    const vessel = fs.readFileSync(ws.knowledgePathAbs, "utf8");
    expect(vessel).toContain("needs_definition");
    expect(vessel).not.toContain("پلی‌بوک ساختگی");
    // data dirs exist but evidence 0
    expect(fs.existsSync(path.join(d, "acme", "knowledge"))).toBe(true);
    expect(fs.existsSync(path.join(d, "acme", "evidence"))).toBe(true);
  });
});
