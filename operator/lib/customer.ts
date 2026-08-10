/**
 * Customer Aggregate — the General Plan's B3: a customer is a LEVEL with its
 * own lifecycle and boundary, not a bare `learnerId` field.
 *
 * Lifecycle: invited → assessed → matched → hired → retained → advocate,
 * with `churned` reachable from every pre-advocate stage (and terminal).
 * Every transition is recorded (who/when/note) — an append-only event trail
 * per customer, so the journey is auditable like the knowledge loop.
 *
 * The CustomerReceptor is the shared contract between the customer-journey
 * island and the hub: onboard / assess / match / hire / retain / churn /
 * refer. Referrals are the two-way side of the organism — a customer is both
 * a service receiver and a feedback/referral producer.
 *
 * Store: JSON file (env-overridable), same atomic-rename pattern as the
 * coaching/metric stores. Framework-free; zod-validated on the way out.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const CustomerStageSchema = z.enum([
  'invited',
  'assessed',
  'matched',
  'hired',
  'retained',
  'churned',
  'advocate',
]);
export type CustomerStage = z.infer<typeof CustomerStageSchema>;

export const CustomerTransitionSchema = z.object({
  from: CustomerStageSchema,
  to: CustomerStageSchema,
  at: z.string().datetime(),
  by: z.string().min(1),
  note: z.string().optional(),
});
export type CustomerTransition = z.infer<typeof CustomerTransitionSchema>;

export const CustomerMetricSchema = z.object({
  source: z.string().min(1),
  score: z.number().min(0).max(100),
  at: z.string().datetime(),
});
export type CustomerMetric = z.infer<typeof CustomerMetricSchema>;

export const CustomerRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  businessName: z.string().min(1),
  stage: CustomerStageSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  transitions: z.array(CustomerTransitionSchema).default([]),
  referrals: z.number().int().min(0).default(0),
  metrics: z.array(CustomerMetricSchema).default([]),
});
export type CustomerRecord = z.infer<typeof CustomerRecordSchema>;

export type CustomerOnboardInput = {
  name: string;
  businessName: string;
};

/** The lifecycle DAG — the only legal moves. Churned and advocate are terminal. */
const ALLOWED_TRANSITIONS: Record<CustomerStage, CustomerStage[]> = {
  invited: ['assessed', 'churned'],
  assessed: ['matched', 'churned'],
  matched: ['hired', 'churned'],
  hired: ['retained', 'churned'],
  retained: ['advocate', 'churned'],
  churned: [],
  advocate: [],
};

/** How many referrals promote a retained customer to advocate. */
export const ADVOCATE_REFERRALS = 3;

export function canTransition(from: CustomerStage, to: CustomerStage): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function storePath(): string {
  return process.env.CASIO_CUSTOMER_STORE ?? path.join(process.cwd(), 'data', 'customers.json');
}

function read(): CustomerRecord[] {
  const p = storePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]\n', 'utf8');
  const raw = fs.readFileSync(p, 'utf8').trim();
  return z.array(CustomerRecordSchema).parse(raw ? JSON.parse(raw) : []);
}

