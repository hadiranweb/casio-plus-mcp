/**
 * Measurement Receptor — the formal contract behind Measurement Closure
 * (General Plan, principle 8): every tool result is measured against its own
 * acceptance criteria, and the measurement yields a machine-readable report
 * plus a tool event (ToolSucceeded / ToolFailed / ToolUnverifiable).
 *
 * The receptor is deliberately framework-free and deterministic — the same
 * idea as the Rust side's `measure_against_criteria(result, criteria) ->
 * MeasurementReport` from the General Plan, implemented as a pure TS module.
 *
 * Semantics:
 * - a criterion is machine-checkable only when it references a declared
 *   input key: passed when every referenced key is present and non-empty,
 *   failed otherwise;
 * - a criterion referencing no declared key (or only declared outputs,
 *   which this runtime does not produce yet) is `not_verifiable` — honestly
 *   labelled, never faked green;
 * - the tool event is derived from the report: any failed → ToolFailed,
 *   otherwise any passed → ToolSucceeded, otherwise ToolUnverifiable.
 */

export type MeasurementStatus = 'passed' | 'failed' | 'not_verifiable';

export type Measurement = {
  criterion: string;
  status: MeasurementStatus;
  detail?: string;
};

export type MeasurementReport = {
  measurements: Measurement[];
  event: ToolEvent;
};

export type ToolEvent = 'ToolSucceeded' | 'ToolFailed' | 'ToolUnverifiable';

function isEmptyValue(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deterministic measurement of a result against acceptance criteria, using
 * the declared input keys as the machine-checkable vocabulary.
 */
export function measureAgainstCriteria(
  result: Record<string, unknown>,
  criteria: string[],
  declaredInputs: string[],
): Measurement[] {
  return criteria.map((criterion) => {
    const referenced = declaredInputs.filter((key) => key && new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i').test(criterion));
    if (referenced.length === 0) {
      return {
        criterion,
        status: 'not_verifiable',
        detail: 'criterion references no declared input key — semantic check needed',
      };
    }
    const missing = referenced.filter((key) => !(key in result) || isEmptyValue(result[key]));
    if (missing.length > 0) {
      return { criterion, status: 'failed', detail: `missing or empty input: ${missing.join(', ')}` };
    }
    return { criterion, status: 'passed', detail: `inputs present: ${referenced.join(', ')}` };
  });
}

/** Derive the tool event from a measurement report. */
export function toolEventFor(measurements: Measurement[]): ToolEvent {
  if (measurements.some((m) => m.status === 'failed')) return 'ToolFailed';
  if (measurements.some((m) => m.status === 'passed')) return 'ToolSucceeded';
  return 'ToolUnverifiable';
}

/** Convenience: measure + derive the event in one call. */
export function measureAgainstCriteriaFull(
  result: Record<string, unknown>,
  criteria: string[],
  declaredInputs: string[],
): MeasurementReport {
  const measurements = measureAgainstCriteria(result, criteria, declaredInputs);
  return { measurements, event: toolEventFor(measurements) };
}
