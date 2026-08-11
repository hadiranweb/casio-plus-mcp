import { createHmac, timingSafeEqual } from "node:crypto";
import { loadRbacPolicy } from "./rbac-policy.js";

/**
 * Actor resolution — "who is calling" at the Element Ecosystem layer.
 *
 * Sources, in order:
 *   1. SSO proxy headers (production): x-casio-sso-subject / -role /
 *      -timestamp / -signature (+ optional x-casio-sso-workspace scope),
 *      signed with HMAC-SHA256("subject.role.timestamp", CASIO_SSO_SHARED_SECRET),
 *      timestamp within 5 minutes, constant-time compare. Same protocol as
 *      the operator frontend (lib/sso.ts).
 *   2. Local fallback (non-production convenience, or explicit opt-in):
 *      CASIO_ACTOR_ROLE (default system_architect in dev — the single
 *      operator owns everything; explicit env works anywhere) and
 *      CASIO_ACTOR_WORKSPACE (default casio).
 *
 * The actor carries an optional workspace SCOPE: when set, the actor may only
 * touch that workspace (tenant isolation); manage:access roles may pass.
 */

export type Actor = {
  subject: string;
  role: string;
  workspace?: string;
  mode: "sso-proxy" | "local-role";
};

export type ResolveResult = { actor: Actor } | { error: string };

const MAX_AGE_MS = 5 * 60_000;
export const SSO_HEADERS = [
  "x-casio-sso-subject",
  "x-casio-sso-role",
  "x-casio-sso-timestamp",
  "x-casio-sso-signature",
] as const;

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Resolve from an HTTP-like header getter. */
export function resolveActorFromRequest(getHeader: (name: string) => string | null | undefined): ResolveResult {
  const secret = process.env.CASIO_SSO_SHARED_SECRET?.trim();
  if (secret) {
    const subject = getHeader("x-casio-sso-subject")?.trim() ?? "";
    const role = getHeader("x-casio-sso-role")?.trim() ?? "";
    const timestamp = getHeader("x-casio-sso-timestamp")?.trim() ?? "";
    const signature = getHeader("x-casio-sso-signature")?.trim() ?? "";
    const workspace = getHeader("x-casio-sso-workspace")?.trim() || undefined;
    const millis = Date.parse(timestamp);
    if (!subject || !role || !Number.isFinite(millis) || !signature) return { error: "missing_or_invalid_sso_identity" };
    if (Math.abs(Date.now() - millis) > MAX_AGE_MS) return { error: "expired_sso_identity" };
    const validRole = loadRbacPolicy().roles.includes(role);
    if (!validRole) return { error: `unknown_sso_role:${role}` };
    const payload = `${subject}.${role}.${timestamp}`;
    if (!safeEqualHex(signature, signatureFor(payload, secret))) return { error: "invalid_sso_signature" };
    return { actor: { subject, role, workspace, mode: "sso-proxy" } };
  }

  // Local fallback: explicit env anywhere, or non-production convenience.
  const explicit = process.env.CASIOPLUS_ACTOR_ROLE?.trim();
  const role = explicit ?? (process.env.NODE_ENV !== "production" ? "system_architect" : undefined);
  if (!role) return { error: "sso_not_configured" };
  const validRole = loadRbacPolicy().roles.includes(role);
  if (!validRole) return { error: `unknown_local_role:${role}` };
  return {
    actor: {
      subject: process.env.CASIOPLUS_ACTOR_SUBJECT?.trim() || "local-operator",
      role,
      workspace: process.env.CASIOPLUS_ACTOR_WORKSPACE?.trim() || undefined,
      mode: "local-role",
    },
  };
}

/** Resolve from the process environment (MCP stdio has no headers). */
export function resolveLocalActor(): ResolveResult {
  return resolveActorFromRequest(() => undefined);
}

/** Throw-if-absent variant for handlers: identity is mandatory for writes. */
export function requireLocalActor(): Actor {
  const result = resolveLocalActor();
  if ("error" in result) throw new Error(result.error);
  return result.actor;
}

/** Build an actor from a verified session payload (Bearer token login). */
export function actorFromSession(subject: string, role: string, workspace?: string): Actor {
  return { subject, role, workspace, mode: "sso-proxy" };
}

export function signatureFor(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** For tests: build signed headers like the operator's signedHeadersForTest. */
export function signedHeadersForTest(subject: string, role: string, secret: string, workspace?: string, timestamp = new Date().toISOString()) {
  const payload = `${subject}.${role}.${timestamp}`;
  return {
    "x-casio-sso-subject": subject,
    "x-casio-sso-role": role,
    "x-casio-sso-timestamp": timestamp,
    "x-casio-sso-signature": signatureFor(payload, secret),
    ...(workspace ? { "x-casio-sso-workspace": workspace } : {}),
  };
}
