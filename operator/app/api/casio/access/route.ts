import { NextResponse } from 'next/server';
import { accessOverview } from '@/lib/rbac';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return NextResponse.json(accessOverview(request)); }
