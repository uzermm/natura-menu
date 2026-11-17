import { cookies } from 'next/headers';
import {requireOperator} from '@/lib/operator';
import { errorResponse } from '@/lib/api';
export async function POST(req:Request) {try {await requireOperator(req);(await cookies()).delete('natura_session');(await cookies()).delete('natura_staff');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
