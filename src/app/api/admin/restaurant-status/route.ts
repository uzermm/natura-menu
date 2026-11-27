import {requireAdmin,jsonBody,errorResponse,noStore,HttpError} from '@/lib/api';
import {onlineRuntime} from '@/lib/online-runtime';
import {audit} from '@/lib/audit-log';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
function failure(error:unknown){const e=error as {status?:number;message?:string};return e.status&&e.status>=400&&e.status<=599?errorResponse(new HttpError(e.status,e.message||'Mağaza durumu güncellenemedi.')):errorResponse(error);}
export async function GET(req:Request){try{await requireAdmin();return Response.json(await(await onlineRuntime()).restaurantStatus(new URL(req.url).searchParams.get('branchId')||''),{headers:noStore});}catch(e){return failure(e);}}
export async function POST(req:Request){let actor,branchId='';try{actor=await requireAdmin(req);const body=await jsonBody(req);branchId=typeof body.branchId==='string'?body.branchId.slice(0,130):'';const result=await(await onlineRuntime()).restaurantStatus(branchId,body);audit(db(),actor.username,'restaurant.status.update',branchId,result.verified?'ok':'pending');return Response.json(result,{status:result.verified?200:202,headers:noStore});}catch(e){if(actor)audit(db(),actor.username,'restaurant.status.update',branchId,'failed');return failure(e);}}
