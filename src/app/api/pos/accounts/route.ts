import {adjustCollection} from '@/lib/collection-operations';
import {accountHistoryPage} from '@/lib/account-history';
import {requireCashier} from '@/lib/operator';
import { db } from '@/lib/db';
import { jsonBody,noStore } from '@/lib/api';
import { accountHistory,accounts,collectAccount,saveAccount,deleteAccount,openAccountTicket,outstandingAccountReceipts } from '@/lib/pos-core';
import {z} from 'zod';
import { accountSchema,collectSchema } from '@/lib/pos-validation';
import { posErrorResponse } from '@/lib/pos-response';
export async function GET(req:Request){try{await requireCashier();const query=new URL(req.url).searchParams,id=query.get('id'),order=query.get('order'),outstanding=query.get('outstanding');if(id&&query.get('page')==='1')return Response.json(accountHistoryPage(db(),id,query.get('before')||undefined),{headers:noStore});return Response.json(outstanding?outstandingAccountReceipts(db(),outstanding):order?openAccountTicket(db(),order):id?accountHistory(db(),id):accounts(db()),{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{const operator=await requireCashier(req);const data=await jsonBody(req);if(data.action==='adjust_collection'){const change=z.object({request_id:z.string().uuid(),day_id:z.string().uuid(),ledger_id:z.string().uuid(),action:z.literal('adjust_collection'),kind:z.enum(['refund','correct']),amount:z.number().int().positive().max(100000000).optional(),method:z.enum(['cash','card','meal_card']).optional(),reason:z.string().trim().min(1).max(500)}).parse(data);return Response.json(adjustCollection(db(),{...change,action:change.kind},operator.actor));}if(data.action==='collect'){const v=collectSchema.parse(data);return Response.json(collectAccount(db(),v.id,v.amount,v.method,v.note,v.request_id,operator.actor,v.day_id));}return Response.json(saveAccount(db(),accountSchema.parse(data),operator.actor));}catch(error){return posErrorResponse(error);}}
export async function DELETE(req:Request){try{const operator=await requireCashier(req);const {id}=z.object({id:z.string().uuid()}).parse(await jsonBody(req));return Response.json(deleteAccount(db(),id,operator.actor),{headers:noStore});}catch(error){return posErrorResponse(error);}}
