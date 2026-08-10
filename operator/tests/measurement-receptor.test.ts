import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  measureAgainstCriteria,
  measureAgainstCriteriaFull,
  toolEventFor,
  type Measurement,
} from '@/lib/measurement-receptor';

describe('measurement receptor (Measurement Closure, principle 8)', () => {
  it('passes when every referenced input key is present and non-empty', () => {
    const report = measureAgainstCriteria({ score: 80 }, ['score is provided'], ['score']);
    expect(report).toEqual([{ criterion: 'score is provided', status: 'passed', detail: 'inputs present: score' }]);
    expect(toolEventFor(report)).toBe('ToolSucceeded');
  });

  it('fails when a referenced input is missing or empty', () => {
    expect(measureAgainstCriteria({}, ['score is provided'], ['score'])[0].status).toBe('failed');
    expect(measureAgainstCriteria({ score: '' }, ['score is provided'], ['score'])[0].status).toBe('failed');
    expect(measureAgainstCriteria({ score: [] }, ['score is provided'], ['score'])[0].status).toBe('failed');
    expect(toolEventFor(measureAgainstCriteria({}, ['score is provided'], ['score']))).toBe('ToolFailed');
  });

  it('marks criteria that reference no declared key as not_verifiable', () => {
    const report = measureAgainstCriteria({ score: 80 }, ['the report looks valid'], ['score']);
    expect(report[0].status).toBe('not_verifiable');
    expect(toolEventFor(report)).toBe('ToolUnverifiable');
  });

  it('derives ToolFailed over ToolSucceeded when any criterion fails', () => {
    const report = measureAgainstCriteria(
      { score: 80 },
      ['score is provided', 'name is provided'],
      ['score', 'name'],
    );
    expect(report.map((m) => m.status)).toEqual(['passed', 'failed']);
    expect(toolEventFor(report)).toBe('ToolFailed');
  });

  it('full report bundles measurements and the event', () => {
    const full = measureAgainstCriteriaFull({ score: 80 }, ['score is provided'], ['score']);
    expect(full.measurements).toHaveLength(1);
    expect(full.event).toBe('ToolSucceeded');
  });

  it('handles empty criteria and empty inputs gracefully', () => {
    expect(measureAgainstCriteria({}, [], [])).toEqual([]);
    const m: Measurement[] = measureAgainstCriteria({}, ['x exists'], []);
    expect(m[0].status).toBe('not_verifiable');
  });
});
