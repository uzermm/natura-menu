import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db,getSettings,transaction } from '@/lib/db';
import { validTable } from '@/lib/security';
import { requireOrigin,errorResponse,jsonBody,limited,clientKey,HttpError } from '@/lib/api';
export async function POST(req:Request){try{
 requireOrigin(req);const {table,key}=z.object({table:z.number().int(),key:z.string().max(100)}).parse(await jsonBody(req));
 if(!validTable(table,key,getSettings().table_count))throw new HttpError(400,'Garson çağırmak için masanızdaki QR kodu okutun.');
 if(limited(`waiter:${clientKey(req)}`,12,5*60*1000))throw new HttpError(429,'Lütfen kısa bir süre sonra tekrar deneyin.');
 const result=transaction(()=>{
  const existing=db().prepare('SELECT id FROM waiter_calls WHERE table_number=? AND resolved_at IS NULL').get(table);
  if(existing)return {ok:true,message:'Çağrınız zaten iletildi. Ekibimiz sizinle ilgilenecek.'};
  const recent=db().prepare('SELECT created_at FROM waiter_calls WHERE table_number=? ORDER BY created_at DESC LIMIT 1').get(table);
  if(recent&&Date.now()-Date.parse(String(recent.created_at))<60000)throw new HttpError(429,'Yeni bir çağrı için bir dakika bekleyin.');
  db().prepare('INSERT INTO waiter_calls(id,table_number,created_at) VALUES(?,?,?)').run(randomUUID(),table,new Date().toISOString());
  db().prepare("DELETE FROM waiter_calls WHERE resolved_at IS NOT NULL AND created_at < datetime('now','-30 days')").run();
  return {ok:true,message:'Çağrınız iletildi. Ekibimiz birazdan yanınızda.'};
 });return Response.json(result);
}catch(e){return errorResponse(e);}}
