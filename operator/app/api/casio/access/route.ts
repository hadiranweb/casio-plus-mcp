import { NextResponse } from 'next/server';
import { accessOverview } from '@/lib/rbac';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json(accessOverview()); }
