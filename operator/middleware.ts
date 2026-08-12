import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_ENV,
  AUTH_DISABLED_ENV as CASIOPLUS_AUTH_DISABLED_ENV,
  bearerFrom,
  decideAccess,
  isPublicPath,
  redirectPageHtml,
  SESSION_COOKIE,
} from '@/lib/auth';
import { verifySessionTokenWeb } from '@/lib/session-web';

/**
 * One gate in front of every page and API route. See lib/auth.ts for why this
 * lives here rather than in each handler.
 *
 * Credential sources, in order: session cookie (Display-island signed token
 * when CASIO_AUTH_SECRET is set, or the legacy access token) →
 * Authorization: Bearer → `?token=` URL parameter (ONLY when
 * CASIOPLUS_ALLOW_URL_TOKEN=1 — a convenience for the internal demo
 * environment where an iframe may block cookies; never enabled on a real
 * deployment).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Temporary acceptance-testing switch: bypass the whole gate. See AUTH_DISABLED_ENV.
  if (process.env[CASIOPLUS_AUTH_DISABLED_ENV] === '1') return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const urlToken =
    process.env.CASIOPLUS_ALLOW_URL_TOKEN === '1'
      ? request.nextUrl.searchParams.get('token') ?? undefined
      : undefined;

  const presented =
    request.cookies.get(SESSION_COOKIE)?.value ??
    bearerFrom(request.headers.get('authorization')) ??
    urlToken;

  // A Display-island session token (signed by the identity island) grants
  // access — verified with WebCrypto because the edge runtime has no
  // node:crypto. Same secret as the bridge's CASIO_AUTH_SECRET.
  const authSecret = process.env.CASIOPLUS_AUTH_SECRET;
  if (authSecret && presented) {
    const session = await verifySessionTokenWeb(presented, authSecret).catch(() => null);
    if (session) return NextResponse.next();
  }

  const decision = decideAccess({
    token: process.env[ACCESS_TOKEN_ENV],
    presented,
    isProduction: process.env.NODE_ENV === 'production',
  });

  if (decision.kind === 'allow') return NextResponse.next();

  const wantsJson = pathname.startsWith('/api/');

  if (decision.kind === 'misconfigured') {
    // 503, not 500: the app is fine, the deployment is incomplete.
    return wantsJson
      ? NextResponse.json({ error: decision.detail }, { status: 503 })
      : new NextResponse(decision.detail, {
          status: 503,
          headers: { 'content-type': 'text/plain' },
        });
  }

  if (wantsJson) {
    return NextResponse.json(
      {
        error: `unauthorized — present the ${ACCESS_TOKEN_ENV} as \`Authorization: Bearer …\``,
      },
      { status: 401 },
    );
  }

  // Navigate to the unlock page with a RELATIVE meta-refresh page instead of
  // an absolute redirect: absolute Location built from request.url can point
  // at the sandbox's own localhost behind a rewriting proxy, which bounces
  // the browser off the preview origin. A relative target always resolves
  // against the origin the browser is already on.
  const target = `/unlock?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return new NextResponse(redirectPageHtml(target), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const config = {
  // Everything except Next's own static output and the favicon. Listing what to
  // skip (rather than what to guard) is deliberate: a new route is protected by
  // default instead of protected once someone remembers to add it.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
