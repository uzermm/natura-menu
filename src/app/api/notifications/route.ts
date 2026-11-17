import {z} from 'zod';
import {cookies} from 'next/headers';
import {db} from '@/lib/db';
import {requireOperator} from '@/lib/operator';
import {jsonBody,noStore,limited,HttpError} from '@/lib/api';
import {pushKeys,savePushSubscription,removePushSubscription,pushDeviceKey} from '@/lib/push-store';
import {posErrorResponse} from '@/lib/pos-response';
export async function GET(){try{await requireOperator();return Response.json({publicKey:pushKeys(db()).publicKey},{headers:noStore});}catch(e){return posErrorResponse(e);}}
export async function POST(req:Request){try{const op=await requireOperator(req);if(limited('push-subscribe:'+op.id,60,5*60*1000))throw new HttpError(429,'Bildirim ayarlarını değiştirmek için biraz bekleyin.');const input=await jsonBody(req),result=savePushSubscription(db(),op.id,input);(await cookies()).set('natura_push_device',pushDeviceKey(String(input.endpoint)),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:365*24*60*60});return Response.json(result,{headers:noStore});}catch(e){return posErrorResponse(e);}}
export async function DELETE(req:Request){try{const op=await requireOperator(req),{endpoint}=z.object({endpoint:z.string().max(2048)}).parse(await jsonBody(req));removePushSubscription(db(),op.id,endpoint);const c=await cookies();if(c.get('natura_push_device')?.value===pushDeviceKey(endpoint))c.delete('natura_push_device');return Response.json({ok:true},{headers:noStore});}catch(e){return posErrorResponse(e);}}
