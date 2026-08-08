import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { assertExecutable, type AutomationSpec } from '@/lib/automation-spec';

const RunSchema=z.object({id:z.string(),specId:z.string(),status:z.enum(['completed','blocked']),startedAt:z.string().datetime(),finishedAt:z.string().datetime(),input:z.record(z.unknown()),output:z.record(z.unknown()),error:z.string().nullable()});
export type AutomationRun=z.infer<typeof RunSchema>;
function file(){return process.env.CASIO_AUTOMATION_RUN_STORE??path.join(process.cwd(),'data','automation-runs.json');}
function read(){const p=file();fs.mkdirSync(path.dirname(p),{recursive:true});if(!fs.existsSync(p))fs.writeFileSync(p,'[]\n');const raw=fs.readFileSync(p,'utf8').trim();return z.array(RunSchema).parse(raw?JSON.parse(raw):[]);}
function save(x:AutomationRun[]){const p=file(),tmp=`${p}.${process.pid}.${Date.now()}.tmp`;fs.writeFileSync(tmp,`${JSON.stringify(x,null,2)}\n`);fs.renameSync(tmp,p);}
export function listAutomationRuns(){return read().sort((a,b)=>b.startedAt.localeCompare(a.startedAt));}
export function executeAutomationSpec(specId:string,input:Record<string,unknown>){const startedAt=new Date().toISOString();let run:AutomationRun;try{const spec:AutomationSpec=assertExecutable(specId);const missing=spec.inputData.filter(key=>!(key in input));if(missing.length)throw new Error(`automation_input_missing:${missing.join(',')}`);run={id:`run_${randomUUID()}`,specId,status:'completed',startedAt,finishedAt:new Date().toISOString(),input,output:{specTitle:spec.title,acceptedInputKeys:Object.keys(input),declaredOutputs:spec.outputData,mode:'approved-policy-runtime'},error:null};}catch(error){run={id:`run_${randomUUID()}`,specId,status:'blocked',startedAt,finishedAt:new Date().toISOString(),input,output:{},error:error instanceof Error?error.message:'automation_execution_failed'};}const runs=read();runs.push(run);save(runs);return run;}
