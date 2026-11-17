import {requireOperator} from '@/lib/operator';
import { z } from 'zod';
import { db,getCalls } from '@/lib/db';
import { errorResponse,jsonBody,noStore } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){try{await requireOperator();return Response.json(getCalls(),{headers:noStore});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{await requireOperator(req);const {id}=z.object({id:z.string().min(1).max(80)}).parse(await jsonBody(req));db().prepare('UPDATE waiter_calls SET resolved_at=? WHERE id=? AND resolved_at IS NULL').run(new Date().toISOString(),id);return Response.json({ok:true});}catch(e){return errorResponse(e);}}
