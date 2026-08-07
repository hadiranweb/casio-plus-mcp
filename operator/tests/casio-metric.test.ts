import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const files: string[] = [];

function freshStore(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'casio-metric-'));
  const file = path.join(dir, 'metric.json');
  files.push(dir);
  return file;
}

afterEach(() => { for (const dir of files.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('Casio Metric policy', () => {
  it('classifies action scores by the official green/yellow/red ranges', async () => {
    const { statusForScore } = await import('@/lib/casio-metric');
    expect(statusForScore(100)).toBe('green');
    expect(statusForScore(70)).toBe('green');
    expect(statusForScore(69)).toBe('yellow');
    expect(statusForScore(40)).toBe('yellow');
    expect(statusForScore(39)).toBe('red');
  });

  it('persists an upserted learner metric record', async () => {
    process.env.CASIO_METRIC_STORE = freshStore();
    // Dynamic import gets a fresh module path only once per test process; this
    // test writes one isolated store path before loading the store functions.
    const mod = await import('@/lib/casio-metric');
    const record = mod.upsertCasioMetric({ learnerId: 'learner-1', learnerName: 'نمونه دانش‌پذیر', actionScore: 75, nextAction: 'ارائه تجربه در کارگاه', source: 'coaching-session', note: '' });
    expect(record.status).toBe('green');
    expect(mod.casioMetricSummary().green).toBeGreaterThanOrEqual(1);
  });
});
