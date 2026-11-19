import {cookies} from 'next/headers';
import {requireOperator} from '@/lib/operator';
import {db} from '@/lib/db';
import {validSession} from '@/lib/auth';
import {employeeSession} from '@/lib/employee-session';
import {onlineRuntime} from '@/lib/online-runtime';
import {subscribeLive} from '@/lib/live-hub';
import {errorResponse} from '@/lib/api';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(req:Request){try{
 const op=await requireOperator(req),c=await cookies(),admin=c.get('natura_session')?.value,staff=c.get('natura_staff')?.value,portal=c.get('__Host-om_session')?.value,online=op.id.startsWith('portal:')?await onlineRuntime():null,encoder=new TextEncoder();let cleanup=()=>{};
 const stream=new ReadableStream<Uint8Array>({start(controller){let closed=false,unsubscribe=()=>{};const close=()=>{if(closed)return;closed=true;unsubscribe();req.signal.removeEventListener('abort',close);try{controller.close();}catch{}};cleanup=close;req.signal.addEventListener('abort',close,{once:true});if(req.signal.aborted){close();return;}unsubscribe=subscribeLive({send:value=>{if(!closed){if((controller.desiredSize??0)<-32){close();return;}controller.enqueue(encoder.encode(value));}},close,valid:()=>op.id==='admin'?validSession(admin):online?online.legacySessionValid(portal,op.id):(()=>{const current=employeeSession(db(),staff);return current?.id===op.id&&current.role===op.role;})()});},cancel(){cleanup();}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
 }catch(e){return errorResponse(e);}}
