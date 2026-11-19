import { orderPushPayload } from './push-format.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as webPush from 'web-push';
import { sqlite, dataDir } from './database.mjs';

export function createPush(origin) {
  const keyPath = join(dataDir, 'web-push.key');
  try {
    writeFileSync(keyPath, JSON.stringify(webPush.generateVAPIDKeys()), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const keys = JSON.parse(readFileSync(keyPath, 'utf8'));
  const remove = sqlite.prepare('DELETE FROM push_subscriptions WHERE endpoint=?');
  const subscriptions = sqlite.prepare("SELECT s.* FROM push_subscriptions s JOIN auth_users u ON u.id=s.user_id WHERE u.enabled=1 AND json_extract(s.subscription,'$.identityVersion')=u.version");
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
    async send(order) {
      const payload = orderPushPayload(order);
      const deliveries = await Promise.allSettled(subscriptions.all().filter(row => row.created_at <= order.createdAt).map(async row => {
        try {
          await webPush.sendNotification(JSON.parse(row.subscription), payload, { TTL:120, timeout:5000, vapidDetails:{subject:origin,publicKey:keys.publicKey,privateKey:keys.privateKey} });
        } catch (error) {
          if ([404,410].includes(error.statusCode)) remove.run(row.endpoint);
          else console.warn('Sipariş bildirimi gönderilemedi:', error.statusCode || error.code || 'hata');
          throw error;
        }
      }));
      return deliveries.filter(result => result.status === 'fulfilled').length;
    }
  };
}
