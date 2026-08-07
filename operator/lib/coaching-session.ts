import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const ActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  owner: z.string().min(1),
  dueDate: z.string().optional(),
  successCriteria: z.string().min(1),
  status: z.enum(['open', 'done', 'blocked']).default('open'),
});

export const CoachingSessionSchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().datetime(),
  sessionNumber: z.number().int().positive(),
  coach: z.string().min(1),
  learnerId: z.string().min(1),
  learnerName: z.string().min(1),
  businessName: z.string().min(1),
  goal: z.string().min(1),
  issue: z.string().min(1),
  bottleneck: z.string().min(1),
  probableCause: z.string().default(''),
  readinessScore: z.number().int().min(1).max(10),
  commitment: z.string().min(1),
  barrier: z.string().default(''),
  supportNotes: z.string().default(''),
  actions: z.array(ActionSchema).min(1),
});
export type CoachingSession = z.infer<typeof CoachingSessionSchema>;

export const CoachingSessionInputSchema = CoachingSessionSchema.omit({ id: true, occurredAt: true, actions: true }).extend({
  occurredAt: z.string().datetime().optional(),
  actions: z.array(ActionSchema.omit({ id: true }).extend({ id: z.string().optional() })).min(1),
});
export type CoachingSessionInput = z.infer<typeof CoachingSessionInputSchema>;

function getStorePath(): string { return process.env.CASIO_COACHING_STORE ?? path.join(process.cwd(), 'data', 'coaching-sessions.json'); }
function ensureStore(): void { const p = getStorePath(); fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p)) fs.writeFileSync(p, '[]\n', 'utf8'); }
function readSessions(): CoachingSession[] { ensureStore(); const raw = fs.readFileSync(getStorePath(), 'utf8').trim(); return z.array(CoachingSessionSchema).parse(raw ? JSON.parse(raw) : []); }
function saveSessions(sessions: CoachingSession[]): void { ensureStore(); const p = getStorePath(); const tmp = `${p}.${process.pid}.${Date.now()}.tmp`; fs.writeFileSync(tmp, `${JSON.stringify(sessions, null, 2)}\n`, 'utf8'); fs.renameSync(tmp, p); }

export function listCoachingSessions(): CoachingSession[] { return readSessions().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)); }
export function createCoachingSession(input: CoachingSessionInput): CoachingSession {
  const session: CoachingSession = {
    ...input,
    id: `coach_${randomUUID()}`,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    actions: input.actions.map((action) => ({ ...action, id: action.id ?? `action_${randomUUID()}` })),
  };
  const sessions = readSessions(); sessions.push(session); saveSessions(sessions); return session;
}

export function coachingSummary(sessions = listCoachingSessions()) {
  const actions = sessions.flatMap((session) => session.actions);
  return { sessions: sessions.length, openActions: actions.filter((action) => action.status === 'open').length, blockedActions: actions.filter((action) => action.status === 'blocked').length, averageReadiness: sessions.length ? Math.round(sessions.reduce((sum, session) => sum + session.readinessScore, 0) / sessions.length * 10) / 10 : null };
}
