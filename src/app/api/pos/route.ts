import { db } from '@/lib/db';
import { requireOperator } from '@/lib/operator';
import { HttpError,jsonBody,noStore } from '@/lib/api';
import { executePos,pendingOrders,posRevision,posSummary,ticket } from '@/lib/pos-core';
import { posRequestSchema } from '@/lib/pos-validation';
import { posErrorResponse } from '@/lib/pos-response';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const operator=await requireOperator(req);const d=db(),id=new URL(req.url).searchParams.get('ticket');
 if(id){if(operator.role!=='admin')throw new HttpError(403,'Bu işlem için kasa yetkisi gerekli.');return Response.json(ticket(d,id),{headers:noStore});}
 const etag=`"pos-${operator.role}-${posRevision(d)}-${new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date())}"`;
 if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{...noStore,ETag:etag}});
 const state=operator.role==='admin'?posSummary(d):{open:d.prepare("SELECT id FROM pos_tickets WHERE status='open' AND service_type='table' ORDER BY table_number").all().map(row=>ticket(d,String(row.id))).map(t=>({...t,payments:[]})),recent:[],accounts:[],pending:pendingOrders(d),today:null};
 return Response.json(state,{headers:{...noStore,ETag:etag}});
}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{
 const operator=await requireOperator(req),{request_id,command}=posRequestSchema.parse(await jsonBody(req));
 if(operator.role!=='admin'&&!['open','open_order','add','quantity','note'].includes(command.action))throw new HttpError(403,'Bu işlem için kasa yetkisi gerekli.');
 if(operator.role!=='admin'&&'ticket_id' in command&&ticket(db(),command.ticket_id).service_type!=='table')throw new HttpError(403,'Hızlı siparişler kasa yetkisindedir.');
 return Response.json(executePos(db(),request_id,command,operator.actor,operator.role==='admin'?'cashier':'waiter'),{headers:noStore});
}catch(error){return posErrorResponse(error);}}
