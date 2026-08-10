import { Activity, AlertTriangle, CheckCircle2, CircleDotDashed, Gauge, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Dot, Label, SectionHead } from '@/components/terminal';
import { casioMetricSummary, listCasioMetric, type CasioMetricStatus } from '@/lib/casio-metric';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const CONFIG: Record<CasioMetricStatus, { label: string; tone: 'ok' | 'warn' | 'err'; icon: typeof CheckCircle2; rule: string }> = {
  green: { label: 'سبز', tone: 'ok', icon: CheckCircle2, rule: '۷۰ تا ۱۰۰ · فعال و در مسیر رشد' },
  yellow: { label: 'زرد', tone: 'warn', icon: AlertTriangle, rule: '۴۰ تا ۶۹ · نیازمند کوچ و پیگیری' },
  red: { label: 'قرمز', tone: 'err', icon: CircleDotDashed, rule: '۰ تا ۳۹ · مداخله و بررسی خروج' },
};

function StatusTile({ status, value }: { status: CasioMetricStatus; value: number }) {
  const config = CONFIG[status];
  const Icon = config.icon;
  return <div className="hoverable rounded-lg-t border border-os-border bg-os-surface p-[18px]"><div className="flex items-center justify-between"><Label>{config.label}</Label><Icon className={`h-4 w-4 ${config.tone === 'ok' ? 'text-os-ok' : config.tone === 'warn' ? 'text-os-warn' : 'text-os-err'}`} /></div><div className={`mt-3 font-mono text-[30px] font-semibold ${config.tone === 'ok' ? 'text-os-ok' : config.tone === 'warn' ? 'text-os-warn' : 'text-os-err'}`}>{value}</div><p className="mt-2 font-mono text-[9px] leading-relaxed text-os-dim">{config.rule}</p></div>;
}

export default function CasioMetricPage() {
  const records = listCasioMetric();
  const summary = casioMetricSummary(records);
  const groups = { green: records.filter((record) => record.status === 'green'), yellow: records.filter((record) => record.status === 'yellow'), red: records.filter((record) => record.status === 'red') };

  return <div dir="rtl">
    <PageHeader eyebrow={t('pages.analytics.eyebrow')} title={t('pages.analytics.title')} right={<Badge tone="accent">{t('analytics.actionScore')}</Badge>} />
    <div className="-mt-3 mb-[18px] flex flex-wrap gap-x-2 gap-y-1 font-mono text-[12px]"><span className="text-os-accent">{t('analytics.qualityGated')}</span><span className="text-os-border-strong">·</span><span className="text-os-muted">{t('analytics.green')}</span><span className="text-os-border-strong">·</span><span className="text-os-warn">{t('analytics.yellow')}</span><span className="text-os-border-strong">·</span><span className="text-os-err">{t('analytics.red')}</span></div>

    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg-t border border-os-border bg-os-surface p-[18px]"><div className="flex items-center justify-between"><Label>دانش‌پذیران ثبت‌شده</Label><Users className="h-4 w-4 text-os-accent" /></div><div className="mt-3 font-mono text-[30px] font-semibold text-os-text">{summary.total}</div><p className="mt-2 font-mono text-[9px] text-os-dim">رکوردهای واقعی ثبت‌شده در Casio Metric</p></div><StatusTile status="green" value={summary.green} /><StatusTile status="yellow" value={summary.yellow} /><StatusTile status="red" value={summary.red} /></section>

    <section className="mb-5 grid gap-4 xl:grid-cols-[1.55fr_.85fr]"><div className="rounded-lg-t border border-os-border bg-os-surface p-5"><div className="flex items-start justify-between"><div><Label>{t('analytics.radar')}</Label><h2 className="mt-2 text-lg font-bold">رادار عملگرایی دانش‌پذیران</h2></div><Gauge className="h-5 w-5 text-os-accent" /></div>{records.length === 0 ? <div className="mt-5 flex min-h-[250px] flex-col items-center justify-center border border-dashed border-os-border bg-os-surface2 text-center"><Activity className="h-6 w-6 text-os-dim"/><strong className="mt-3 text-sm">هنوز دادهٔ میدان ثبت نشده است.</strong><p className="mt-2 max-w-sm font-mono text-[10px] leading-relaxed text-os-dim">اولین رکورد را از فرم کوچینگ یا API `POST /api/casio-metric` وارد کنید. دادهٔ ساختگی نمایش داده نمی‌شود.</p></div> : <div className="mt-5 divide-y divide-os-border">{records.map((record) => { const config = CONFIG[record.status]; return <div key={record.id} className="flex items-center gap-4 py-3 first:pt-0"><Dot state={config.tone} pulse={record.status === 'green'} /><div className="min-w-0 flex-1"><strong className="text-sm">{record.learnerName}</strong><small className="mr-2 font-mono text-[9px] text-os-dim">{record.source}</small><p className="mt-1 truncate font-mono text-[10px] text-os-dim">{record.nextAction}</p></div><div className="text-left"><b className="font-mono text-xl">{record.actionScore}</b><small className="block font-mono text-[9px] text-os-dim">{config.label}</small></div></div>; })}</div>}</div>
      <div className="rounded-lg-t border border-os-border bg-os-surface p-5"><Label>{t('analytics.protocol')}</Label><h2 className="mt-2 text-lg font-bold">چرخهٔ مداخله</h2><div className="mt-5 space-y-3">{(['green','yellow','red'] as CasioMetricStatus[]).map((status, index) => { const config = CONFIG[status]; return <div key={status} className="flex gap-3 border-r border-os-border pr-3"><span className={`font-mono text-xs ${config.tone === 'ok' ? 'text-os-ok' : config.tone === 'warn' ? 'text-os-warn' : 'text-os-err'}`}>0{index + 1}</span><div><Badge tone={config.tone}>{config.label}</Badge><p className="mt-2 font-mono text-[10px] leading-relaxed text-os-dim">{status === 'green' ? 'تقدیر، انتقال تجربه و مشارکت در لیدربورد.' : status === 'yellow' ? 'عارضه‌یابی، بازبینی تعهد و پیگیری کوچ.' : 'ضرب‌الاجل ۷۲ ساعته، جلسه مداخله و بررسی خروج.'}</p></div></div>; })}</div></div></section>

    <section><SectionHead label={t('analytics.intake')} count={t('analytics.apiReady')} /><div className="rounded-lg-t border border-os-border bg-os-surface p-5 font-mono text-[11px] leading-7 text-os-muted"><span className="text-os-accent">POST /api/casio-metric</span> → <span className="text-os-text">learnerId, learnerName, actionScore, nextAction, source, note</span><br/>هر score به‌صورت قطعی به وضعیت سبز/زرد/قرمز نگاشت می‌شود؛ هیچ وضعیت دستی یا مبهمی پذیرفته نمی‌شود.</div></section>
  </div>;
}
