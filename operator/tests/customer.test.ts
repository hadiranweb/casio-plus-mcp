import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ADVOCATE_REFERRALS,
  CustomerReceptor,
  canTransition,
  getCustomer,
  listCustomers,
} from '@/lib/customer';

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_CUSTOMER_STORE;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'casio-customer-'));
  dirs.push(d);
  process.env.CASIO_CUSTOMER_STORE = path.join(d, 'customers.json');
}

function fullJourney() {
  const r = CustomerReceptor.onboard({ name: 'Sara', businessName: 'Naghsh Studio' });
  CustomerReceptor.assess(r.id, 72, 'coach-1', 'ready to move');
  CustomerReceptor.match(r.id, 'coach-1');
  CustomerReceptor.hire(r.id, 'coach-1');
  return CustomerReceptor.retain(r.id, 'coach-1');
}

describe('customer aggregate (B3: customer as a level, not a field)', () => {
  it('onboards a customer at invited with an empty audit trail', () => {
    setup();
    const c = CustomerReceptor.onboard({ name: 'Sara', businessName: 'Naghsh Studio' });
    expect(c.id).toMatch(/^cust_/);
    expect(c.stage).toBe('invited');
    expect(c.transitions).toEqual([]);
    expect(c.referrals).toBe(0);
    expect(c.metrics).toEqual([]);
  });

  it('requires name and business name', () => {
    setup();
    expect(() => CustomerReceptor.onboard({ name: ' ', businessName: 'X' })).toThrow('customer_onboard_required_fields');
  });

  it('walks the lifecycle and records every transition', () => {
    setup();
    const c = fullJourney();
    expect(c.stage).toBe('retained');
    expect(c.transitions.map((t) => `${t.from}->${t.to}`)).toEqual([
      'invited->assessed',
      'assessed->matched',
      'matched->hired',
      'hired->retained',
    ]);
    expect(c.metrics).toHaveLength(1);
    expect(c.metrics[0].source).toBe('assessment');
    expect(c.metrics[0].score).toBe(72);
  });

  it('rejects illegal transitions instead of silently mutating', () => {
    setup();
    const c = CustomerReceptor.onboard({ name: 'Sara', businessName: 'Naghsh Studio' });
    expect(() => CustomerReceptor.hire(c.id, 'coach-1')).toThrow('customer_transition_invalid:invited->hired');
    expect(() => CustomerReceptor.churn('cust_missing', 'coach-1')).toThrow('customer_not_found');
    expect(canTransition('churned', 'retained')).toBe(false);
    expect(canTransition('invited', 'assessed')).toBe(true);
  });

  it('allows re-assessment without moving the stage', () => {
    setup();
    const c = fullJourney();
    const again = CustomerReceptor.assess(c.id, 90, 'coach-2');
    expect(again.stage).toBe('retained');
    expect(again.metrics).toHaveLength(2);
  });

  it('referrals are two-way: only after hire, and promote to advocate at threshold', () => {
    setup();
    const c = fullJourney();
    expect(() => CustomerReceptor.refer('cust_x', 'customer')).toThrow('customer_not_found');

    // referral not allowed before hired
    const fresh = CustomerReceptor.onboard({ name: 'A', businessName: 'B' });
    expect(() => CustomerReceptor.refer(fresh.id)).toThrow('customer_referral_not_allowed:invited');

    // referrals count up; advocate at threshold
    for (let i = 0; i < ADVOCATE_REFERRALS; i++) CustomerReceptor.refer(c.id, 'customer');
    const advocate = getCustomer(c.id)!;
    expect(advocate.stage).toBe('advocate');
    expect(advocate.referrals).toBe(ADVOCATE_REFERRALS);
    const last = advocate.transitions[advocate.transitions.length - 1];
    expect(last.from).toBe('retained');
    expect(last.to).toBe('advocate');
    expect(last.by).toBe('system');
  });

  it('a churned customer is terminal and listed in the store', () => {
    setup();
    const c = fullJourney();
    const churned = CustomerReceptor.churn(c.id, 'coach-1', 'no reply for 2 months');
    expect(churned.stage).toBe('churned');
    expect(() => CustomerReceptor.retain(c.id, 'coach-1')).toThrow('customer_transition_invalid:churned->retained');
    const all = listCustomers();
    expect(all.find((x) => x.id === c.id)?.stage).toBe('churned');
  });
});
