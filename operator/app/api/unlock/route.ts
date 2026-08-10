import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ACCESS_TOKEN_ENV, redirectPageHtml, safeEqual, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UnlockSchema = z.object({
  token: z.string().min(1).max(512),
  next: z.string().optional(),
});

/** Only same-site paths, so `next` cannot be turned into an open redirect. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function setSession(response: NextResponse, token: string): NextResponse {
  const production = process.env.NODE_ENV === 'production';
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, // page scripts can never read it
    // Production runs behind TLS (and possibly inside a cross-site preview
    // iframe), where `lax` cookies get dropped; None+Secure is the only combo
    // that survives both. Dev stays lax for plain-http localhost.
    sameSite: production ? 'none' : 'lax',
    secure: production, // plain-http localhost still works in dev
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

/**
 * Exchange the access token for a session cookie.
 *
 * Accepts a JSON body (scripts) or a form post (the /unlock page), and answers
 * in kind: JSON callers get JSON, browsers get a redirect.
 */
export async function POST(request: Request) {
  const isForm = (request.headers.get('content-type') ?? '').includes('form');

  const raw = isForm
    ? Object.fromEntries(await request.formData().catch(() => new FormData()))
    : await request.json().catch(() => null);

  const parsed = UnlockSchema.safeParse(raw);
  const configured = process.env[ACCESS_TOKEN_ENV]?.trim() ?? '';

  if (configured.length === 0) {
    const detail = `${ACCESS_TOKEN_ENV} is not set on this server`;
    return isForm
      ? new NextResponse(detail, {
          status: 503,
          headers: { 'content-type': 'text/plain' },
        })
      : NextResponse.json({ error: detail }, { status: 503 });
  }

  if (!parsed.success) {
    return isForm
      ? new NextResponse(redirectPageHtml('/unlock?error=1'), {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        })
      : NextResponse.json({ error: 'expected { token }' }, { status: 400 });
  }

  const { token, next } = parsed.data;

  if (!safeEqual(token, configured)) {
    if (!isForm) return NextResponse.json({ error: 'incorrect token' }, { status: 401 });
    // Relative navigation — never build an absolute Location from request.url,
    // which points at the sandbox's localhost behind a rewriting proxy.
    const back = `/unlock?error=1${next ? `&next=${encodeURIComponent(safeNext(next))}` : ''}`;
    return new NextResponse(redirectPageHtml(back), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Success: set the session cookie and navigate RELATIVELY to the destination
  // (`next` is already enforced same-site by safeNext). The browser resolves
  // the relative path against the origin it is on — the preview origin — so
  // login works in any internal environment, proxy headers or not.
  const target = safeNext(next);
  const page = new NextResponse(redirectPageHtml(target), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
  return setSession(page, configured);
}

/** Sign out: drop the session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
