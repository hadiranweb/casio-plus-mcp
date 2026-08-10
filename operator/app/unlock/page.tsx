import { ACCESS_TOKEN_ENV } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { loadBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

/**
 * Token exchange. Deliberately a server component posting a plain form: it
 * needs no client JavaScript, and it stays directly invocable so the smoke
 * suite in tests/smoke.test.ts can render it like every other page.
 */
export default function UnlockPage({ searchParams }: { searchParams?: { next?: string; error?: string } }) {
  // Only same-site paths survive, so `?next=` cannot be used as an open redirect.
  const next = searchParams?.next;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const failed = searchParams?.error === '1';
  const branding = loadBranding();
  const workspaceName = branding.workspaceName;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form method="POST" action="/api/unlock" className="w-full max-w-sm">
        <input type="hidden" name="next" value={safeNext} />

        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--text-3)]">{t('unlock.locked')}</p>
        <h1 className="mt-1 font-mono text-2xl tracking-[0.08em] text-[var(--text-1)]">اکوسیستم عنصر</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-3)]">{workspaceName}</p>
        <p className="mt-3 font-mono text-xs leading-relaxed text-[var(--text-3)]">
          {t('unlock.body')}
        </p>

        <label htmlFor="token" className="sr-only">
          Access token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder={t('unlock.placeholder')}
          className="mt-4 w-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm text-[var(--text-1)] outline-none focus:border-[var(--text-3)]"
        />

        {failed && (
          <p role="alert" className="mt-2 font-mono text-xs text-[var(--danger,#f87171)]">
            incorrect token
          </p>
        )}

        <button
          type="submit"
          className="mt-3 w-full border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-2)]"
        >
          {t('unlock.button')}
        </button>

        <p className="mt-6 font-mono text-[11px] leading-relaxed text-[var(--text-3)]">
          {t('unlock.footer.prefix')} <code>{ACCESS_TOKEN_ENV}</code> {t('unlock.footer.suffix')}
        </p>
      </form>
    </main>
  );
}
