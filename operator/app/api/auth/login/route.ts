import { NextResponse } from 'next/server';
import { SESSION_COOKIE, redirectPageHtml } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Display-island login for the operator UI.
 *
 * The identity lives in the Element Ecosystem bridge (services/mcp-server,
 * port 4110): POST /api/auth/login verifies username+password against the
 * Display island's user store and returns a signed session token. This route
 * forwards the credentials server-side, sets the session cookie (HttpOnly,
 * Secure in prod), and navigates RELATIVELY — no proxy-header dependency.
 */

const BRIDGE_URL = process.env.CASIO_BRIDGE_URL ?? 'http://127.0.0.1:4110';

function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function errorPage(): NextResponse {
  return new NextResponse(redirectPageHtml('/unlock?error=1'), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  const isForm = (request.headers.get('content-type') ?? '').includes('form');

  const raw = isForm
    ? Object.fromEntries(await request.formData().catch(() => new FormData()))
    : await request.json().catch(() => null);

  const username = typeof raw?.username === 'string' ? raw.username.trim() : '';
  const password = typeof raw?.password === 'string' ? raw.password : '';
  const next = typeof raw?.next === 'string' ? raw.next : '/';

  if (!username || !password) {
    return isForm ? errorPage() : NextResponse.json({ error: 'username and password are required' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${BRIDGE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // identity island unreachable — fail closed, never open
    return isForm ? errorPage() : NextResponse.json({ error: 'identity service unreachable' }, { status: 503 });
  }

  if (!res.ok) {
    return isForm ? errorPage() : NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
  }

  const body = (await res.json()) as { token?: string };
  if (!body.token) {
    return isForm ? errorPage() : NextResponse.json({ error: 'identity service returned no token' }, { status: 502 });
  }

  if (!isForm) {
    return NextResponse.json({ ok: true, token: body.token });
  }

  const page = new NextResponse(redirectPageHtml(safeNext(next)), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
  const production = process.env.NODE_ENV === 'production';
  page.cookies.set(SESSION_COOKIE, body.token, {
    httpOnly: true,
    sameSite: production ? 'none' : 'lax',
    secure: production,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return page;
}
