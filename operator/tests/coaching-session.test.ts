import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const dirs: string[] = [];
afterEach(() => { delete process.env.CASIO_COACHING_STORE; for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

function setStore() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'casio-coaching-')); dirs.push(dir); process.env.CASIO_COACHING_STORE = path.join(dir, 'sessions.json'); }

describe('Casio coaching sessions', () => {
  it('creates a coaching session with an actionable plan', async () => {
    setStore();
    const { createCoachingSession, coachingSummary } = await import('@/lib/coaching-session');
    const session = createCoachingSession({ sessionNumber: 1, coach: 'کوچ ارشد', learnerId: 'learner-01', learnerName: 'دانش‌پذیر نمونه', businessName: 'کسب‌وکار نمونه', goal: 'ساخت سیستم فروش', issue: 'پیگیری نامنظم لیدها', bottleneck: 'نبود مسئول پیگیری', probableCause: 'مالکیت نامشخص', readinessScore: 6, commitment: 'ثبت pipeline تا جلسه بعد', barrier: '', supportNotes: '', actions: [{ title: 'ثبت ۲۰ لید موجود', owner: 'دانش‌پذیر نمونه', successCriteria: '۲۰ لید در رجیستری', status: 'open' }] });
    expect(session.actions).toHaveLength(1);
    expect(session.id).toMatch(/^coach_/);
    expect(coachingSummary().openActions).toBe(1);
  });
});
