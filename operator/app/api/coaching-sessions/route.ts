import { NextResponse } from 'next/server';
import { CoachingSessionInputSchema, coachingSummary, createCoachingSession, listCoachingSessions } from '@/lib/coaching-session';
import { requirePermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = listCoachingSessions();
  return NextResponse.json({ sessions, summary: coachingSummary(sessions) });
}

export async function POST(request: Request) {
  const access = requirePermission('write:coaching');
  if ('response' in access) return access.response;
  try {
    const session = createCoachingSession(CoachingSessionInputSchema.parse(await request.json()));
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid coaching session' }, { status: 400 });
  }
}