function save(records: CustomerRecord[]): void {
  const p = storePath();
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

export function listCustomers(): CustomerRecord[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCustomer(id: string): CustomerRecord | undefined {
  return read().find((c) => c.id === id);
}

function move(records: CustomerRecord[], id: string, to: CustomerStage, by: string, note?: string): CustomerRecord {
  const i = records.findIndex((c) => c.id === id);
  if (i < 0) throw new Error('customer_not_found');
  const from = records[i].stage;
  if (!canTransition(from, to)) throw new Error(`customer_transition_invalid:${from}->${to}`);
  const at = new Date().toISOString();
  const record: CustomerRecord = {
    ...records[i],
    stage: to,
    updatedAt: at,
    transitions: [...records[i].transitions, { from, to, at, by, note }],
  };
  records[i] = record;
  save(records);
  return record;
}

/** Onboard a new customer — the receptor's `onboard()`; stage = invited. */
export function onboardCustomer(input: CustomerOnboardInput): CustomerRecord {
  const name = input.name.trim();
  const businessName = input.businessName.trim();
  if (!name || !businessName) throw new Error('customer_onboard_required_fields');
  const records = read();
  const record: CustomerRecord = {
    id: `cust_${randomUUID()}`,
    name,
    businessName,
    stage: 'invited',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transitions: [],
    referrals: 0,
    metrics: [],
  };
  records.push(record);
  save(records);
  return record;
}

function withMetrics(records: CustomerRecord[], id: string, metric: CustomerMetric): CustomerRecord {
  const i = records.findIndex((c) => c.id === id);
  if (i < 0) throw new Error('customer_not_found');
  const record: CustomerRecord = { ...records[i], metrics: [...records[i].metrics, metric], updatedAt: new Date().toISOString() };
  records[i] = record;
  save(records);
  return record;
}

function moveWithMetric(
  records: CustomerRecord[],
  id: string,
  to: CustomerStage,
  score: number,
  source: string,
  by: string,
  note?: string,
): CustomerRecord {
  const i = records.findIndex((c) => c.id === id);
  if (i < 0) throw new Error('customer_not_found');
  const current = records[i];
  if (current.stage === 'churned') throw new Error(`customer_transition_invalid:churned->${to}`);
  // A metric is recorded on any live stage (re-assessment); the stage only
  // moves when the customer is still invited (invited → assessed).
  const metric: CustomerMetric = { source, score, at: new Date().toISOString() };
  const record: CustomerRecord = { ...current, metrics: [...current.metrics, metric], updatedAt: new Date().toISOString() };
  records[i] = record;
  save(records);
  if (current.stage === 'invited') return move(records, id, to, by, note);
  return record;
}

/**
 * The shared contract between the customer-journey island and the hub.
 * Every method is a guarded transition; illegal moves throw
 * `customer_transition_invalid:<from>-><to>` instead of silently mutating.
 */
export const CustomerReceptor = {
  onboard(input: CustomerOnboardInput): CustomerRecord {
    return onboardCustomer(input);
  },

  /** Records a metric and moves invited → assessed (re-assessment allowed). */
  assess(id: string, score: number, by: string, note?: string): CustomerRecord {
    const records = read();
    return moveWithMetric(records, id, 'assessed', score, 'assessment', by, note);
  },

  match(id: string, by: string, note?: string): CustomerRecord {
    return move(read(), id, 'matched', by, note);
  },

  hire(id: string, by: string, note?: string): CustomerRecord {
    return move(read(), id, 'hired', by, note);
  },

  retain(id: string, by: string, note?: string): CustomerRecord {
    return move(read(), id, 'retained', by, note);
  },

  churn(id: string, by: string, note?: string): CustomerRecord {
    return move(read(), id, 'churned', by, note);
  },

  /**
   * The two-way side: a customer produces referrals. Allowed once hired.
   * At ADVOCATE_REFERRALS referrals a retained customer is promoted to
   * advocate (recorded as a system transition).
   */
  refer(id: string, by = 'customer', note?: string): CustomerRecord {
    const records = read();
    const i = records.findIndex((c) => c.id === id);
    if (i < 0) throw new Error('customer_not_found');
    const current = records[i];
    if (!['hired', 'retained', 'advocate'].includes(current.stage)) {
      throw new Error(`customer_referral_not_allowed:${current.stage}`);
    }
    const referrals = current.referrals + 1;
    let record: CustomerRecord = { ...current, referrals, updatedAt: new Date().toISOString() };
    records[i] = record;
    save(records);
    if (referrals >= ADVOCATE_REFERRALS && record.stage === 'retained') {
      record = move(records, id, 'advocate', 'system', 'referral threshold reached');
    }
    return record;
  },
};
