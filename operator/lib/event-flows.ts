/**
 * Event Flow registry — the General Plan's 3.4: flows are declarative
 * (event-flows.yaml) and validated at load time against a fixed step
 * vocabulary. A flow that names an unknown step is refused loudly instead of
 * silently running a typo'd pipeline — same fail-fast honesty as the
 * feedback gate and the measurement receptor.
 */

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';

export const FLOW_STEP_VOCABULARY = [
  'validate',
  'queue',
  'audit',
  'check_convergence',
  'cache_check',
  'search',
  'return',
  'execute',
  'measure_against_acceptance',
  'converge',
] as const;
export type FlowStep = (typeof FLOW_STEP_VOCABULARY)[number];

export type EventFlow = {
  triggers: string[];
  steps: FlowStep[];
};

export type EventFlows = {
  version: number;
  flows: Record<string, EventFlow>;
};

export const DEFAULT_EVENT_FLOWS_PATH = path.join(process.cwd(), 'event-flows.yaml');

function isFlowStep(value: string): value is FlowStep {
  return (FLOW_STEP_VOCABULARY as readonly string[]).includes(value);
}

const eventFlowsSchema = z.object({
  version: z.number().int().positive(),
  flows: z.record(
    z.object({
      triggers: z.array(z.string().min(1)).min(1),
      steps: z.array(z.string().min(1)).min(1),
    }),
  ),
});

/**
 * Validate a parsed event-flows document. Throws on unknown steps (with the
 * flow name), empty flows, or a malformed shape.
 */
export function validateEventFlows(data: unknown): EventFlows {
  const parsed = eventFlowsSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`event_flows_invalid: ${parsed.error.message}`);
  }
  for (const [name, flow] of Object.entries(parsed.data.flows)) {
    for (const step of flow.steps) {
      if (!isFlowStep(step)) {
        throw new Error(`event_flow_unknown_step:${name}:${step}`);
      }
    }
  }
  return parsed.data as EventFlows;
}

/** Load + validate the shipped event-flows.yaml. */
export function loadEventFlows(filePath = DEFAULT_EVENT_FLOWS_PATH): EventFlows {
  const raw = fs.readFileSync(filePath, 'utf8');
  return validateEventFlows(YAML.parse(raw));
}
