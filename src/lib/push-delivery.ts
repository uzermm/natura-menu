import type {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import * as webpush from 'web-push';
import {pushKeys,pushOwnerVersion,pushStillNeeded} from './push-store.ts';
type Sender=(subscription:webpush.PushSubscription,payload:string,options:webpush.RequestOptions)=>Promise<unknown>;
export async function deliverPush(d:DatabaseSync,send:Sender=webpush.sendNotification,now=Date.now()){
 d.prepare("UPDATE push_deliveries SET status='pending' WHERE status='sending' AND updated_at<?").run(now-60000);
 d.prepare("UPDATE push_deliveries SET status='done' WHERE status='pending' AND event_id IN (SELECT id FROM push_events WHERE created_at<=?)").run(now-300000);
 const rows=d.prepare("SELECT x.*,e.kind,e.reference_id,e.payload,e.created_at FROM push_deliveries x JOIN push_events e ON e.id=x.event_id WHERE x.status='pending' AND x.next_at<=? ORDER BY e.created_at LIMIT 40").all(now);
 async function work(row:typeof rows[number]){
  if(!d.prepare("UPDATE push_deliveries SET status='sending',updated_at=? WHERE event_id=? AND endpoint=? AND status='pending'").run(now,row.event_id,row.endpoint).changes)return;
  const done=()=>d.prepare("UPDATE push_deliveries SET status='done',updated_at=? WHERE event_id=? AND endpoint=?").run(now,row.event_id,row.endpoint);
  const sub=d.prepare('SELECT * FROM push_subscriptions WHERE endpoint=?').get(row.endpoint);if(!sub){done();return;}
  if(pushOwnerVersion(d,String(sub.owner_id))!==sub.version){d.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(sub.endpoint);done();return;}
  if(now-Number(row.created_at)>=300000||!pushStillNeeded(d,String(row.kind),String(row.reference_id))){done();return;}
  try{await send(JSON.parse(String(sub.data)),String(row.payload),{vapidDetails:{...pushKeys(d),subject:'mailto:beyoglumutfagi@gmail.com'},TTL:Math.max(1,Math.floor((Number(row.created_at)+300000-now)/1000)),urgency:'high',topic:createHash('sha256').update(String(row.event_id)).digest('base64url').slice(0,32),timeout:5000});done();}
  catch(error){const status=Number((error as {statusCode?:number}).statusCode||0),attempts=Number(row.attempts)+1;if(status===404||status===410)d.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(sub.endpoint);if(attempts>=3||status>=400&&status<500&&status!==429){done();return;}d.prepare("UPDATE push_deliveries SET status='pending',attempts=?,next_at=?,updated_at=? WHERE event_id=? AND endpoint=?").run(attempts,now+30000*attempts,now,row.event_id,row.endpoint);}
 }
 let index=0;await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{while(index<rows.length)await work(rows[index++]);}));
}
