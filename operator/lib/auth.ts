/**
 * Access control for the whole surface.
 *
 * CASIOPLUS is a single-operator system: there are no user accounts, and the
 * data model has no tenancy. So authentication here is not "who are you" but
 * "is this instance yours" — one shared token, checked once, in front of
 * everything. Putting it in middleware rather than in each route means a new
 * route is protected the moment it exists, instead of the moment someone
 * remembers to guard it.
 *
 * The local demo stays zero-config: with no token set, a development server
 * serves normally. A production server with no token set refuses to serve at
 * all rather than quietly exposing Stripe keys and inbox passwords — a missing
 * secret should fail loudly, not fail open.
 */

export const SESSION_COOKIE = 'casioplus_session';
export const ACCESS_TOKEN_ENV = 'CASIOPLUS_ACCESS_TOKEN';
/**
 * Temporary kill-switch for the access gate, for acceptance-testing a build on
 * a trusted preview host: `CASIOPLUS_AUTH_DISABLED=1`. Off by default; never
 * set it on a deployment that can reach live credentials.
 */
export const AUTH_DISABLED_ENV = 'CASIOPLUS_AUTH_DISABLED';

export type AuthDecision =
  { kind: 'allow' } | { kind: 'unauthorized' } | { kind: 'misconfigured'; detail: string };

export type AuthInput = {
  /** Value of CASIOPLUS_ACCESS_TOKEN, if any. */
  token: string | undefined;
  /** Presented credential: session cookie or `Authorization: Bearer …`. */
  presented: string | undefined;
  /** True when running a production build (NODE_ENV === 'production'). */
  isProduction: boolean;
};

/**
 * Constant-time string comparison. `===` returns as soon as two bytes differ,
 * which leaks the shared secret one character at a time to anyone willing to
 * measure. Middleware runs on the edge runtime, so node:crypto's
 * timingSafeEqual is unavailable and this is written by hand.
 */
export function safeEqual(a: string, b: string): boolean {
  // Length is not secret (the operator chose it) but must not short-circuit the
  // loop, so compare over a fixed span and fold the length difference in.
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Pull a bearer credential out of an Authorization header, if present. */
export function bearerFrom(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : undefined;
}

export function decideAccess({ token, presented, isProduction }: AuthInput): AuthDecision {
  const configured = token?.trim() ?? '';

  if (configured.length === 0) {
    // No token configured. Fine on a laptop; never fine once deployed.
    if (isProduction) {
      return {
        kind: 'misconfigured',
        detail: `${ACCESS_TOKEN_ENV} is not set. A deployed CASIOPLUS holds live payment and inbox credentials, so it refuses to serve without one. Generate a token (\`openssl rand -hex 32\`) and set it in your host's environment.`,
      };
    }
    return { kind: 'allow' };
  }

  if (configured.length < 16) {
    return {
      kind: 'misconfigured',
      detail: `${ACCESS_TOKEN_ENV} must be at least 16 characters. Generate one with \`openssl rand -hex 32\`.`,
    };
  }

  if (presented && safeEqual(presented, configured)) return { kind: 'allow' };
  return { kind: 'unauthorized' };
}

/**
 * Paths served before the token check.
 *
 * - `/unlock` is where an operator exchanges the token for a session cookie, so
 *   gating it would lock everyone out.
 * - The ManyChat webhook is machine-to-machine: ManyChat cannot present the
 *   operator's token, and that route already authenticates itself with
 *   MANYCHAT_WEBHOOK_SECRET.
 */
const PUBLIC_PATHS = ['/unlock', '/api/unlock', '/api/webhooks', '/api/branding', '/api/auth'];

export function isPublicPath(pathname: string): boolean {
  // Exact match, or a full segment beneath it. A bare `startsWith` would also
  // open `/unlocked-secrets`, which is the sort of gap a gate cannot afford.
  return PUBLIC_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/**
 * The origin the *browser* sees, reconstructed from forwarded headers.
 *
 * Next builds `request.url` from the socket, which behind a TLS-terminating
 * proxy points at the sandbox's own localhost — redirecting there bounces the
 * browser off the preview origin right after unlocking. Proxies pass the real
 * origin on via `x-forwarded-proto`/`x-forwarded-host` (or at least `host`).
 */
export function externalBase(headers: Headers, fallback: { host: string }): string {
  // Note: in app route handlers the `host` header is absent from the exposed
  // Headers object, so fall back to the request URL's host (which Next builds
  // from the incoming Host header).
  const host =
    (headers.get('x-forwarded-host') ?? '').split(',')[0].trim() ||
    headers.get('host') ||
    fallback.host;
  const forwarded = (headers.get('x-forwarded-proto') ?? '').split(',')[0].trim();
  // A non-local hostname in this ecosystem is always publicly served over TLS
  // (preview proxies like https://{port}-{sandbox}.e2b.app). The `http` value
  // seen here usually only describes the proxy→sandbox hop (or is injected by
  // Next itself), so non-local hosts are upgraded to https — that keeps the
  // Secure session cookie usable no matter what the proxy forwards.
  const local = /^(localhost|127\.|0\.0\.0\.0)/.test(host);
  const proto = local ? forwarded || 'http' : 'https';
  return `${proto}://${host}`;
}

/**
 * A self-contained redirect page that navigates RELATIVELY — immune to
 * proxy host-header rewriting. The browser resolves `target` against the
 * origin it is already on (the preview origin), so login works in any
 * internal environment without trusting `Host`/`x-forwarded-*` headers.
 * `target` must be a same-site path (callers enforce that).
 */
export function redirectPageHtml(target: string): string {
  const safe = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html lang="fa"><head><meta charset="utf-8"><title>در حال انتقال</title><meta http-equiv="refresh" content="0;url=${safe}"></head><body style="background:#0a0a0a;color:#8fa295;font-family:ui-monospace,monospace;padding:2rem">در حال انتقال…</body></html>`;
}
