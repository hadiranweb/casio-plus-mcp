import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const dirs: string[] = [];
afterEach(() => {
  delete process.env.CASIO_AUTOMATION_STORE;
  delete process.env.CASIO_AUTOMATION_RUN_STORE;
  delete process.env.CASIO_FEEDBACK_INTAKE;
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function setup() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'casio-accept-'));
  dirs.push(d);
  process.env.CASIO_AUTOMATION_STORE = path.join(d, 'specs.json');
  process.env.CASIO_AUTOMATION_RUN_STORE = path.join(d, 'runs.json');
  process.env.CASIO_FEEDBACK_INTAKE = path.join(d, 'feedback-intake.json');
}

async function approveSpec(overrides: Record<string, unknown> = {}) {
  const spec = await import('@/lib/automation-spec');
  const item = spec.createAutomationSpec({
    title: 'Automation under test',
    problem: 'manual work',
    owner: 'owner',
    inputData: ['score'],
    outputData: ['status'],
    processingLogic: 'classify',
    exceptions: [],
    acceptanceCriteria: ['score is provided'],
    riskLevel: 'low',
    requiredPermission: 'execute:automation',
    ...overrides,
  } as never);
  spec.requestAutomationApproval(item.id);
  spec.decideAutomationApproval(item.id, 'approved', 'reviewer', 'approved');
  return item;
}

describe('automation acceptance evaluation', () => {
  it('passes when every referenced input key is present and non-empty', async () => {
    setup();
    const run = await import('@/lib/automation-run');
    const item = await approveSpec();
    const result = run.executeAutomationSpec(item.id, { score: 80 });
    expect(result.status).toBe('completed');
    expect(result.acceptance).toEqual([
      { criterion: 'score is provided', status: 'passed', detail: 'inputs present: score' },
    ]);
    expect(result.error).toBeNull();
    // no failures → no feedback record written
    expect(fs.existsSync(process.env.CASIO_FEEDBACK_INTAKE!)).toBe(false);
  });

  it('blocks and routes to the feedback queue when a referenced input is empty', async () => {
    setup();
    const run = await import('@/lib/automation-run');
    const item = await approveSpec();
    const result = run.executeAutomationSpec(item.id, { score: '' });
    expect(result.status).toBe('blocked');
    expect(result.error).toContain('automation_acceptance_failed');
    expect(result.acceptance?.[0].status).toBe('failed');
    expect(result.feedbackId).toBeTruthy();

    const raw = fs.readFileSync(process.env.CASIO_FEEDBACK_INTAKE!, 'utf8');
    const records = JSON.parse(raw);
    expect(records).toHaveLength(1);
    expect(records[0].sourceSystem).toBe('automation-runtime');
    expect(records[0].sourceType).toBe('acceptance_failed');
    expect(records[0].qualityStatus).toBe('raw');
    expect(records[0].reviewStatus).toBe('pending_review');
    expect(records[0].payload.specId).toBe(item.id);
    expect(records[0].summary).toContain('failed acceptance');
  });

  it('treats an empty value as failed, not passed', async () => {
    setup();
    const run = await import('@/lib/automation-run');
    const item = await approveSpec();
    const result = run.executeAutomationSpec(item.id, { score: '' });
    expect(result.status).toBe('blocked');
    expect(result.acceptance?.[0].status).toBe('failed');
  });

  it('marks criteria that reference no declared key as not_verifiable without blocking', async () => {
    setup();
    const run = await import('@/lib/automation-run');
    const item = await approveSpec({ acceptanceCriteria: ['the report looks valid'] });
    const result = run.executeAutomationSpec(item.id, { score: 80 });
    expect(result.status).toBe('completed');
    expect(result.acceptance?.[0]).toMatchObject({ status: 'not_verifiable' });
    // not_verifiable alone is surfaced on the run, not spammed into the queue
    expect(fs.existsSync(process.env.CASIO_FEEDBACK_INTAKE!)).toBe(false);
  });

  it('keeps the input contract: a missing key blocks as input_missing before acceptance runs', async () => {
    setup();
    const run = await import('@/lib/automation-run');
    const item = await approveSpec();
    const result = run.executeAutomationSpec(item.id, {});
    expect(result.status).toBe('blocked');
    expect(result.error).toContain('automation_input_missing');
    expect(result.acceptance).toBeUndefined();
    expect(fs.existsSync(process.env.CASIO_FEEDBACK_INTAKE!)).toBe(false);
  });

  it('keeps prior feedback records and appends without clobbering', async () => {
    setup();
    const run = await import('@/lib/automation-run');
    const item = await approveSpec();
    run.executeAutomationSpec(item.id, { score: '' });
    run.executeAutomationSpec(item.id, { score: '' });
    const records = JSON.parse(fs.readFileSync(process.env.CASIO_FEEDBACK_INTAKE!, 'utf8'));
    expect(records).toHaveLength(2);
    expect(records[0].id).not.toBe(records[1].id);
  });
});
