import { cookies } from 'next/headers';
import {requireOperator} from '@/lib/operator';
import { errorResponse } from '@/lib/api';
import {db} from '@/lib/db';
import {removePushDevice} from '@/lib/push-store';
export async function POST(req:Request) {try {const op=await requireOperator(req),c=await cookies();removePushDevice(db(),op.id,c.get('natura_push_device')?.value);c.delete('natura_push_device');c.delete('natura_session');c.delete('natura_staff');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
