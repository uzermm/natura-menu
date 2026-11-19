import type {DatabaseSync} from 'node:sqlite';
import {createHmac,createHash,ECDH} from 'node:crypto';
import * as webpush from 'web-push';
import {z} from 'zod';
import {sessionSecret} from './security.ts';
import {PosError} from './pos-error.ts';
export function initPush(d:DatabaseSync){d.exec(`
 CREATE TABLE IF NOT EXISTS push_keys(id INTEGER PRIMARY KEY CHECK(id=1),public_key TEXT NOT NULL,private_key TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS push_subscriptions(endpoint TEXT PRIMARY KEY,owner_id TEXT NOT NULL,version TEXT NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS push_events(id TEXT PRIMARY KEY,kind TEXT NOT NULL,reference_id TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS push_deliveries(event_id TEXT NOT NULL REFERENCES push_events(id) ON DELETE CASCADE,endpoint TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(event_id,endpoint));
 CREATE INDEX IF NOT EXISTS push_event_age ON push_events(created_at);
 CREATE INDEX IF NOT EXISTS push_due ON push_deliveries(status,next_at);
 CREATE INDEX IF NOT EXISTS push_owner ON push_subscriptions(owner_id);
 `);}
export function pushKeys(d:DatabaseSync){let row=d.prepare('SELECT public_key,private_key FROM push_keys WHERE id=1').get();if(!row){const keys=webpush.generateVAPIDKeys();d.prepare('INSERT OR IGNORE INTO push_keys VALUES(1,?,?)').run(keys.publicKey,keys.privateKey);row=d.prepare('SELECT public_key,private_key FROM push_keys WHERE id=1').get()!;}return {publicKey:String(row.public_key),privateKey:String(row.private_key)};}
export function allowedPushEndpoint(value:string){try{const u=new URL(value),host=u.hostname;return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(host==='fcm.googleapis.com'||host==='web.push.apple.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.notify.windows.com'));}catch{return false;}}
export const subscriptionSchema=z.object({endpoint:z.string().url().max(2048).refine(allowedPushEndpoint,'Desteklenmeyen bildirim adresi.'),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{87,88}={0,2}$/),auth:z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/)})}).strict();
export function pushOwnerVersion(d:DatabaseSync,id:string):string|null{
 let identity:string;if(id==='admin'){const name=d.prepare('SELECT username FROM admin_identity WHERE id=1').get()?.username,hash=d.prepare('SELECT password_hash FROM admin_credentials WHERE id=1').get()?.password_hash??process.env.ADMIN_PASSWORD??'';if(!name||!hash)return null;identity='admin:'+name+':'+hash;}else{const e=d.prepare('SELECT username,password_hash,role,is_active FROM employees WHERE id=?').get(id);if(!e?.is_active||!['cashier','waiter'].includes(String(e.role)))return null;identity=id+':'+e.username+':'+e.password_hash+':'+e.role;}
 return createHmac('sha256',sessionSecret()).update('push-owner:'+identity).digest('hex');
}
export function savePushSubscription(d:DatabaseSync,owner:string,input:unknown){const sub=subscriptionSchema.parse(input);try{ECDH.convertKey(Buffer.from(sub.keys.p256dh,'base64url'),'prime256v1');}catch{throw new PosError('Geçersiz bildirim anahtarı.');}if(Buffer.from(sub.keys.auth,'base64url').length!==16)throw new PosError('Geçersiz bildirim anahtarı.');const version=pushOwnerVersion(d,owner);if(!version)throw new PosError('Hesap bildirim yetkisi bulunamadı.',403);if(Number(d.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE owner_id=? AND endpoint!=?').get(owner,sub.endpoint)!.n)>=20)throw new PosError('Bu hesap için bildirim cihazı sınırına ulaşıldı.');d.prepare('INSERT INTO push_subscriptions VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET owner_id=excluded.owner_id,version=excluded.version,data=excluded.data,updated_at=excluded.updated_at').run(sub.endpoint,owner,version,JSON.stringify({endpoint:sub.endpoint,keys:sub.keys}),Date.now());return {ok:true};}
export function removePushSubscription(d:DatabaseSync,owner:string,endpoint:string){d.prepare('DELETE FROM push_subscriptions WHERE owner_id=? AND endpoint=?').run(owner,endpoint);}
export function pushDeviceKey(endpoint:string){return createHash('sha256').update(endpoint).digest('base64url');}
export function removePushDevice(d:DatabaseSync,owner:string,key:string|undefined){if(!key)return;for(const s of d.prepare('SELECT endpoint FROM push_subscriptions WHERE owner_id=?').all(owner))if(pushDeviceKey(String(s.endpoint))===key)removePushSubscription(d,owner,String(s.endpoint));}
export function queuePush(d:DatabaseSync,kind:'call'|'order',reference:string,table:number,now=Date.now()){
 if(kind!=='call')return false;
 const id='call:'+reference,payload={title:'Garson çağrısı',body:`Masa ${table} sizi çağırıyor.`,url:'/admin?notification=calls',tag:'natura-'+id};
 if(!d.prepare('INSERT OR IGNORE INTO push_events VALUES(?,?,?,?,?)').run(id,kind,reference,JSON.stringify(payload),now).changes)return false;
 d.prepare('INSERT INTO push_deliveries(event_id,endpoint) SELECT ?,endpoint FROM push_subscriptions').run(id);return true;
}
export function pushStillNeeded(d:DatabaseSync,kind:string,id:string){return kind==='call'&&!!d.prepare('SELECT 1 FROM waiter_calls WHERE id=? AND resolved_at IS NULL').get(id);}
export function recoverPushEvents(d:DatabaseSync,now=Date.now()){
 const since=new Date(now-5*60*1000).toISOString();for(const c of d.prepare('SELECT id,table_number FROM waiter_calls WHERE resolved_at IS NULL AND created_at>=?').all(since))queuePush(d,'call',String(c.id),Number(c.table_number),now);
 d.prepare('DELETE FROM push_events WHERE created_at<?').run(now-7*24*60*60*1000);
}
