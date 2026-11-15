import { db } from '@/lib/db';
import { requireOperator } from '@/lib/operator';
import { jsonBody,noStore } from '@/lib/api';
import { executePos,posRevision,posSummary,ticket } from '@/lib/pos-core';
import { posRequestSchema } from '@/lib/pos-validation';
import { posErrorResponse } from '@/lib/pos-response';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const operator=await requireOperator(req);const d=db(),query=new URL(req.url).searchParams,id=query.get('ticket'),request=query.get('request');
 if(request){const saved=d.prepare('SELECT result FROM pos_requests WHERE id=?').get(request),exists=saved&&d.prepare('SELECT 1 FROM pos_tickets WHERE id=?').get(saved.result);return Response.json(exists?{found:true,ticket:ticket(d,String(saved!.result))}:{found:false,expired:!!d.prepare('SELECT 1 FROM pos_request_tombstones WHERE id=?').get(request)},{headers:noStore});}
 if(id)return Response.json(ticket(d,id),{headers:noStore});
 const etag=`"pos-${operator.role}-${posRevision(d)}-${new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date())}"`;
 if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{...noStore,ETag:etag}});
 const state=posSummary(d);
 return Response.json(state,{headers:{...noStore,ETag:etag}});
}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{
 const operator=await requireOperator(req),{request_id,command,day_id}=posRequestSchema.parse(await jsonBody(req));
 return Response.json(executePos(db(),request_id,command,operator.actor,'cashier',day_id),{headers:noStore});
}catch(error){return posErrorResponse(error);}}
