import { NextResponse } from 'next/server';
import { executeAutomationSpec } from '@/lib/automation-run';
import { requirePermission } from '@/lib/rbac';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:{id:string}}){const access=requirePermission(request,'execute:automation');if('response'in access)return access.response;const body=await request.json().catch(()=>({}));const run=executeAutomationSpec(params.id,body.input??{});return NextResponse.json({run},{status:run.status==='completed'?200:409});}
