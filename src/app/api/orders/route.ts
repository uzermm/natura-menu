import { db } from '@/lib/db';
import { requireOrigin,jsonBody,limited,clientKey,HttpError,noStore } from '@/lib/api';
import { customerOrderSchema } from '@/lib/pos-validation';
import { submitCustomerOrder } from '@/lib/pos-core';
import { posErrorResponse } from '@/lib/pos-response';
export async function POST(req:Request){try{
 requireOrigin(req);const v=customerOrderSchema.parse(await jsonBody(req));
 if(limited(`customer-order:${clientKey(req)}`,60,5*60*1000)||limited(`customer-table:${v.table}`,8,60*1000))throw new HttpError(429,'Çok fazla sipariş isteği. Lütfen ekibimize danışın.');
 return Response.json(submitCustomerOrder(db(),v.request_id,v.table,v.lines,v.note),{headers:noStore});
}catch(error){return posErrorResponse(error);}}
