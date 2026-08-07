import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const CasioMetricStatusSchema = z.enum(['green', 'yellow', 'red']);
export type CasioMetricStatus = z.infer<typeof CasioMetricStatusSchema>;

export const CasioMetricRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  learnerName: z.string().min(1),
  actionScore: z.number().min(0).max(100),
  status: CasioMetricStatusSchema,
  nextAction: z.string().min(1),
  source: z.string().min(1),
  note: z.string().default(''),
  updatedAt: z.string().datetime(),
});
export type CasioMetricRecord = z.infer<typeof CasioMetricRecordSchema>;

export const CasioMetricInputSchema = z.object({
  learnerId: z.string().min(1),
  learnerName: z.string().min(1),
  actionScore: z.number().min(0).max(100),
  nextAction: z.string().min(1),
  source: z.string().min(1),
  note: z.string().optional().default(''),
});
export type CasioMetricInput = z.infer<typeof CasioMetricInputSchema>;

function getStorePath(): string {
  return process.env.CASIO_METRIC_STORE ?? path.join(process.cwd(), 'data', 'casio-metric.json');
}

export function statusForScore(score: number): CasioMetricStatus {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

function ensureStore(): void {
  const storePath = getStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) fs.writeFileSync(storePath, '[]\n', 'utf8');
}

function loadRaw(): CasioMetricRecord[] {
  ensureStore();
  const storePath = getStorePath();
  const raw = fs.readFileSync(storePath, 'utf8').trim();
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  return z.array(CasioMetricRecordSchema).parse(parsed);
}

function save(records: CasioMetricRecord[]): void {
  ensureStore();
  const storePath = getStorePath();
  const temp = `${storePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, storePath);
}

export function listCasioMetric(): CasioMetricRecord[] {
  return loadRaw().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertCasioMetric(input: CasioMetricInput): CasioMetricRecord {
  const records = loadRaw();
  const index = records.findIndex((record) => record.learnerId === input.learnerId);
  const record: CasioMetricRecord = {
    id: index >= 0 ? records[index].id : `metric_${randomUUID()}`,
    ...input,
    status: statusForScore(input.actionScore),
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) records[index] = record;
  else records.push(record);
  save(records);
  return record;
}

export function casioMetricSummary(records = listCasioMetric()) {
  const count = (status: CasioMetricStatus) => records.filter((record) => record.status === status).length;
  return {
    total: records.length,
    green: count('green'),
    yellow: count('yellow'),
    red: count('red'),
    averageScore: records.length ? Math.round(records.reduce((sum, record) => sum + record.actionScore, 0) / records.length) : null,
  };
}
