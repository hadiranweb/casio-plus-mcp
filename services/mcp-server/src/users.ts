import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { userSchema } from "./generated/schemas.js";

/**
 * User service — the Display island's identity store.
 *
 * Users live in the display workspace's runtime dir:
 *   <displayDataDir>/users.json   (gitignored; seeded from env on first boot)
 *
 * Credentials are hashed with scrypt (never stored plaintext). Sessions are
 * HMAC-SHA256 signed tokens ("subject.role.workspace.expires" payload) —
 * stateless, verifiable by the bridge and the operator without a DB lookup.
 */

export const UserRecordSchema = userSchema;
export type UserRecord = z.infer<typeof UserRecordSchema>;

export type SessionPayload = {
  sub: string;
  role: string;
  ws?: string;
  exp: number;
};

export function usersStorePath(displayDataDir: string): string {
  return path.join(displayDataDir, "users.json");
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function sign(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string, secret: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Sign a session token valid for `ttlMs` (default 12h). */
export function issueToken(user: UserRecord, secret: string, ttlMs = 12 * 60 * 60_000): string {
  const payload: SessionPayload = {
    sub: user.username,
    role: user.role,
    ws: user.workspace,
    exp: Date.now() + ttlMs,
  };
  return sign(payload, secret);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function read(displayDataDir: string): UserRecord[] {
  const p = usersStorePath(displayDataDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, "[]\n", "utf8");
  const raw = fs.readFileSync(p, "utf8").trim();
  return z.array(UserRecordSchema).parse(raw ? JSON.parse(raw) : []);
}

function write(displayDataDir: string, users: UserRecord[]): void {
  const p = usersStorePath(displayDataDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(users, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, p);
}

export function listUsers(displayDataDir: string): UserRecord[] {
  return read(displayDataDir);
}

/** Idempotent bootstrap: seed users from CASIO_SEED_USERS (JSON) on first boot. */
export function ensureSeedUsers(displayDataDir: string): UserRecord[] {
  const users = read(displayDataDir);
  if (users.length > 0) return users;
  const seed = process.env.CASIO_SEED_USERS;
  if (!seed) return users;
  const parsed = JSON.parse(seed) as { username: string; password: string; role: string; workspace?: string; displayName?: string }[];
  const created = parsed.map((item) => {
    const id = `usr_${randomBytes(6).toString("hex")}`;
    const record: UserRecord = {
      id,
      username: item.username,
      displayName: item.displayName,
      role: item.role,
      workspace: item.workspace,
      passwordHash: hashPassword(item.password),
      status: "active",
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
    };
    return record;
  });
  write(displayDataDir, created);
  return created;
}

/** Login: verify username+password, update lastLoginAt, return user + token. */
export function login(displayDataDir: string, username: string, password: string, secret: string): { user: UserRecord; token: string } {
  const users = read(displayDataDir);
  const user = users.find((u) => u.username === username && u.status === "active");
  if (!user) throw new Error("invalid_credentials");
  if (!verifyPassword(password, user.passwordHash)) throw new Error("invalid_credentials");
  const updated: UserRecord = { ...user, lastLoginAt: new Date().toISOString() };
  write(
    displayDataDir,
    users.map((u) => (u.id === user.id ? updated : u)),
  );
  return { user: updated, token: issueToken(updated, secret) };
}

export function createUser(
  displayDataDir: string,
  input: { username: string; password: string; role: string; workspace?: string; displayName?: string },
): UserRecord {
  const users = read(displayDataDir);
  if (users.some((u) => u.username === input.username)) throw new Error("username_taken");
  const record: UserRecord = {
    id: `usr_${randomBytes(6).toString("hex")}`,
    username: input.username,
    displayName: input.displayName,
    role: input.role,
    workspace: input.workspace,
    passwordHash: hashPassword(input.password),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  users.push(record);
  write(displayDataDir, record ? users : users);
  return record;
}
