import { afterEach, describe, expect, it } from "vitest";
import { resolveActorFromRequest, signedHeadersForTest, resolveLocalActor } from "../services/mcp-server/src/actor.js";

function getterOf(headers: Record<string, string>) {
  return (name: string) => headers[name.toLowerCase()] ?? null;
}

const SECRET = "test-secret-0123456789abcdef";

afterEach(() => {
  delete process.env.CASIO_SSO_SHARED_SECRET;
  delete process.env.CASIOPLUS_ACTOR_ROLE;
  delete process.env.CASIOPLUS_ACTOR_WORKSPACE;
  delete process.env.CASIOPLUS_ACTOR_SUBJECT;
  delete process.env.NODE_ENV;
});

describe("actor resolution (identity at the ecosystem layer)", () => {
  it("verifies signed SSO headers and reads the workspace scope", () => {
    process.env.CASIO_SSO_SHARED_SECRET = SECRET;
    const headers = signedHeadersForTest("coach-1", "process_coach", SECRET, "acme");
    const result = resolveActorFromRequest(getterOf(headers));
    expect("actor" in result).toBe(true);
    if ("actor" in result) {
      expect(result.actor.subject).toBe("coach-1");
      expect(result.actor.role).toBe("process_coach");
      expect(result.actor.workspace).toBe("acme");
      expect(result.actor.mode).toBe("sso-proxy");
    }
  });

  it("rejects a tampered signature and an expired timestamp", () => {
    process.env.CASIO_SSO_SHARED_SECRET = SECRET;
    const headers = signedHeadersForTest("coach-1", "process_coach", SECRET);
    const bad = { ...headers, "x-casio-sso-signature": "f".repeat(64) };
    expect(resolveActorFromRequest(getterOf(bad))).toEqual({ error: "invalid_sso_signature" });

    const old = new Date(Date.now() - 10 * 60_000).toISOString();
    const expired = signedHeadersForTest("coach-1", "process_coach", SECRET, undefined, old);
    expect(resolveActorFromRequest(getterOf(expired))).toEqual({ error: "expired_sso_identity" });
  });

  it("rejects unknown roles and missing identity", () => {
    process.env.CASIO_SSO_SHARED_SECRET = SECRET;
    const unknownRole = signedHeadersForTest("x", "superadmin", SECRET);
    expect(resolveActorFromRequest(getterOf(unknownRole))).toEqual({ error: "unknown_sso_role:superadmin" });
    expect(resolveActorFromRequest(() => null)).toEqual({ error: "missing_or_invalid_sso_identity" });
  });

  it("local fallback: non-production defaults to system_architect; explicit role wins", () => {
    process.env.NODE_ENV = "test";
    const r = resolveLocalActor();
    expect("actor" in r).toBe(true);
    if ("actor" in r) {
      expect(r.actor.role).toBe("system_architect");
      expect(r.actor.mode).toBe("local-role");
    }
    process.env.CASIOPLUS_ACTOR_ROLE = "viewer";
    process.env.CASIOPLUS_ACTOR_WORKSPACE = "casio";
    const r2 = resolveLocalActor();
    expect("actor" in r2 && r2.actor.role).toBe("viewer");
    expect("actor" in r2 && r2.actor.workspace).toBe("casio");
  });

  it("production without SSO and without explicit role refuses", () => {
    process.env.NODE_ENV = "production";
    expect(resolveLocalActor()).toEqual({ error: "sso_not_configured" });
    process.env.CASIOPLUS_ACTOR_ROLE = "viewer";
    expect("actor" in resolveLocalActor()).toBe(true);
  });
});
