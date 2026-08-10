import type { Agent, AgentRun } from '@/lib/schemas';
import { agentCostRows, costTotals, spendPerDay } from '@/lib/agent-costs';
import { Label, SectionHead, Spark } from '@/components/terminal';
import { num, t } from '@/lib/i18n';

const money = (n: number): string => (n >= 1 ? `$${n.toFixed(2)}` : n > 0 ? `$${n.toFixed(4)}` : '$0');
const dur = (ms: number): string =>
  ms >= 3_600_000 ? `${(ms / 3_600_000).toFixed(1)}h` : ms >= 60_000 ? `${(ms / 60_000).toFixed(1)}m` : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
const tok = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const pct = (r: number): string => `${Math.round(r * 100)}%`;

function rel(iso: string | null): string {
  if (!iso) return t('time.never');
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return t('time.justNow');
  const m = Math.floor(ms / 60_000);
  if (m < 1) return t('time.justNow');
  if (m < 60) return t('time.minutes', { n: num(m) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hours', { n: num(h) });
  return t('time.days', { n: num(Math.floor(h / 24)) });
}

/**
 * Agents cost & runtime: per-agent runtimes and estimated LLM spend, plus
 * totals and a daily-spend trend. Cost is estimated (token counts times model
 * list price), not a billed number, and is labeled as such.
 */
export function AgentCostAnalysis({ runs, agents }: { runs: AgentRun[]; agents: Pick<Agent, 'id' | 'name'>[] }) {
  const rows = agentCostRows(runs, agents);
  const totals = costTotals(runs);
  const spend = spendPerDay(runs, 14);

  const tiles: [string, string][] = [
    ['agents.cost.spend', money(totals.totalCost)],
    ['agents.cost.runs', num(totals.totalRuns)],
    ['agents.cost.runtime', dur(totals.totalMs)],
    ['agents.cost.avgRun', money(totals.avgCostPerRun)],
  ];

  return (
    <section>
      <SectionHead label={t('agents.cost.title')} count={t('agents.cost.estimated', { amount: money(totals.totalCost) })} />

      <div className="mb-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        {tiles.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1.5 rounded-lg-t border border-os-border bg-os-surface px-4 py-3">
            <Label>{t(label)}</Label>
            <div className="font-mono text-[22px] font-semibold tracking-[-0.02em]">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg-t border border-os-border bg-os-surface">
        <div className="flex items-center justify-between gap-3 border-b border-os-border px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-os-dim">
            {t('agents.cost.perAgent')}
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] text-os-dim">
            {t('agents.cost.spend14d')} <Spark data={spend} w={90} h={18} />
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse font-mono text-[11.5px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-os-dim">
                <th className="px-4 py-2 font-medium">{t('agents.cost.col.agent')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('agents.cost.col.runs')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('agents.cost.col.ok')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('agents.cost.col.avgTime')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('agents.cost.col.totalTime')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('agents.cost.col.tokens')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('agents.cost.col.avgCost')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('agents.cost.col.totalCost')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('agents.cost.col.lastRun')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agentId} className="border-t border-os-border hover:bg-os-surface-2">
                  <td className="px-4 py-2.5 font-sans font-semibold text-os-text">{r.name}</td>
                  <td className="px-3 py-2.5 text-right text-os-muted">{r.runs}</td>
                  <td className={`px-3 py-2.5 text-right ${r.successRate >= 0.9 ? 'text-os-ok' : r.successRate >= 0.6 ? 'text-os-warn' : 'text-os-err'}`}>
                    {pct(r.successRate)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-os-muted">{dur(r.avgMs)}</td>
                  <td className="px-3 py-2.5 text-right text-os-muted">{dur(r.totalMs)}</td>
                  <td className="px-3 py-2.5 text-right text-os-dim">{tok(r.tokensIn + r.tokensOut)}</td>
                  <td className="px-3 py-2.5 text-right text-os-muted">{money(r.avgCost)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-os-accent">{money(r.totalCost)}</td>
                  <td className="px-4 py-2.5 text-right text-os-dim">{rel(r.lastRunAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-os-dim">
                    No runs yet. Run an agent, or seed the demo data, to see costs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-os-border px-4 py-2 font-mono text-[9.5px] leading-relaxed text-os-dim">
          Estimated · token counts times model list price (Sonnet $3 / $15, Haiku $0.80 / $4 per 1M in / out). Not a billed figure.
        </div>
      </div>
    </section>
  );
}
