import {cookies} from 'next/headers';
import {requireOperator} from '@/lib/operator';
import {db} from '@/lib/db';
import {validSession} from '@/lib/auth';
import {employeeSession} from '@/lib/employee-session';
import {subscribeLive} from '@/lib/live-hub';
import {errorResponse} from '@/lib/api';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(req:Request){try{
 const op=await requireOperator(req),c=await cookies(),admin=c.get('natura_session')?.value,staff=c.get('natura_staff')?.value,encoder=new TextEncoder();let cleanup=()=>{};
 const stream=new ReadableStream<Uint8Array>({start(controller){let closed=false,unsubscribe=()=>{};const close=()=>{if(closed)return;closed=true;clearTimeout(timeout);unsubscribe();req.signal.removeEventListener('abort',close);try{controller.close();}catch{}};const timeout=setTimeout(close,240000);timeout.unref?.();cleanup=close;req.signal.addEventListener('abort',close,{once:true});if(req.signal.aborted){close();return;}unsubscribe=subscribeLive({send:value=>{if(!closed)controller.enqueue(encoder.encode(value));},close,valid:()=>op.role==='admin'?validSession(admin):employeeSession(db(),staff)?.id===op.id});},cancel(){cleanup();}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
 }catch(e){return errorResponse(e);}}
