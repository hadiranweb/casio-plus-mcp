import Link from 'next/link';
import { ArrowUpRight, Bot, Boxes, Brain, CheckCircle2, CircleDashed, GitBranch, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import { casioSummary, type CasioPlaybook } from '@/lib/casio-knowledge';
import { Badge, Dot, Kbd, Label, SectionHead } from '@/components/terminal';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

function toneFor(playbook: CasioPlaybook): 'ok' | 'warn' | 'accent' {
  if (playbook.برچسب_داریم_لازم === 'لازم') return 'warn';
  if (playbook.برچسب_توسعه === 'توسعه') return 'accent';
  return 'ok';
}

function PulseTile({ label, value, unit, tone, href }: { label: string; value: string | number; unit: string; tone: 'accent' | 'ok' | 'warn'; href: string }) {
  const color = tone === 'ok' ? 'text-os-ok' : tone === 'warn' ? 'text-os-warn' : 'text-os-accent';
  return (
    <Link href={href} className="hoverable group flex flex-col gap-2 rounded-lg-t border border-os-border bg-os-surface px-[18px] py-4">
      <div className="flex items-center justify-between"><Label>{label}</Label><ArrowUpRight className="h-3.5 w-3.5 text-os-dim opacity-0 transition-opacity group-hover:opacity-100" /></div>
      <div className={`flex items-baseline gap-[7px] font-mono text-[27px] font-semibold tracking-[-0.03em] ${color}`}><span>{value}</span><small className="text-xs font-normal text-os-dim">{unit}</small></div>
      <div className="h-[4px] w-full bg-os-border"><div className={`h-full ${tone === 'ok' ? 'bg-os-ok' : tone === 'warn' ? 'bg-os-warn' : 'bg-os-accent'}`} style={{ width: `${tone === 'ok' ? 73 : tone === 'warn' ? 27 : 32}%` }} /></div>
    </Link>
  );
}

function ArchitectureConstellation({ domains }: { domains: { نام: string; تعداد_پلی_بوک: number; پلی_بوک_ها: string[] }[] }) {
  const locations = ['left-[7%] top-[18%]', 'left-[32%] top-[7%]', 'right-[31%] top-[7%]', 'right-[7%] top-[18%]', 'left-[17%] bottom-[9%]', 'right-[17%] bottom-[9%]'];
  return (
    <div className="relative h-[410px] overflow-hidden rounded-lg-t border border-os-border bg-os-surface p-4">
      <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true"><line x1="50%" y1="50%" x2="17%" y2="29%" stroke="var(--accent-line)"/><line x1="50%" y1="50%" x2="42%" y2="18%" stroke="var(--accent-line)"/><line x1="50%" y1="50%" x2="58%" y2="18%" stroke="var(--accent-line)"/><line x1="50%" y1="50%" x2="83%" y2="29%" stroke="var(--accent-line)"/><line x1="50%" y1="50%" x2="28%" y2="79%" stroke="var(--accent-line)"/><line x1="50%" y1="50%" x2="72%" y2="79%" stroke="var(--accent-line)"/></svg>
      <div className="absolute left-1/2 top-1/2 z-[1] grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] text-center shadow-[var(--glow)]"><div><Brain className="mx-auto h-5 w-5 text-os-accent"/><b className="mt-1 block font-mono text-sm">CASIO CORE</b><small className="font-mono text-[9px] text-os-dim">HEGAM / YAML</small></div></div>
      {domains.map((domain, index) => <div key={domain.نام} className={`absolute z-[1] w-[176px] rounded-md-t border border-os-border-strong bg-os-surface2 p-3 ${locations[index] ?? 'left-4 top-4'}`}><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-os-accent">0{index + 1}</span><span className="font-mono text-lg font-semibold">{domain.تعداد_پلی_بوک}</span></div><h3 className="mt-1 text-xs font-semibold">{domain.نام}</h3><p className="mt-1 line-clamp-2 font-mono text-[9px] leading-relaxed text-os-dim">{domain.پلی_بوک_ها.slice(0, 2).join(' · ')}</p></div>)}
      <div className="absolute bottom-3 left-4 z-[1] flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-os-dim"><Dot state="connected" pulse /> live topology · {domains.length} domains</div>
    </div>
  );
}

export default function CasioCommandCore() {
  const { casio, playbooks, have, need, developing, domains } = casioSummary();
  const developmentRail = playbooks.filter((playbook) => playbook.برچسب_توسعه === 'توسعه').slice(0, 6);
  const priorityGaps = playbooks.filter((playbook) => playbook.برچسب_داریم_لازم === 'لازم').slice(0, 5);

  return (
    <div dir="rtl">
      <PageHeader eyebrow="casio-plus / command core" title="کاسیو‌پلاس" caret right={<Kbd>⌘K</Kbd>} />
      <div className="-mt-3 mb-[18px] flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px]">
        <span className="text-os-accent">knowledge core online</span><span className="text-os-border-strong">·</span><span className="text-os-muted">{playbooks.length} assets indexed</span><span className="text-os-border-strong">·</span><span className="text-os-ok">feedback gate armed</span><span className="text-os-border-strong">·</span><span className="text-os-dim">v{casio.meta.نسخه}</span>
      </div>

      <section className="mb-[18px] grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
        <PulseTile label="دانش قابل بهره‌برداری" value={have} unit={`/ ${playbooks.length} دارایی`} tone="ok" href="/brain" />
        <PulseTile label="شکاف‌های ساختاری" value={need} unit="نیاز به طراحی" tone="warn" href="/reference" />
        <PulseTile label="مسیر توسعه" value={developing} unit="دارایی در جریان" tone="accent" href="/roadmap" />
        <PulseTile label="معماری زنده" value={domains.length} unit="دامنه متصل" tone="accent" href="/brain" />
      </section>

      <section className="mb-[18px] grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_.85fr]">
        <div><SectionHead label="Casio knowledge constellation" count={`${playbooks.length} nodes`} /><ArchitectureConstellation domains={domains} /></div>
        <div className="rounded-lg-t border border-os-border bg-os-surface p-5"><div className="flex items-start justify-between"><div><Label>Development rail</Label><h2 className="mt-2 text-lg font-bold">دارایی‌های نیازمند حرکت</h2></div><CircleDashed className="h-5 w-5 text-os-accent" /></div><div className="mt-4 divide-y divide-os-border">{developmentRail.map((playbook) => <Link href={`/brain?asset=${playbook.id}`} key={playbook.id} className="group flex gap-3 py-3 first:pt-0"><span className="font-mono text-[10px] text-os-accent">#{String(playbook.id).padStart(2, '0')}</span><span className="min-w-0 flex-1"><b className="block truncate text-[12px] group-hover:text-os-accent">{playbook.نام_پلی_بوک}</b><small className="mt-1 block font-mono text-[9px] text-os-dim">{playbook.دامنه} · {playbook.سطح_هگام.split(':')[0]}</small></span><ArrowUpRight className="mt-1 h-3.5 w-3.5 text-os-dim" /></Link>)}</div></div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg-t border border-os-border bg-os-surface p-5 lg:col-span-2"><div className="flex items-start justify-between"><div><Label>Readiness matrix</Label><h2 className="mt-2 text-lg font-bold">مرز «داریم» و «لازم»</h2></div><Link href="/reference" className="font-mono text-[10px] text-os-accent">open matrix →</Link></div><div className="mt-4 grid grid-cols-3 gap-3">{([{label:'داریم', value:have, tone:'ok', caption:'دارایی دارای منبع یا وضعیت عملیاتی'}, {label:'لازم', value:need, tone:'warn', caption:'شکاف نسبت به مدل جنرال'}, {label:'توسعه', value:developing, tone:'accent', caption:'آماده برای تبدیل به نسخه بعد'}] as const).map((item) => <div key={item.label} className="rounded-md-t border border-os-border bg-os-surface2 p-4"><Badge tone={item.tone}>{item.label}</Badge><div className={`mt-4 font-mono text-3xl font-semibold ${item.tone === 'ok' ? 'text-os-ok' : item.tone === 'warn' ? 'text-os-warn' : 'text-os-accent'}`}>{item.value}</div><p className="mt-2 font-mono text-[10px] leading-relaxed text-os-dim">{item.caption}</p></div>)}</div></div>
        <div className="rounded-lg-t border border-os-border bg-os-surface p-5"><div className="flex items-center justify-between"><Label>Review queue</Label><ShieldCheck className="h-4 w-4 text-os-ok" /></div><div className="mt-4 flex flex-col gap-3 font-mono text-[11px]"><div className="flex justify-between"><span className="text-os-muted">validation</span><span className="text-os-ok">ARMED</span></div><div className="flex justify-between"><span className="text-os-muted">direct core write</span><span className="text-os-err">BLOCKED</span></div><div className="flex justify-between"><span className="text-os-muted">version proposals</span><span className="text-os-accent">PENDING HUMAN MERGE</span></div></div><Link href="/tasks" className="mt-6 flex items-center justify-between border-t border-os-border pt-4 text-xs text-os-muted hover:text-os-accent"><span>باز کردن عملیات بررسی</span><ArrowUpRight className="h-4 w-4" /></Link></div>
      </section>

      <section className="mt-5 rounded-lg-t border border-os-border bg-os-surface p-5"><SectionHead label="Priority gaps" count={`${need} required`} /><div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">{priorityGaps.map((playbook) => <Link key={playbook.id} href={`/brain?asset=${playbook.id}`} className="hoverable rounded-md-t border border-os-border bg-os-surface2 p-3"><div className="flex items-center justify-between"><Badge tone={toneFor(playbook)}>لازم</Badge><GitBranch className="h-3.5 w-3.5 text-os-dim" /></div><h3 className="mt-4 text-[12px] leading-relaxed">{playbook.نام_پلی_بوک}</h3><p className="mt-2 line-clamp-2 font-mono text-[9px] leading-relaxed text-os-dim">{playbook.خروجی_های_کلیدی}</p></Link>)}</div></section>
    </div>
  );
}
