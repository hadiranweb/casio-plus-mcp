import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { assertExecutable, type AutomationSpec } from '@/lib/automation-spec';

const AcceptanceSchema = z.object({
  criterion: z.string(),
  status: z.enum(['passed', 'failed', 'not_verifiable']),
  detail: z.string().optional(),
});
export type AcceptanceEvaluation = z.infer<typeof AcceptanceSchema>;

const RunSchema = z.object({
  id: z.string(),
  specId: z.string(),
  status: z.enum(['completed', 'blocked']),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()),
  error: z.string().nullable(),
  acceptance: z.array(AcceptanceSchema).optional(),
  feedbackId: z.string().nullable().optional(),
});
export type AutomationRun = z.infer<typeof RunSchema>;

function file() {
  return process.env.CASIO_AUTOMATION_RUN_STORE ?? path.join(process.cwd(), 'data', 'automation-runs.json');
}
function read(): AutomationRun[] {
  const p = file();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]\n');
  const raw = fs.readFileSync(p, 'utf8').trim();
  return z.array(RunSchema).parse(raw ? JSON.parse(raw) : []);
}
function save(x: AutomationRun[]) {
  const p = file(),
    tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(x, null, 2)}\n`);
  fs.renameSync(tmp, p);
}
export function listAutomationRuns() {
  return read().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * Deterministic acceptance evaluation for one spec run.
 *
 * A criterion is machine-checkable only when it references a declared
 * `inputData` key: it passes when every referenced key is present and
 * non-empty, and fails otherwise. Criteria that reference no declared key —
 * or only `outputData` keys, which this runtime does not produce yet — are
 * marked `not_verifiable` instead of being silently treated as green:
 * a semantic check (LLM/human) is the honest next step for those.
 */
export function evaluateAcceptance(
  spec: Pick<AutomationSpec, 'inputData' | 'acceptanceCriteria'>,
  input: Record<string, unknown>,
): AcceptanceEvaluation[] {
  return spec.acceptanceCriteria.map((criterion) => {
    const referenced = spec.inputData.filter((key) => key && new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i').test(criterion));
    if (referenced.length === 0) {
      return {
        criterion,
        status: 'not_verifiable',
        detail: 'criterion references no declared input key — semantic check needed',
      };
    }
    const missing = referenced.filter((key) => !(key in input) || isEmptyValue(input[key]));
    if (missing.length > 0) {
      return { criterion, status: 'failed', detail: `missing or empty input: ${missing.join(', ')}` };
    }
    return { criterion, status: 'passed', detail: `inputs present: ${referenced.join(', ')}` };
  });
}

function isEmptyValue(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The feedback intake queue the MCP core reads (`data/feedback-intake.json`,
 * repo-root by default — the same file `src/intake-store.ts` uses). A failed
 * acceptance writes one record here so the human review loop sees the tool's
 * own outcome, not just knowledge feedback: tool → result → review → (future)
 * version proposal → better tool.
 */
function intakeFilePath(): string {
  return process.env.CASIO_FEEDBACK_INTAKE ?? path.resolve(process.cwd(), '..', 'data', 'feedback-intake.json');
}

type AcceptanceFeedbackRecord = {
  id: string;
  receivedAt: string;
  qualityStatus: 'validated';
  qualityReport: {
    valid: boolean;
    qualityStatus: 'validated';
    fingerprint: string;
    errors: { field: string; rule: string; message: string }[];
    warnings: { field: string; rule: string; message: string }[];
    checkedAt: string;
  };
  reviewStatus: 'pending_review';
  sourceSystem: 'automation-runtime';
  sourceType: 'acceptance_failed';
  submittedBy: 'automation-runtime';
  summary: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

function writeAcceptanceFeedback(
  spec: AutomationSpec,
  runId: string,
  input: Record<string, unknown>,
  acceptance: AcceptanceEvaluation[],
): string {
  const filePath = intakeFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let records: unknown[] = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) records = parsed;
    }
  }

  const failed = acceptance.filter((a) => a.status === 'failed');
  // The record itself is well-formed (source, time, payload, summary all
  // present) — the acceptance FAILURE is its content, not its quality. So it
  // enters the queue as `validated` with the failure carried in warnings:
  // per review-lifecycle, only validated feedback can be approved, and this
  // record must be approvable for the human loop to close (approve → version
  // proposal → better tool/playbook).
  const record: AcceptanceFeedbackRecord = {
    id: `fbk_${randomUUID()}`,
    receivedAt: new Date().toISOString(),
    qualityStatus: 'validated',
    qualityReport: {
      valid: true,
      qualityStatus: 'validated',
      fingerprint: createHash('sha256').update(JSON.stringify({ runId, specId: spec.id, failed })).digest('hex'),
      errors: [],
      warnings: [
        ...failed.map((a) => ({ field: 'acceptanceCriteria', rule: 'acceptance_failed', message: a.detail ?? a.criterion })),
        ...acceptance
          .filter((a) => a.status === 'not_verifiable')
          .map((a) => ({ field: 'acceptanceCriteria', rule: 'not_verifiable', message: a.criterion })),
      ],
      checkedAt: new Date().toISOString(),
    },
    reviewStatus: 'pending_review',
    sourceSystem: 'automation-runtime',
    sourceType: 'acceptance_failed',
    submittedBy: 'automation-runtime',
    summary: `Automation «${spec.title}» (${spec.id}) failed acceptance: ${failed.map((a) => a.criterion).join(' | ')}`,
    occurredAt: new Date().toISOString(),
    payload: { specId: spec.id, runId, acceptance, input },
  };
  records.push(record);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
  return record.id;
}

export function executeAutomationSpec(specId: string, input: Record<string, unknown>): AutomationRun {
  const startedAt = new Date().toISOString();
  const runId = `run_${randomUUID()}`;
  let run: AutomationRun;
  try {
    const spec: AutomationSpec = assertExecutable(specId);
    const missing = spec.inputData.filter((key) => !(key in input));
    if (missing.length) throw new Error(`automation_input_missing:${missing.join(',')}`);

    const acceptance = evaluateAcceptance(spec, input);
    const failed = acceptance.filter((a) => a.status === 'failed');
    const feedbackId = failed.length ? writeAcceptanceFeedback(spec, runId, input, acceptance) : null;

    run = {
      id: runId,
      specId,
      status: failed.length ? 'blocked' : 'completed',
      startedAt,
      finishedAt: new Date().toISOString(),
      input,
      output: {
        specTitle: spec.title,
        acceptedInputKeys: Object.keys(input),
        declaredOutputs: spec.outputData,
        mode: 'approved-policy-runtime',
      },
      error: failed.length
        ? `automation_acceptance_failed:${failed.map((a) => a.criterion).join(' | ')}`
        : null,
      acceptance,
      feedbackId,
    };
  } catch (error) {
    run = {
      id: runId,
      specId,
      status: 'blocked',
      startedAt,
      finishedAt: new Date().toISOString(),
      input,
      output: {},
      error: error instanceof Error ? error.message : 'automation_execution_failed',
      feedbackId: null,
    };
  }
  const runs = read();
  runs.push(run);
  save(runs);
  return run;
}
