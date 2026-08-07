import { NextResponse } from 'next/server';
import { CoachingSessionInputSchema, coachingSummary, createCoachingSession, listCoachingSessions } from '@/lib/coaching-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = listCoachingSessions();
  return NextResponse.json({ sessions, summary: coachingSummary(sessions) });
}

export async function POST(request: Request) {
  try {
    const session = createCoachingSession(CoachingSessionInputSchema.parse(await request.json()));
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid coaching session' }, { status: 400 });
  }
}
