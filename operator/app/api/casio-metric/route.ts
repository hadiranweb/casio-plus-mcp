import { NextResponse } from 'next/server';
import { CasioMetricInputSchema, casioMetricSummary, listCasioMetric, upsertCasioMetric } from '@/lib/casio-metric';
import { requirePermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  const records = listCasioMetric();
  return NextResponse.json({ records, summary: casioMetricSummary(records) });
}

export async function POST(request: Request) {
  const access = requirePermission('write:metric');
  if ('response' in access) return access.response;
  try {
    const input = CasioMetricInputSchema.parse(await request.json());
    const record = upsertCasioMetric(input);
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid metric record' }, { status: 400 });
  }
}
