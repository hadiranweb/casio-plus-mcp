import { describe, expect, it } from 'vitest';
import { openDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { seedCasioOperator } from '@/lib/casio-seed';

describe('CasioPlus data injection', () => {
  it('replaces the upstream department and agent roster with the Casio model', () => {
    const db = openDb(':memory:');
    seedDatabase(db);
    seedCasioOperator(db);

    const departments = db.departments.all();
    const agents = db.agents.all();
    const metrics = db.metrics.all();
    const domains = db.domains.all();

    expect(departments).toHaveLength(6);
    expect(departments.map((department) => department.name)).toContain('هسته دانش');
    expect(agents).toHaveLength(8);
    expect(agents.map((agent) => agent.role)).toContain('معمار سیستمسازی');
    expect(metrics.find((metric) => metric.key === 'casio_assets')?.value).toBe(56);
    expect(domains.find((domain) => domain.title === 'آموزش و کوچینگ')?.items.length).toBeGreaterThan(0);
  });
});
