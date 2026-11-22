import {storage} from '../portal/store.mjs';
import { orderPushPayload } from './push-format.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as webPush from 'web-push';
import { sqlite, dataDir, DB } from './database.mjs';

export function createPush(origin,{sendNotification=webPush.sendNotification}={}) {
  const keyPath = join(dataDir, 'web-push.key');
  try {
    writeFileSync(keyPath, JSON.stringify(webPush.generateVAPIDKeys()), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const keys = JSON.parse(readFileSync(keyPath, 'utf8'));
  const remove = sqlite.prepare('DELETE FROM push_subscriptions WHERE endpoint=?');
  const subscriptions = sqlite.prepare("SELECT s.* FROM push_subscriptions s JOIN auth_users u ON u.id=s.user_id WHERE u.enabled=1 AND json_extract(s.subscription,'$.identityVersion')=u.version");
  let draining=false;
  // An interrupted push may already have reached the provider; never replay it silently.
  sqlite.prepare("UPDATE online_push_queue SET status='uncertain' WHERE status='sending'").run();
  return {
    publicKey: keys.publicKey,
    active: () => Boolean(subscriptions.get()),
    add(userId, input) {
      const url = new URL(input.endpoint);
      const allowed = url.hostname === 'fcm.googleapis.com' ||
        url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com') ||
        url.hostname === 'updates.push.services.mozilla.com';
      if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password ||
          url.hash || url.href.length > 2048 || !/^[\w-]{87}$/.test(input.keys?.p256dh || '') ||
          !/^[\w-]{22}$/.test(input.keys?.auth || '')) throw Error('Geçersiz bildirim aboneliği.');
      sqlite.prepare(`INSERT INTO push_subscriptions VALUES (?,?,?,?)
        ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, subscription=excluded.subscription
        WHERE push_subscriptions.user_id=excluded.user_id`).run(url.href, userId, JSON.stringify({
        endpoint:url.href, keys:{p256dh:input.keys.p256dh, auth:input.keys.auth},identityVersion:sqlite.prepare('SELECT version FROM auth_users WHERE id=? AND enabled=1').get(userId)?.version
      }), Date.now());
    },
    remove(userId, endpoint) {
      sqlite.prepare('DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?').run(String(endpoint || ''), userId);
    },
    enqueue(order) {
      if(order.test)return;const now=Date.now(),payload=orderPushPayload(order);
      sqlite.prepare('INSERT OR IGNORE INTO notification_timing(order_id,detected_at) VALUES(?,?)').run(order.id,now);
      for(const row of subscriptions.all().filter(row=>row.created_at<=order.createdAt))sqlite.prepare('INSERT OR IGNORE INTO online_push_queue(order_id,endpoint,user_id,identity_version,payload,next_at,created_at) VALUES(?,?,?,?,?,?,?)').run(order.id,row.endpoint,row.user_id,JSON.parse(row.subscription).identityVersion,payload,now,now);
    },
    async send(order){this.enqueue(order);return this.drain();},
    async drain(){if(draining)return 0;draining=true;let sent=0;try{
      sqlite.prepare("UPDATE online_push_queue SET status='expired' WHERE status='queued' AND created_at<?").run(Date.now()-120000);
      const rows=sqlite.prepare("SELECT * FROM online_push_queue WHERE status='queued' AND next_at<=? ORDER BY created_at LIMIT 20").all(Date.now());
      const currentOrders=new Map((await storage({DB}).get('orders',[])).map(order=>[order.id,order]));
      for(const job of rows){const current=currentOrders.get(job.order_id);if(current&&!['Created','Picking'].includes(current.status)){sqlite.prepare("UPDATE online_push_queue SET status='resolved' WHERE order_id=? AND endpoint=?").run(job.order_id,job.endpoint);continue;}const sub=subscriptions.all().find(r=>r.endpoint===job.endpoint&&r.user_id===job.user_id&&JSON.parse(r.subscription).identityVersion===job.identity_version);
        if(!sub){sqlite.prepare("UPDATE online_push_queue SET status='revoked' WHERE order_id=? AND endpoint=?").run(job.order_id,job.endpoint);continue;}
        const claim=sqlite.prepare("UPDATE online_push_queue SET status='sending',attempts=attempts+1 WHERE order_id=? AND endpoint=? AND status='queued'").run(job.order_id,job.endpoint);if(!claim.changes)continue;
        try{await sendNotification(JSON.parse(sub.subscription),job.payload,{TTL:Math.max(1,120-Math.floor((Date.now()-job.created_at)/1000)),timeout:5000,vapidDetails:{subject:origin,publicKey:keys.publicKey,privateKey:keys.privateKey}});sent++;sqlite.prepare("UPDATE online_push_queue SET status='sent',sent_at=?,last_error=NULL WHERE order_id=? AND endpoint=?").run(Date.now(),job.order_id,job.endpoint);sqlite.prepare('UPDATE notification_timing SET push_sent_at=COALESCE(push_sent_at,?) WHERE order_id=?').run(Date.now(),job.order_id);
        }catch(error){const code=Number(error.statusCode||0);if([404,410].includes(code))remove.run(job.endpoint);const retry=!code||code===429||code>=500;sqlite.prepare('UPDATE online_push_queue SET status=?,next_at=?,last_error=? WHERE order_id=? AND endpoint=?').run(retry?'queued':'failed',Date.now()+Math.min(60000,5000*2**Math.min(job.attempts,4)),code?'HTTP '+code:'Ağ hatası',job.order_id,job.endpoint);}
      }sqlite.prepare('DELETE FROM online_push_queue WHERE created_at<?').run(Date.now()-7*86400000);sqlite.prepare('DELETE FROM notification_timing WHERE detected_at<?').run(Date.now()-7*86400000);return sent;
    }finally{draining=false;}}
  };
}
