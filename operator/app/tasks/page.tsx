import { ArrowUpRight, ClipboardCheck, Gauge, Target } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Dot, Label, SectionHead } from '@/components/terminal';
import { coachingSummary, listCoachingSessions } from '@/lib/coaching-session';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default function CoachingOperationsPage() {
  const sessions = listCoachingSessions();
  const summary = coachingSummary(sessions);
  return <div dir="rtl">
    <PageHeader eyebrow={t('pages.tasks.eyebrow')} title={t('pages.tasks.title')} right={<Badge tone="accent">implementation loop</Badge>} />
    <div className="-mt-3 mb-[18px] flex flex-wrap gap-x-2 gap-y-1 font-mono text-[12px]"><span className="text-os-accent">session → bottleneck → action plan → field feedback</span><span className="text-os-border-strong">·</span><span className="text-os-muted">human-led / data-backed</span></div>
    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg-t border border-os-border bg-os-surface p-[18px]"><div className="flex justify-between"><Label>جلسات ثبت‌شده</Label><ClipboardCheck className="h-4 w-4 text-os-accent"/></div><b className="mt-3 block font-mono text-[30px]">{summary.sessions}</b><small className="font-mono text-[9px] text-os-dim">ثبت واقعی جلسات کوچینگ</small></div>
      <div className="rounded-lg-t border border-os-border bg-os-surface p-[18px]"><div className="flex justify-between"><Label>اقدام باز</Label><Target className="h-4 w-4 text-os-warn"/></div><b className="mt-3 block font-mono text-[30px] text-os-warn">{summary.openActions}</b><small className="font-mono text-[9px] text-os-dim">{t('tasks.openActions')}</small></div>
      <div className="rounded-lg-t border border-os-border bg-os-surface p-[18px]"><div className="flex justify-between"><Label>اقدام مسدود</Label><Dot state="error"/></div><b className="mt-3 block font-mono text-[30px] text-os-err">{summary.blockedActions}</b><small className="font-mono text-[9px] text-os-dim">نیازمند مداخله یا بازنگری</small></div>
      <div className="rounded-lg-t border border-os-border bg-os-surface p-[18px]"><div className="flex justify-between"><Label>آمادگی میانگین</Label><Gauge className="h-4 w-4 text-os-ok"/></div><b className="mt-3 block font-mono text-[30px] text-os-ok">{summary.averageReadiness ?? '—'}<small className="text-[11px] font-normal text-os-dim"> / 10</small></b><small className="font-mono text-[9px] text-os-dim">خودارزیابی قابلیت اجرا</small></div>
    </section>
    <section className="grid gap-4 xl:grid-cols-[1.55fr_.85fr]"><div className="rounded-lg-t border border-os-border bg-os-surface p-5"><SectionHead label={t('tasks.log')} count={`${sessions.length}`} />
      {sessions.length === 0 ? <div className="flex min-h-[270px] flex-col items-center justify-center border border-dashed border-os-border bg-os-surface2 text-center"><ClipboardCheck className="h-7 w-7 text-os-dim"/><b className="mt-3 text-sm">جلسه‌ای ثبت نشده است.</b><p className="mt-2 max-w-sm font-mono text-[10px] leading-relaxed text-os-dim">اولین جلسه را با API `POST /api/coaching-sessions` ثبت کنید. فرم شامل گلوگاه، علت، Action Plan، معیار موفقیت و سطح آمادگی است.</p></div> : <div className="divide-y divide-os-border">{sessions.map((session) => <div key={session.id} className="py-4 first:pt-0"><div className="flex items-start justify-between"><div><b className="text-sm">{session.learnerName} <span className="font-normal text-os-dim">/ {session.businessName}</span></b><p className="mt-1 font-mono text-[10px] text-os-dim">گلوگاه: {session.bottleneck}</p></div><Badge tone={session.readinessScore >= 7 ? 'ok' : session.readinessScore >= 4 ? 'warn' : 'err'}>{session.readinessScore}/10 آمادگی</Badge></div><div className="mt-3 flex flex-wrap gap-2">{session.actions.map((action) => <span key={action.id} className="rounded-sm-t border border-os-border bg-os-surface2 px-2 py-1 font-mono text-[9px] text-os-muted">{action.title} · {action.status}</span>)}</div></div>)}</div>}</div>
      <div className="rounded-lg-t border border-os-border bg-os-surface p-5"><Label>{t('tasks.intake')}</Label><h2 className="mt-2 text-lg font-bold">فرم استاندارد جلسه</h2><div className="mt-5 space-y-3 font-mono text-[10px] text-os-muted"><p><span className="text-os-accent">۱.</span> هدف و مسئلهٔ اصلی</p><p><span className="text-os-accent">۲.</span> گلوگاه و علت احتمالی</p><p><span className="text-os-accent">۳.</span> Action Plan با مسئول و معیار موفقیت</p><p><span className="text-os-accent">۴.</span> آمادگی مخاطب (۱ تا ۱۰)</p><p><span className="text-os-accent">۵.</span> تعهد، مانع و نیاز پشتیبانی</p></div><a href="/api/coaching-sessions" className="mt-6 flex items-center justify-between border-t border-os-border pt-4 text-xs text-os-muted hover:text-os-accent"><span>GET /api/coaching-sessions</span><ArrowUpRight className="h-4 w-4"/></a></div></section>
  </div>;
}
