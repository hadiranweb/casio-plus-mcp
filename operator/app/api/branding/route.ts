import { NextResponse } from 'next/server';
import { loadBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

/** Branding for client components: platform name + workspace display name. */
export async function GET() {
  return NextResponse.json(loadBranding());
}
