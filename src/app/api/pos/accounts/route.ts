import { db } from '@/lib/db';
import { requireAdmin,jsonBody,noStore } from '@/lib/api';
import { accountHistory,accounts,collectAccount,saveAccount } from '@/lib/pos-core';
import { accountSchema,collectSchema } from '@/lib/pos-validation';
import { posErrorResponse } from '@/lib/pos-response';
export async function GET(req:Request){try{await requireAdmin();const id=new URL(req.url).searchParams.get('id');return Response.json(id?accountHistory(db(),id):accounts(db()),{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{await requireAdmin(req);const data=await jsonBody(req);if(data.action==='collect'){const v=collectSchema.parse(data);return Response.json(collectAccount(db(),v.id,v.amount,v.method,v.note,v.request_id,'Kasa'));}return Response.json(saveAccount(db(),accountSchema.parse(data),'Kasa'));}catch(error){return posErrorResponse(error);}}
