import { afterEach, describe, expect, it } from 'vitest';
import { loadEventFlows, validateEventFlows, FLOW_STEP_VOCABULARY } from '@/lib/event-flows';

describe('event flows (declarative, General Plan 3.4)', () => {
  it('the shipped event-flows.yaml loads and validates', () => {
    const flows = loadEventFlows();
    expect(flows.version).toBe(1);
    expect(Object.keys(flows.flows)).toEqual(['feedback.submitted', 'knowledge.searched', 'tool.executed']);
    // Measurement Closure lives in the tool.executed flow
    expect(flows.flows['tool.executed'].steps).toContain('measure_against_acceptance');
    expect(flows.flows['tool.executed'].steps).toEqual([
      'validate',
      'execute',
      'measure_against_acceptance',
      'audit',
      'converge',
    ]);
    expect(flows.flows['feedback.submitted'].steps).toEqual(['validate', 'queue', 'audit', 'check_convergence']);
  });

  it('rejects an unknown step with the flow name', () => {
    expect(() =>
      validateEventFlows({
        version: 1,
        flows: { 'tool.executed': { triggers: ['tool.executed'], steps: ['execute', 'do_a_barrel_roll'] } },
      }),
    ).toThrow('event_flow_unknown_step:tool.executed:do_a_barrel_roll');
  });

  it('rejects malformed shapes and empty flows', () => {
    expect(() => validateEventFlows({ version: 0, flows: {} })).toThrow('event_flows_invalid');
    expect(() =>
      validateEventFlows({ version: 1, flows: { x: { triggers: [], steps: ['audit'] } } }),
    ).toThrow('event_flows_invalid');
  });

  it('every step in the vocabulary is a string the hub can route on', () => {
    expect(FLOW_STEP_VOCABULARY.length).toBeGreaterThanOrEqual(10);
    for (const step of FLOW_STEP_VOCABULARY) expect(typeof step).toBe('string');
  });
});
