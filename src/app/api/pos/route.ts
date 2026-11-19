import {recordDiagnostic} from '@/lib/diagnostics';
import {assertOrderPermission,assertWaiterTicket} from '@/lib/operator-policy';
import { db } from '@/lib/db';
import { requireOperator } from '@/lib/operator';
import { jsonBody,noStore } from '@/lib/api';
import { executePos,posRevision,posSummary,ticket } from '@/lib/pos-core';
import { posRequestSchema } from '@/lib/pos-validation';
import { posErrorResponse } from '@/lib/pos-response';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const operator=await requireOperator(req);const d=db(),query=new URL(req.url).searchParams,id=query.get('ticket'),request=query.get('request');
 if(request){const saved=d.prepare('SELECT result FROM pos_requests WHERE id=?').get(request),exists=saved&&d.prepare('SELECT 1 FROM pos_tickets WHERE id=?').get(saved.result);const found=exists?ticket(d,String(saved!.result)):null;if(found&&operator.role==='waiter')assertWaiterTicket(found);return Response.json(found?{found:true,ticket:found}:{found:false,expired:!!d.prepare('SELECT 1 FROM pos_request_tombstones WHERE id=?').get(request)},{headers:noStore});}
 if(id){const t=ticket(d,id);if(operator.role==='waiter')assertWaiterTicket(t);return Response.json(t,{headers:noStore});}
 const requested=query.get('view')||'full',view=['full','pos','quick','pending','accounts','history','summary'].includes(requested)?requested:'pos';
 const etag=`"pos-${view}-${operator.role}-${posRevision(d)}-${new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date())}"`;
 if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{...noStore,ETag:etag}});
 const started=performance.now(),state=posSummary(d,operator.role!=='waiter',view);recordDiagnostic('pos.read',{duration_ms:Math.round(performance.now()-started)});
 return Response.json(state,{headers:{...noStore,ETag:etag}});
}catch(error){recordDiagnostic('pos.error',{status:(error as {status?:number}).status||500});return posErrorResponse(error);}}
export async function POST(req:Request){try{
 const operator=await requireOperator(req),{request_id,command,day_id}=posRequestSchema.parse(await jsonBody(req));
 const current='ticket_id' in command?ticket(db(),command.ticket_id):undefined;assertOrderPermission(operator.role,command,current);
 return Response.json(executePos(db(),request_id,command,operator.actor,operator.role==='waiter'?'waiter':'cashier',day_id),{headers:noStore});
}catch(error){return posErrorResponse(error);}}
