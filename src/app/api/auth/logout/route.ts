import { cookies } from 'next/headers';
import {currentOperator} from '@/lib/operator';
import {onlineRuntime} from '@/lib/online-runtime';
import { errorResponse,requireOrigin,HttpError } from '@/lib/api';
import {db} from '@/lib/db';
import {removePushDevice} from '@/lib/push-store';
export async function POST(req:Request) {try {requireOrigin(req);const op=await currentOperator();if(!op)throw new HttpError(401,'Lütfen giriş yapın.');const c=await cookies();const portal=c.get('__Host-om_session')?.value;if(portal)await(await onlineRuntime()).legacyLogout(portal);c.set('__Host-om_session','',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});removePushDevice(db(),op.id,c.get('natura_push_device')?.value);c.delete('natura_push_device');c.delete('natura_session');c.delete('natura_staff');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
