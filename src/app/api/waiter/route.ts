import {after} from 'next/server';
import {queuePush} from '@/lib/push-store';
import {flushPush} from '@/lib/push-worker';
import { randomUUID } from 'node:crypto';
import { db,getSettings,transaction } from '@/lib/db';
import { waiterCallSchema } from '@/lib/validation';
import { requireOrigin,errorResponse,jsonBody,limited,clientKey,HttpError } from '@/lib/api';
export async function POST(req:Request){try{
 requireOrigin(req);const {table}=waiterCallSchema.parse(await jsonBody(req));
 if(table>getSettings().table_count)throw new HttpError(400,'Bu masa kullanımda değil. Lütfen güncel masa numaranızı seçin.');
 if(limited(`waiter:${clientKey(req)}`,12,5*60*1000))throw new HttpError(429,'Lütfen kısa bir süre sonra tekrar deneyin.');
 const result=transaction(()=>{
  const existing=db().prepare('SELECT id FROM waiter_calls WHERE table_number=? AND resolved_at IS NULL').get(table);
  if(existing)return {ok:true,message:'Çağrınız zaten iletildi. Ekibimiz sizinle ilgilenecek.'};
  const recent=db().prepare('SELECT created_at FROM waiter_calls WHERE table_number=? ORDER BY created_at DESC LIMIT 1').get(table);
  if(recent&&Date.now()-Date.parse(String(recent.created_at))<60000)throw new HttpError(429,'Yeni bir çağrı için bir dakika bekleyin.');
  const callId=randomUUID();db().prepare('INSERT INTO waiter_calls(id,table_number,created_at) VALUES(?,?,?)').run(callId,table,new Date().toISOString());queuePush(db(),'call',callId,table);
  db().prepare("DELETE FROM waiter_calls WHERE resolved_at IS NOT NULL AND created_at < datetime('now','-30 days')").run();
  return {ok:true,message:'Çağrınız iletildi. Ekibimiz birazdan yanınızda.'};
 });after(flushPush);return Response.json(result);
}catch(e){return errorResponse(e);}}
