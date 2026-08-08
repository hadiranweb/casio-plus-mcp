import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const AutomationStatusSchema = z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'retired']);
export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type AutomationStatus = z.infer<typeof AutomationStatusSchema>;

export const AutomationSpecSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), problem: z.string().min(1), owner: z.string().min(1),
  inputData: z.array(z.string()).min(1), outputData: z.array(z.string()).min(1), processingLogic: z.string().min(1),
  exceptions: z.array(z.string()), acceptanceCriteria: z.array(z.string()).min(1), riskLevel: RiskLevelSchema,
  requiredPermission: z.string().min(1), status: AutomationStatusSchema, createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  approval: z.object({ reviewer: z.string(), decidedAt: z.string().datetime(), note: z.string() }).nullable(),
});
export type AutomationSpec = z.infer<typeof AutomationSpecSchema>;
export const AutomationSpecInputSchema = AutomationSpecSchema.omit({ id: true, status: true, createdAt: true, updatedAt: true, approval: true });
export type AutomationSpecInput = z.infer<typeof AutomationSpecInputSchema>;

function filePath(){ return process.env.CASIO_AUTOMATION_STORE ?? path.join(process.cwd(), 'data', 'automation-specs.json'); }
function read(){ const p=filePath(); fs.mkdirSync(path.dirname(p),{recursive:true}); if(!fs.existsSync(p)) fs.writeFileSync(p,'[]\n'); const raw=fs.readFileSync(p,'utf8').trim(); return z.array(AutomationSpecSchema).parse(raw?JSON.parse(raw):[]); }
function save(items:AutomationSpec[]){const p=filePath(),tmp=`${p}.${process.pid}.${Date.now()}.tmp`;fs.writeFileSync(tmp,`${JSON.stringify(items,null,2)}\n`);fs.renameSync(tmp,p);}
export function listAutomationSpecs(){return read().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function createAutomationSpec(input:AutomationSpecInput){const now=new Date().toISOString();const item:AutomationSpec={...input,id:`spec_${randomUUID()}`,status:'draft',createdAt:now,updatedAt:now,approval:null};const items=read();items.push(item);save(items);return item;}
export function requestAutomationApproval(id:string){const items=read();const i=items.findIndex(x=>x.id===id);if(i<0)throw new Error('automation_spec_not_found');if(items[i].status!=='draft')throw new Error('only_draft_can_request_approval');items[i]={...items[i],status:'pending_approval',updatedAt:new Date().toISOString()};save(items);return items[i];}
export function decideAutomationApproval(id:string,decision:'approved'|'rejected',reviewer:string,note:string){const items=read();const i=items.findIndex(x=>x.id===id);if(i<0)throw new Error('automation_spec_not_found');if(items[i].status!=='pending_approval')throw new Error('spec_not_pending_approval');items[i]={...items[i],status:decision,updatedAt:new Date().toISOString(),approval:{reviewer,decidedAt:new Date().toISOString(),note}};save(items);return items[i];}
export function assertExecutable(id:string){const item=listAutomationSpecs().find(x=>x.id===id);if(!item)throw new Error('automation_spec_not_found');if(item.status!=='approved')throw new Error(`automation_execution_blocked:${item.status}`);return item;}
