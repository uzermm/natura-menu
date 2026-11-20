import {createHash} from 'node:crypto';
import {createTelegramOrderButtons} from './telegram-actions.mjs';
import { sqlite, transaction } from './database.mjs';
import { telegramOrderText, telegramCourierText, telegramMessageChunks } from './telegram-format.mjs';

/**
 * @param {string} origin
 * @param {{fetchImpl?:typeof fetch,performOrderAction?:(id:string,action:string,actor:any)=>Promise<any>,getSnapshot?:()=>Promise<any>}} options
 */
export function createTelegram(origin, {fetchImpl=fetch,performOrderAction,getSnapshot} = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  const enabled = Boolean(token && chat);
  if (enabled && (!/^\d+:[A-Za-z0-9_-]+$/.test(token) || !/^-\d+$/.test(chat))) {
    throw Error('Telegram bot veya grup ayarlarını kontrol edin.');
  }
  // A send interrupted by a restart may already have reached Telegram.
  sqlite.prepare("UPDATE telegram_orders SET status='uncertain' WHERE status='sending'").run();
  const update = sqlite.prepare('UPDATE telegram_orders SET status=?,next_at=? WHERE order_id=? AND chat_id=?');
  let running = false;
  let lastTestAt = 0;

  async function telegramRequest(method, body, options={}) {
    const response = await fetchImpl('https://api.telegram.org/bot' + token + '/' + method, {
      method:'POST', body, signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(method==='getUpdates'?35000:20000)]):AbortSignal.timeout(method==='getUpdates'?35000:20000), redirect:'error'
    });
    let result;
    try {
      result = await response.json();
    } catch {
      const error = new Error('Telegram geçerli bir API yanıtı vermedi.');
      error.status = response.status;
      error.networkCode = 'INVALID_RESPONSE';
      throw error;
    }
    if (!response.ok || !result.ok) {
      const error = new Error('Telegram gönderimi tamamlanamadı.');
      error.operation = method;
      error.status = result.error_code || response.status;
      error.retryAfter = result.parameters?.retry_after;
      error.description = result.description;
      throw error;
    }
    return result.result;
  }

  async function request(method, body, options) {
    try {
      return await telegramRequest(method, body, options);
    } catch (error) {
      error.operation = method;
      const cause = error.cause?.code || error.code || error.name;
      const known = ['UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','TimeoutError','SyntaxError'];
      error.networkCode ||= known.includes(cause) ? cause : null;
      throw error;
    }
  }

  const buttons=createTelegramOrderButtons({db:sqlite,chat,botKey:createHash('sha256').update(token||'disabled').digest('hex'),request,performOrderAction,getSnapshot});
  async function deliver(job) {
    const order = JSON.parse(job.payload);
    update.run('sending', Date.now(), job.order_id, chat);
    try {
      const chunks = telegramMessageChunks(job.kind === 'courier' ? telegramCourierText(order) : telegramOrderText(order));
      for (let index = job.text_index; index < chunks.length; index++) {
        const form = new URLSearchParams();
        form.set('chat_id', chat);
        form.set('text', chunks[index].text);
        form.set('entities', JSON.stringify(chunks[index].entities));
        const controls=index===chunks.length-1&&job.kind==='order'?await buttons.reserve(order,chunks[index].text,chunks[index].entities):null;
        if(controls)form.set('reply_markup',JSON.stringify(controls.markup));
        const sent=await request('sendMessage', form);
        if(controls)buttons.bind(controls.token,sent.message_id);
        sqlite.prepare('UPDATE telegram_orders SET text_index=? WHERE order_id=? AND chat_id=?').run(index + 1, job.order_id, chat);
      }
      update.run('sent', Date.now(), job.order_id, chat);
    } catch (error) {
      const retry = error.status === 429 && job.attempts < 10;
      const status = retry ? 'queued' : error.status >= 400 && error.status < 500 ? 'failed' : 'uncertain';
      update.run(status, Date.now() + Math.max(60000, (error.retryAfter || 60) * 1000), job.order_id, chat);
      console.warn('Telegram sipariş gönderimi:', status);
    }
  }

  return {
    enabled,
    pollCallbacks:buttons.poll,
    stopCallbacks:buttons.stop,
    startCallbacks:buttons.resume,
    localStatus(){return {enabled,actions:buttons.health(),counts:sqlite.prepare('SELECT status,COUNT(*) AS count FROM telegram_orders WHERE chat_id=? GROUP BY status').all(chat||''),recent:sqlite.prepare("SELECT order_id AS id,kind,status,attempts,created_at AS createdAt,payload FROM telegram_orders WHERE chat_id=? AND status IN ('failed','uncertain') ORDER BY created_at DESC LIMIT 12").all(chat||'').map(({payload,...row})=>{let order;try{order=JSON.parse(payload);}catch{}return {...row,code:String(order?.orderCode||order?.number||'—'),restaurant:String(order?.restaurant||'Restoran')};})};},
    retry(id){if(!enabled)throw Error('Telegram bağlantısı ayarlı değil.');const row=sqlite.prepare('SELECT status FROM telegram_orders WHERE order_id=? AND chat_id=?').get(id,chat);if(!row||!['failed','uncertain'].includes(row.status))throw Error('Bu mesaj yeniden gönderilmeye uygun değil.');sqlite.prepare("UPDATE telegram_orders SET status='queued',next_at=?,attempts=0 WHERE order_id=? AND chat_id=?").run(Date.now(),id,chat);return {ok:true};},
    async check() {
      if (!enabled) return {enabled:false, tokenConfigured:!!token, groupConfigured:!!chat};
      const bot = await request('getMe', new URLSearchParams());
      const form = new URLSearchParams();
      form.set('chat_id', chat);
      const group = await request('getChat', form);
      form.set('user_id', String(bot.id));
      const member = await request('getChatMember', form);
      const canSend = ['member','administrator','creator'].includes(member.status) ||
        (member.status === 'restricted' && member.can_send_messages === true);
      const jobs = sqlite.prepare('SELECT status,COUNT(*) AS count FROM telegram_orders WHERE chat_id=? GROUP BY status').all(chat);
      return {enabled:true, bot:bot.username, group:group.title, chatId:chat, canSend, jobs};
    },
    async test() {
      if (!enabled) throw Error('Telegram ayarları tamamlanmadı.');
      if (Date.now() - lastTestAt < 30000) throw Error('Yeni test için 30 saniye bekleyin.');
      lastTestAt = Date.now();
      const form = new URLSearchParams();
      form.set('chat_id', chat);
      form.set('text', 'Online Mutfak · Bağlantı testi\nTelegram grubuna gönderim başarılı. Yeni siparişler bu gruba iletilecek.');
      const message = await request('sendMessage', form);
      return {ok:true, chatId:String(message.chat.id), messageId:message.message_id};
    },
    enqueue(orders, courierOrders = []) {
      if (!enabled) return;
      transaction(() => {
        const insert = sqlite.prepare('INSERT OR IGNORE INTO telegram_orders(order_id,chat_id,payload,next_at,created_at) VALUES(?,?,?,?,?)');
        for (const order of orders) {
          if (!order.test) insert.run(order.id, chat, JSON.stringify(order), Date.now(), Date.now());
        }
        const insertCourier = sqlite.prepare("INSERT OR IGNORE INTO telegram_orders(order_id,chat_id,payload,next_at,created_at,kind) VALUES(?,?,?,?,?,'courier')");
        for (const order of courierOrders) {
          if (!order.test) insertCourier.run('courier:' + order.id, chat, JSON.stringify(order), Date.now(), Date.now());
        }
      });
    },
    async drain() {
      if (!enabled || running) return;
      running = true;
      try {
        const job = transaction(() => {
          const row = sqlite.prepare("SELECT * FROM telegram_orders WHERE chat_id=? AND status='queued' AND next_at<=? ORDER BY created_at LIMIT 1").get(chat, Date.now());
          if (row) sqlite.prepare('UPDATE telegram_orders SET attempts=attempts+1 WHERE order_id=? AND chat_id=?').run(row.order_id, chat);
          return row;
        });
        if (job) {
          try {
            await deliver(job);
          } catch {
            // Preparing the message failed before sending.
            update.run(job.attempts < 5 ? 'queued' : 'failed', Date.now() + 60000, job.order_id, chat);
            console.warn('Telegram sipariş metni oluşturulamadı.');
          }
        }
        sqlite.prepare("DELETE FROM telegram_orders WHERE status IN ('sent','failed','uncertain') AND created_at<?").run(Date.now() - 30 * 86400000);
        await buttons.synchronize();
      } finally {
        running = false;
      }
    }
  };
}
