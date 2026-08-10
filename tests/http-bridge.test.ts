import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "../services/mcp-server/src/workspace.js";
import { loadKernelVersion } from "../services/mcp-server/src/platform-kernel.js";

// The HTTP bridge is exercised via its compiled server on an ephemeral port.
// We import the module lazily inside a child spawn to avoid double-listen on
// the default port; here we instead start a raw server that mimics the route
// table by importing the same helpers. The critical contract is the route
// table + workspace-aware behavior, which we assert through the real module.

const dirs: string[] = [];
let baseDir: string;
let dataDir: string;

beforeAll(() => {
  baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "casio-bridge-"));
  dataDir = path.join(baseDir, "data");
  dirs.push(baseDir);
  process.env.CASIO_WORKSPACES_DIR = baseDir;
  process.env.CASIO_WORKSPACES_DATA_DIR = dataDir;
});

afterEach(() => {
  delete process.env.CASIO_HTTP_PORT;
});

afterAll(() => {
  delete process.env.CASIO_WORKSPACES_DIR;
  delete process.env.CASIO_WORKSPACES_DATA_DIR;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("HTTP bridge route table (workspace-aware)", () => {
  it("bootstraps a workspace with the manifest and knows kernel version", async () => {
    const ws = bootstrapWorkspace({ id: "acme", displayName: "Acme" }, baseDir);
    expect(ws.config.displayName).toBe("Acme");
    const version = loadKernelVersion();
    expect(version.kernel_version).toBe("0.1.0");
    // the route contract: GET /api/workspaces lists it
    // (exercised through the real server in the smoke test below)
    expect(fs.existsSync(path.join(baseDir, "acme", "manifest.yaml"))).toBe(true);
  });

  it("captures evidence into the workspace store path used by the bridge", async () => {
    const { captureEvidence } = await import("../services/mcp-server/src/evidence-store.js");
    const ws = bootstrapWorkspace({ id: "beta", displayName: "Beta" }, baseDir);
    const record = captureEvidence(ws, {
      observer: "tester",
      summary: "مشاهده واقعی درباره فرایند فروش و پیگیری مشتری",
      related_domain: "sales",
    });
    expect(record.evidence_id).toMatch(/^evd_/);
    expect(fs.existsSync(path.join(dataDir, "beta", "evidence", "evidence.json"))).toBe(true);
  });

  it("exposes the bridge's server module and route helpers", async () => {
    // The bridge is startable on an ephemeral port; we only assert the module
    // loads without error (its createServer is exercised by the live smoke).
    const mod = await import("../services/mcp-server/src/http.js");
    expect(typeof mod).toBe("object");
  });
});

describe("live HTTP bridge smoke (ephemeral port)", () => {
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    // Import the bridge module (it exports `server` after starting on the
    // configured port) and start it on an ephemeral port.
    const mod = await import("../services/mcp-server/src/http.js");
    const { server: srv } = mod as { server: http.Server };
    await new Promise<void>((resolve) => srv.once("listening", () => resolve()));
    server = srv;
    const address = server.address() as { port: number };
    base = `http://127.0.0.1:${address.port}`;
  }, 15000);

  afterAll(() => {
    if (server && typeof server.close === "function") server.close();
  });

  async function get(p: string): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${base}${p}`);
    return { status: res.status, body: await res.json().catch(() => null) };
  }
  async function post(p: string, body: unknown): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${base}${p}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  it("GET /api/health reports element-ecosystem + kernel version", async () => {
    const { status, body } = await get("/api/health");
    expect(status).toBe(200);
    expect((body as { service: string }).service).toBe("element-ecosystem");
    expect((body as { kernelVersion: string }).kernelVersion).toBe("0.1.0");
  });

  it("GET /api/workspaces lists the bootstrapped workspace", async () => {
    const { status, body } = await get("/api/workspaces");
    expect(status).toBe(200);
    const list = (body as { workspaces: { id: string; displayName: string }[] }).workspaces;
    expect(list.map((w) => w.id)).toContain("acme");
    expect(list.find((w) => w.id === "acme")?.displayName).toBe("Acme");
  });

  it("GET /api/workspaces/:id/readiness returns summary with tool levels", async () => {
    const { status, body } = await get("/api/workspaces/acme/readiness");
    expect(status).toBe(200);
    const summary = body as { id: string; enabledToolLevels: number[]; readiness: string };
    expect(summary.id).toBe("acme");
    expect(summary.enabledToolLevels).toEqual([0, 1, 2, 3, 4]);
    expect(summary.readiness).toBe("bootstrap");
  });

  it("POST /api/workspaces/:id/capture writes evidence; GET evidence returns it", async () => {
    const { status, body } = await post("/api/workspaces/acme/capture", {
      observer: "operator",
      summary: "مشاهده از طریق پل HTTP درباره فرایند فروش و پیگیری",
      relatedDomain: "sales",
    });
    expect(status).toBe(200);
    const ev = (body as { evidence: { evidence_id: string } }).evidence;
    expect(ev.evidence_id).toMatch(/^evd_/);

    const list = await get("/api/workspaces/acme/evidence");
    expect((list.body as { count: number }).count).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/workspaces/:id/domains + /owners shape the workspace", async () => {
    await post("/api/workspaces/acme/domains", { domainId: "sales", domainName: "فروش" });
    await post("/api/workspaces/acme/owners", { ownerId: "sales_lead", domainId: "sales" });
    const { body } = await get("/api/workspaces/acme/readiness");
    const domains = (body as { domains: { id: string; ownerId?: string }[] }).domains;
    expect(domains.find((d) => d.id === "sales")?.ownerId).toBe("sales_lead");
  });

  it("GET /api/platform/kernel returns constitution + tool levels", async () => {
    const { status, body } = await get("/api/platform/kernel");
    expect(status).toBe(200);
    const kernel = body as { constitution: string[]; version: { kernel_version: string } };
    expect(kernel.constitution.length).toBeGreaterThanOrEqual(4);
    expect(kernel.version.kernel_version).toBe("0.1.0");
  });

  it("RBAC: a viewer can read but cannot capture evidence (403)", async () => {
    process.env.CASIOPLUS_ACTOR_ROLE = "viewer";
    try {
      const read = await get("/api/workspaces");
      expect(read.status).toBe(200);
      const denied = await post("/api/workspaces/acme/capture", {
        observer: "viewer",
        summary: "تلاش غیرمجاز برای ثبت مشاهده",
        relatedDomain: "sales",
      });
      expect(denied.status).toBe(403);
      expect((denied.body as { error: string }).error).toContain("permission_denied:write:evidence");
    } finally {
      delete process.env.CASIOPLUS_ACTOR_ROLE;
    }
  });

  it("RBAC: a process_coach can capture evidence", async () => {
    process.env.CASIOPLUS_ACTOR_ROLE = "process_coach";
    try {
      const ok = await post("/api/workspaces/acme/capture", {
        observer: "coach",
        summary: "مشاهده مجاز توسط کوچ فرایند درباره پیگیری مشتری",
        relatedDomain: "sales",
      });
      expect(ok.status).toBe(200);
    } finally {
      delete process.env.CASIOPLUS_ACTOR_ROLE;
    }
  });

  it("tenant isolation: a workspace-scoped actor cannot touch another workspace", async () => {
    process.env.CASIOPLUS_ACTOR_ROLE = "process_coach";
    process.env.CASIOPLUS_ACTOR_WORKSPACE = "acme";
    try {
      const own = await get("/api/workspaces/acme/evidence");
      expect(own.status).toBe(200);
      const other = await get("/api/workspaces/beta/readiness");
      expect(other.status).toBe(403);
      expect((other.body as { error: string }).error).toContain("workspace_forbidden:beta");
    } finally {
      delete process.env.CASIOPLUS_ACTOR_ROLE;
      delete process.env.CASIOPLUS_ACTOR_WORKSPACE;
    }
  });

  it("SSO signed headers authenticate and authorize (system_architect passes)", async () => {
    const { signedHeadersForTest } = await import("../services/mcp-server/src/actor.js");
    process.env.CASIO_SSO_SHARED_SECRET = "sso-secret-0123456789abcdef";
    try {
      const headers = signedHeadersForTest("arch-1", "system_architect", "sso-secret-0123456789abcdef");
      const res = await fetch(`${base}/api/platform/kernel`, { headers });
      expect(res.status).toBe(200);
    } finally {
      delete process.env.CASIO_SSO_SHARED_SECRET;
    }
  });

  it("SSO with a viewer role cannot create a workspace (403)", async () => {
    const { signedHeadersForTest } = await import("../services/mcp-server/src/actor.js");
    process.env.CASIO_SSO_SHARED_SECRET = "sso-secret-0123456789abcdef";
    try {
      const headers = signedHeadersForTest("viewer-1", "viewer", "sso-secret-0123456789abcdef");
      const res = await fetch(`${base}/api/workspaces`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ id: "nope", displayName: "Nope" }),
      });
      expect(res.status).toBe(403);
    } finally {
      delete process.env.CASIO_SSO_SHARED_SECRET;
    }
  });
});
