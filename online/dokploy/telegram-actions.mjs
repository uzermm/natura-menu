import {randomBytes} from 'node:crypto';
const TTL=48*3600000,terminal=new Set(['Shipped','Delivered','Cancelled','UnSupplied']);
const short=value=>[...String(value||'')].slice(0,180).join('');
const signature=(status,pending)=>JSON.stringify({status,pending:!!pending});
function keyboard(token,status,pending=false){if(terminal.has(status))return {inline_keyboard:[]};const accepted=['Picking','Invoiced'].includes(status),ready=status==='Invoiced';return {inline_keyboard:[[{text:accepted?'✅ Kabul Edildi':pending?'⏳ Kabul Et':'✅ Kabul Et',callback_data:'om:'+token+':accept'},{text:ready?'✅ Hazırlandı':pending?'⏳ Hazırlandı':'🍽 Hazırlandı',callback_data:'om:'+token+':ready'}]]};}
export function createTelegramOrderButtons({db,chat,botKey,request,performOrderAction,getSnapshot=async()=>({orders:[],pending:{}}),now=Date.now}){
 const enabled=!!chat&&typeof performOrderAction==='function',owner=randomBytes(12).toString('hex');let polling=false,stopped=false,abort;
 db.prepare('INSERT OR IGNORE INTO telegram_bot_state(bot_key) VALUES(?)').run(botKey);
 function health(){const row=db.prepare('SELECT last_poll AS lastPoll,last_error AS error FROM telegram_bot_state WHERE bot_key=?').get(botKey);return {enabled,...row};}
 function lease(){return !!db.prepare('INSERT INTO telegram_callback_leases(bot_key,owner,expires_at) VALUES(?,?,?) ON CONFLICT(bot_key) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE telegram_callback_leases.owner=? OR telegram_callback_leases.expires_at<? RETURNING owner').get(botKey,owner,now()+45000,owner,now());}
 function release(){db.prepare('DELETE FROM telegram_callback_leases WHERE bot_key=? AND owner=?').run(botKey,owner);}
 async function answer(id,message,alert=false){try{await request('answerCallbackQuery',new URLSearchParams({callback_query_id:id,text:short(message),show_alert:String(alert),cache_time:'0'}));}catch{/* An expired callback must never cause the business operation to be replayed. */}}
 async function render(row,status,pending,note){if(!row.message_id)return;db.prepare('UPDATE telegram_order_buttons SET dirty=1,last_note=? WHERE token=?').run(short(note),row.token);const markup=keyboard(row.token,status,pending),tail=note?'\n\n'+short(note):'',text=row.original_text+tail,form=new URLSearchParams({chat_id:row.chat_id,message_id:String(row.message_id),reply_markup:JSON.stringify(markup)});
  try{if(text.length<=4096){form.set('text',text);form.set('entities',row.original_entities);await request('editMessageText',form);}else await request('editMessageReplyMarkup',form);}catch(error){if(!(error.status===400&&String(error.description||'').toLowerCase().includes('message is not modified')))throw error;}
  db.prepare('UPDATE telegram_order_buttons SET last_state=?,active=?,dirty=0 WHERE token=?').run(signature(status,pending),Number(!terminal.has(status)),row.token);
 }
 async function reserve(order,text,entities){if(!enabled)return null;const snapshot=await getSnapshot(),current=snapshot.orders.find(o=>o.id===order.id)||order,status=current.status||'Created',pending=!!snapshot.pending?.[order.id],token=randomBytes(16).toString('hex');db.prepare('INSERT INTO telegram_order_buttons(token,order_id,chat_id,original_text,original_entities,last_state,active,created_at) VALUES(?,?,?,?,?,?,?,?)').run(token,order.id,chat,text,JSON.stringify(entities),signature(status,pending),Number(!terminal.has(status)),now());return {token,markup:keyboard(token,status,pending)};}
 function bind(token,messageId){if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Telegram mesajı doğrulanamadı.');db.prepare('UPDATE telegram_order_buttons SET message_id=? WHERE token=?').run(messageId,token);}
 async function handle(query){
  if(!query||typeof query.id!=='string'||query.id.length>200)return;
  const message=query.message,match=typeof query.data==='string'&&/^om:([a-f0-9]{32}):(accept|ready)$/.exec(query.data);
  if(!enabled||String(message?.chat?.id)!==String(chat)||!['group','supergroup'].includes(message?.chat?.type)||!Number.isSafeInteger(query.from?.id)||query.from.id<=0||query.from.is_bot){await answer(query.id,'Bu işlem yalnız tanımlı sipariş grubunun üyelerine açık.',true);return;}
  if(!match||!Number.isSafeInteger(message.message_id)||message.message_id<=0){await answer(query.id,'Geçersiz sipariş düğmesi.',true);return;}
  let row=db.prepare('SELECT * FROM telegram_order_buttons WHERE token=? AND chat_id=?').get(match[1],chat);
  if(!row||row.created_at<now()-TTL||row.message_id&&row.message_id!==message.message_id||!row.message_id&&!message.from?.is_bot){await answer(query.id,'Bu sipariş mesajı geçerli değil veya çok eski.',true);return;}
  if(!row.active){await answer(query.id,'Bu siparişin işlemleri tamamlanmış.',true);return;}
  if(!row.message_id){db.prepare('UPDATE telegram_order_buttons SET message_id=? WHERE token=? AND message_id IS NULL').run(message.message_id,row.token);row={...row,message_id:message.message_id};}
  const action=match[2],name=[query.from.first_name,query.from.last_name].filter(Boolean).join(' ').slice(0,60)||query.from.username||'Grup üyesi',actor='Telegram · '+name+' (#'+query.from.id+')';
  const claim=db.prepare("INSERT OR IGNORE INTO telegram_callback_results(query_id,token,action,actor,status,created_at) VALUES(?,?,?,?,'processing',?)").run(query.id,row.token,action,actor,now());
  if(!claim.changes){await answer(query.id,'Bu düğme isteği daha önce işlendi. Sipariş durumu tekrar gönderilmedi.');return;}
  await answer(query.id,'Sipariş kontrol ediliyor. Sonuç bu mesajda güncellenecek.');
  let result,error;
  try{result=await performOrderAction(row.order_id,action,{id:'telegram:'+query.from.id,username:actor,role:'viewer'});db.prepare("UPDATE telegram_callback_results SET status=?,result_message=? WHERE query_id=?").run(result.pending?'uncertain':'done',short(result.message),query.id);}catch(e){error=e;db.prepare('UPDATE telegram_callback_results SET status=?,result_message=? WHERE query_id=?').run(e.uncertain||Number(e.status)>=500?'uncertain':'rejected',short(e.status?e.message:'İşlem sonucu doğrulanamadı. Sipariş durumunu kontrol edin.'),query.id);}
  try{const snapshot=await getSnapshot(),order=snapshot.orders.find(o=>o.id===row.order_id),pending=!!snapshot.pending?.[row.order_id]||!!result?.pending||!!error?.uncertain,status=order?.status||result?.status||'Unknown';let note;
   if(error)note='⚠ '+(error.status?error.message:'İşlem sonucu doğrulanamadı. Sipariş durumunu kontrol edin.');else if(result.pending)note='⏳ '+result.message;else note=(action==='accept'?'✅ Kabul kontrolü tamamlandı':'✅ Hazırlandı kontrolü tamamlandı')+' · '+name;
   await render(row,status,pending,note);
  }catch{db.prepare('UPDATE telegram_bot_state SET last_error=? WHERE bot_key=?').run('Sipariş işlemi kontrol edildi; Telegram mesajı güncellenemedi.',botKey);}
 }
 async function synchronize(){if(!enabled)return;const rows=db.prepare('SELECT * FROM telegram_order_buttons WHERE chat_id=? AND active=1 AND message_id IS NOT NULL AND created_at>? ORDER BY created_at DESC LIMIT 100').all(chat,now()-TTL);if(!rows.length)return;const snapshot=await getSnapshot(),orders=new Map(snapshot.orders.map(order=>[order.id,order]));
  for(const row of rows){const order=orders.get(row.order_id);if(!order)continue;const pending=!!snapshot.pending?.[row.order_id];if(row.last_state===signature(order.status,pending)&&!row.dirty)continue;const notes={Created:'🔔 Sipariş kabul bekliyor.',Picking:'👨‍🍳 Sipariş hazırlanıyor.',Invoiced:'✅ Sipariş hazırlandı.',Shipped:'🛵 Sipariş yolda.',Delivered:'✅ Sipariş teslim edildi.',Cancelled:'Sipariş iptal edildi.',UnSupplied:'Sipariş tedarik edilemedi.'};try{await render(row,order.status,pending,row.dirty&&row.last_state===signature(order.status,pending)?row.last_note:pending?'⏳ İşlem sonucu doğrulanıyor.':notes[order.status]||'Sipariş durumu güncellendi.');}catch(error){if(error.status===403||error.status===400&&/message to edit not found|message can't be edited/i.test(error.description||''))db.prepare('UPDATE telegram_order_buttons SET active=0 WHERE token=?').run(row.token);else throw error;}break;}
 }
 async function poll(){if(!enabled||polling||stopped)return 2000;polling=true;try{if(!lease()){polling=false;return 2000;}}catch{polling=false;return 5000;}let delay=1000;const heartbeat=setInterval(()=>{try{if(!lease())abort?.abort();}catch{abort?.abort();}},10000);heartbeat.unref?.();abort=new AbortController();try{
   const offset=Number(db.prepare('SELECT offset FROM telegram_bot_state WHERE bot_key=?').get(botKey).offset);
   const updates=await request('getUpdates',new URLSearchParams({offset:String(offset),timeout:'20',limit:'25',allowed_updates:JSON.stringify(['callback_query'])}),{signal:abort.signal});
   if(!Array.isArray(updates))throw Error('Geçersiz Telegram güncellemesi.');
   for(const update of updates){if(stopped)break;if(!Number.isSafeInteger(update.update_id)||update.update_id<offset)continue;if(update.callback_query)await handle(update.callback_query);db.prepare('UPDATE telegram_bot_state SET offset=MAX(offset,?) WHERE bot_key=?').run(update.update_id+1,botKey);}
   db.prepare('UPDATE telegram_bot_state SET last_poll=?,last_error=NULL WHERE bot_key=?').run(now(),botKey);
   db.prepare('DELETE FROM telegram_callback_results WHERE created_at<?').run(now()-30*86400000);db.prepare('DELETE FROM telegram_order_buttons WHERE created_at<?').run(now()-30*86400000);
  }catch(error){delay=error.status===409?30000:Math.max(5000,Math.min(300000,Number(error.retryAfter||5)*1000));if(!stopped){const text=error.status===409?'Telegram düğme alıcısı başka bir bağlantıyla çakışıyor. Webhook veya ikinci alıcı ayarını kontrol edin.':error.status===401||error.status===403?'Telegram bot erişimi doğrulanamadı.':'Telegram düğme bağlantısı yeniden kuruluyor.';db.prepare('UPDATE telegram_bot_state SET last_error=? WHERE bot_key=?').run(text,botKey);}}
  finally{clearInterval(heartbeat);abort=null;release();polling=false;}return delay;
 }
 return {enabled,reserve,bind,handle,poll,synchronize,health,resume(){stopped=false;},stop(){stopped=true;abort?.abort();release();}};
}
