import { z } from 'zod';
import { db } from '@/lib/db';
import { requireCashier } from '@/lib/operator';
import { jsonBody } from '@/lib/api';
import { decideCustomerOrder } from '@/lib/pos-core';
import { posErrorResponse } from '@/lib/pos-response';
export async function POST(req:Request){try{const op=await requireCashier(req),input=z.object({id:z.string().uuid(),accept:z.boolean()}).parse(await jsonBody(req));return Response.json(decideCustomerOrder(db(),input.id,input.accept,op.actor));}catch(error){return posErrorResponse(error);}}
