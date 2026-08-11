import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  createUser,
  ensureSeedUsers,
  issueToken,
  login,
  verifyPassword,
  verifyToken,
} from "../services/mcp-server/src/users.js";

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_SEED_USERS;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setupDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "casio-users-"));
  dirs.push(d);
  return d;
}

const SECRET = "test-secret-0123456789abcdef";

describe("user service (Display island identity)", () => {
  it("hashes passwords with scrypt and verifies correctly", () => {
    const d = setupDir();
    const user = createUser(d, { username: "ali", password: "secret123", role: "viewer" });
    expect(user.passwordHash).toContain(":");
    expect(user.passwordHash).not.toContain("secret123");
    expect(verifyPassword("secret123", user.passwordHash)).toBe(true);
    expect(verifyPassword("wrong", user.passwordHash)).toBe(false);
  });

  it("rejects duplicate usernames", () => {
    const d = setupDir();
    createUser(d, { username: "ali", password: "x", role: "viewer" });
    expect(() => createUser(d, { username: "ali", password: "y", role: "viewer" })).toThrow("username_taken");
  });

  it("login verifies credentials and returns a signed token; wrong password rejected", () => {
    const d = setupDir();
    createUser(d, { username: "sara", password: "pw123", role: "process_coach", workspace: "casio" });
    const { user, token } = login(d, "sara", "pw123", SECRET);
    expect(user.username).toBe("sara");
    expect(user.lastLoginAt).toBeTruthy();
    const payload = verifyToken(token, SECRET);
    expect(payload?.sub).toBe("sara");
    expect(payload?.role).toBe("process_coach");
    expect(payload?.ws).toBe("casio");
    expect(() => login(d, "sara", "bad", SECRET)).toThrow("invalid_credentials");
  });

  it("tokens expire and reject tampering", () => {
    const d = setupDir();
    const user = createUser(d, { username: "ali", password: "x", role: "viewer" });
    // deterministic expiry: craft a payload with exp in the past
    const expiredPayload = Buffer.from(JSON.stringify({ sub: user.username, role: user.role, exp: Date.now() - 1000 })).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(expiredPayload).digest("base64url");
    expect(verifyToken(`${expiredPayload}.${sig}`, SECRET)).toBeNull();
    const valid = issueToken(user, SECRET);
    const [body] = valid.split(".");
    const tampered = `${body}.${"f".repeat(43)}`;
    expect(verifyToken(tampered, SECRET)).toBeNull();
  });

  it("ensureSeedUsers seeds only on first boot", () => {
    const d = setupDir();
    process.env.CASIO_SEED_USERS = JSON.stringify([
      { username: "admin", password: "admin123", role: "system_architect" },
      { username: "coach", password: "coach123", role: "process_coach", workspace: "casio" },
    ]);
    const first = ensureSeedUsers(d);
    expect(first).toHaveLength(2);
    expect(first[0].role).toBe("system_architect");
    // second call returns existing (no duplicates)
    expect(ensureSeedUsers(d)).toHaveLength(2);
    // login works with the seeded credentials
    const { user } = login(d, "admin", "admin123", SECRET);
    expect(user.username).toBe("admin");
  });
});
