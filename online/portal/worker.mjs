import {auth,publicUser} from './auth.mjs';
import {Buffer} from 'node:buffer';
import {fetchPackages,fetchPackage,updatePackage} from './trendyol.mjs';
import {createOrderActions} from './order-actions.mjs';
import {createReviewService} from './reviews.mjs';
import {restaurantGroups} from './public/summary.js';
import {storage,seal,unseal} from './store.mjs';
import {assets} from './assets.generated.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const ORDER_REFRESH_SECONDS=15;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function validate(input,old){
 const a={id:old?.id||crypto.randomUUID(),label:String(input.label||'').trim(),supplierId:String(input.supplierId||'').trim(),environment:input.environment,agentName:String(input.agentName||old?.agentName||'OnlineMutfak').trim(),executorEmail:String(input.executorEmail||old?.executorEmail||'').trim(),apiKey:String(input.apiKey||old?.apiKey||'').trim(),apiSecret:String(input.apiSecret||old?.apiSecret||'').trim(),stores:input.stores||[]};
 if(!a.label||!/^\d+$/.test(a.supplierId)||!['prod','stage'].includes(a.environment)||!a.agentName||!/^\S+@\S+\.\S+$/.test(a.executorEmail)||!a.apiKey||!a.apiSecret)throw fail('Hesap ve API bilgilerini eksiksiz doldurun.');
 if([a.agentName,a.executorEmail,a.apiKey,a.apiSecret].some(v=>/[\r\n]/.test(v)))throw fail('Alanlarda satır sonu bulunamaz.');
 if(!Array.isArray(a.stores)||a.stores.some(s=>!/^\d+$/.test(String(s.id))||!String(s.name||'').trim()))throw fail('Şube bilgilerini kontrol edin.');return a;
}
async function loadConfig(env,store){
 const encrypted=await store.get('config',null);
 return encrypted?await unseal(encrypted,env.DATA_KEY):JSON.parse(env.INITIAL_CONFIG||'{"accounts":[],"interval":30}');
}
async function context(env,store){
 const config=await loadConfig(env,store);
 let orders=await store.get('orders',[]),statuses=await store.get('statuses',{}),history=await store.get('order-history',[]);
 const persistConfig=async()=>store.set('config',await seal(config,env.DATA_KEY));
 const refresh=async(account,id)=>{const fresh=await fetchPackage(account,id),old=orders.find(o=>o.id===fresh.id);const merged=old&&Number(old.modifiedAt)>Number(fresh.modifiedAt)?old:{...fresh,firstSeenAt:old?.firstSeenAt||Date.now()};orders=[...orders.filter(o=>o.id!==merged.id),merged];await store.set('orders',orders);return merged;};
 const actions=createOrderActions({initial:await store.get('pending',{}),getOrder:id=>orders.find(o=>o.id===id),getAccount:id=>config.accounts.find(a=>a.id===id),refresh,send:(a,id,action)=>updatePackage(a,id,action,{preparationTime:15}),persist:v=>store.set('pending',v),record:async entry=>{history=[...history,entry].slice(-500);await store.set('order-history',history);}});
 const reviews=createReviewService({initial:await store.get('reviews',{}),getGroups:()=>restaurantGroups(config.accounts,orders),getAccount:id=>config.accounts.find(a=>a.id===id),persist:v=>store.set('reviews',v)});
 async function sync(force=false){for(const a of config.accounts){const prev=statuses[a.id]||{};if(!force&&prev.nextAt>Date.now())continue;try{const end=Date.now(),rows=await fetchPackages(a,{start:prev.cursor?prev.cursor-300000:end-48*3600000,end});const map=new Map(orders.map(o=>[o.id,o]));for(const o of rows){const old=map.get(o.id);if(!old||Number(o.modifiedAt)>=Number(old.modifiedAt))map.set(o.id,{...o,firstSeenAt:old?.firstSeenAt||Date.now()});}const next=[...map.values()].filter(o=>!o.createdAt||o.createdAt>Date.now()-30*86400000);if(JSON.stringify(next)!==JSON.stringify(orders)){await store.set('orders',next);orders=next;}statuses[a.id]={state:'ok',message:'Bağlantı başarılı · '+rows.length+' paket alındı',lastSuccess:Date.now(),lastAttempt:end,cursor:end,coverageSince:prev.coverageSince||end-48*3600000,nextAt:Date.now()+ORDER_REFRESH_SECONDS*1000,failures:0};}catch(e){const failures=(prev.failures||0)+1;statuses[a.id]={...prev,state:'error',message:e.name==='TimeoutError'?'API yanıt süresi aşıldı.':e.message,failures,nextAt:Date.now()+Math.max(e.retryAfter||0,Math.min(900,30*2**Math.min(failures,5)))*1000};}}await store.set('statuses',statuses);await actions.reconcile(orders);}
 async function backup(force=false){let info=await store.get('backup-info',{engine:'Sites D1',backups:0,lastBackup:null,lastBackupAt:null});if(!force&&info.lastBackupAt>Date.now()-3600000)return info;const name='portal-'+new Date().toISOString()+'.json';const snapshot={version:1,createdAt:Date.now(),owner:await store.get('owner',null),authUsers:(await env.DB.prepare('SELECT * FROM auth_users').bind().all()).results,config:await seal(config,env.DATA_KEY),orders,statuses,reviews:await store.get('reviews',{}),pending:await store.get('pending',{}),history};await env.BUCKET.put('backups/'+name,JSON.stringify(snapshot),{httpMetadata:{contentType:'application/json'}});const objects=(await env.BUCKET.list({prefix:'backups/'})).objects.sort((a,b)=>b.uploaded-a.uploaded);for(const old of objects.slice(48))await env.BUCKET.delete(old.key);info={engine:'Sites D1 + R2',backups:Math.min(objects.length,48),lastBackup:name,lastBackupAt:Date.now()};await store.set('backup-info',info);return info;}
 const safe=a=>({id:a.id,label:a.label,supplierId:a.supplierId,environment:a.environment,agentName:a.agentName,executorEmail:a.executorEmail,stores:a.stores,configured:!!a.apiKey,status:statuses[a.id]||{state:'waiting',message:'Kontrol bekleniyor.'}});
 return {config,persistConfig,sync,backup,actions,reviews,safe,async state(user){return {user,accounts:config.accounts.map(a=>user.role==='admin'?safe(a):{id:a.id,label:a.label,stores:a.stores,environment:a.environment,status:safe(a).status}),orders,interval:ORDER_REFRESH_SECONDS,busy:false,canManageOrders:true,canUseReviews:true,orderActions:actions.snapshot(),settings:{preparationWarningMinutes:15},...(user.role==='admin'?{storage:await store.get('backup-info',null)}:{}),serverTime:Date.now()};},async remove(id){config.accounts=config.accounts.filter(a=>a.id!==id);await persistConfig();orders=orders.filter(o=>o.accountId!==id);await store.set('orders',orders);delete statuses[id];await store.set('statuses',statuses);}};
}
export async function syncPushOrders(env, since) {
 const store=storage(env), token=await store.lock();
 if(!token)return null;
 try {
  const c=await context(env,store);
  await c.sync();
  const now=Date.now();
  const orders=await store.get('orders',[]);
  const groups=restaurantGroups(c.config.accounts,orders);
  const namedOrders=orders.map(order=>({
   ...order,
   restaurant:groups.find(group=>group.accountId===order.accountId&&group.storeId===order.storeId)?.name || order.restaurant
  }));
  return {
   now,
   orders:namedOrders.filter(o=>!o.test && ['Created','Picking'].includes(o.status) &&
    o.firstSeenAt>since && o.createdAt>now-300000),
   courierOrders:namedOrders.filter(o=>!o.test && o.courierNearby &&
    ['Created','Picking','Invoiced'].includes(o.status) && o.createdAt>now-86400000)
  };
 } finally {await store.unlock(token);}
}
export async function handle(request,env,ctx){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(!env.DB||!env.BUCKET||!env.DATA_KEY)return json({error:'Sites depolama yapılandırması tamamlanmadı.'},503);
  if(request.method!=='GET'&&(request.headers.get('origin')!==url.origin||request.headers.get('x-panel-request')!=='1'))return json({error:'İstek kaynağı reddedildi.'},403);
  const store=storage(env),security=env.AUTH||auth(env),current=await security.current(request),user=publicUser(current),admin=user?.role==='admin';
  const inputBody=async()=>{const text=await request.text();if(new TextEncoder().encode(text).length>65536)throw fail('İstek çok büyük.');try{return JSON.parse(text||'{}');}catch{throw fail('Geçersiz istek.');}};
  const withCookie=value=>{const response=json({ok:true});response.headers.set('Set-Cookie',value);return response;};
  if(path==='/api/auth/status'&&request.method==='GET')return json({configured:await security.configured(),authenticated:!!user,user,canSetup:!!request.headers.get('oai-authenticated-user-id')&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.OWNER_EMAIL?.toLowerCase()});
  if(request.method==='POST'&&path==='/api/auth/setup')return withCookie(await security.setup(request,await inputBody()));
  if(request.method==='POST'&&path==='/api/auth/login')return withCookie(await security.login(request,await inputBody()));
  if(request.method==='GET'&&['/manifest.webmanifest','/scooter-192.png','/scooter-512.png','/push-worker.js'].includes(path)){
   const asset=assets[path.slice(1)];
   return new Response(asset.base64?Buffer.from(asset.body,'base64'):asset.body,{
    headers:{'Content-Type':path.endsWith('.webmanifest')?'application/manifest+json':asset.type,'X-Content-Type-Options':'nosniff'}
   });
  }
  if(path==='/favicon.ico')return new Response(null,{status:204});
  if(request.method==='GET'&&['/login','/login.js','/login.css'].includes(path)){if(path==='/login'&&user)return Response.redirect(url.origin+'/',303);const file=path==='/login'?'login.html':path.slice(1),asset=assets[file];return new Response(asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});}
  if(!user){if(path.startsWith('/api/'))return json({error:'Kullanıcı adınız ve şifrenizle giriş yapın.'},401);return Response.redirect(url.origin+'/login',303);}
  if(path==='/api/telegram/check'||path==='/api/telegram/test'){
   if(!admin)return json({error:'Yönetici yetkisi gerekir.'},403);
   if(!env.TELEGRAM)return json({error:'Telegram kontrolü bu sürümde hazır değil.'},503);
   try{
    if(path==='/api/telegram/check'&&request.method==='GET')return json(await env.TELEGRAM.check());
    if(path==='/api/telegram/test'&&request.method==='POST')return json(await env.TELEGRAM.test());
   }catch(error){
    return json({error:'Telegram bağlantısı doğrulanamadı. Bot anahtarını, grup kimliğini ve grubun mesaj izinlerini kontrol edin.',code:error.status || null,operation:error.operation || null,network:error.networkCode || null},400);
   }
   return json({error:'Geçersiz işlem.'},405);
  }
  if(path==='/api/push'&&env.PUSH){
   if(request.method==='GET')return json({publicKey:env.PUSH.publicKey});
   if(request.method==='POST'){
    try{env.PUSH.add(user.id,await inputBody());}
    catch{return json({error:'Bildirim aboneliği kaydedilemedi.'},400);}
    return json({ok:true});
   }
   if(request.method==='DELETE'){
    env.PUSH.remove(user.id,(await inputBody()).endpoint);
    return json({ok:true});
   }
  }
  if(path==='/api/auth/renew-print-session'&&request.method==='POST')return withCookie(await security.renew(request));
  if(path==='/api/auth/logout'&&request.method==='POST')return withCookie(await security.logout(request));
  if(path==='/api/auth/password'&&request.method==='POST'){if(!admin)return json({error:'Yönetici yetkisi gerekir.'},403);return withCookie(await security.password(request,await inputBody()));}
  if(path==='/api/users'||path.startsWith('/api/users/')){if(!admin)return json({error:'Yönetici yetkisi gerekir.'},403);if(path==='/api/users'&&request.method==='GET')return json({users:await security.list()});if(path==='/api/users'&&request.method==='POST')return json({user:await security.add(await inputBody())},201);if(path==='/api/users/enabled'&&request.method==='POST'){const input=await inputBody();await security.enabled(input.id,input.enabled);return json({ok:true});}if(request.method==='DELETE'){await security.remove(decodeURIComponent(path.split('/').pop()));return json({ok:true});}return json({error:'Bulunamadı.'},404);}
  if(request.method==='GET'&&!path.startsWith('/api/')){const asset=assets[path==='/'?'index.html':path.slice(1)];if(!asset)return json({error:'Bulunamadı.'},404);return new Response(asset.base64?Buffer.from(asset.body,'base64'):asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'"}});}
  const receiptCodeRoute=request.method==='GET'&&path.match(/^\/api\/orders\/([^/]+)\/receipt-code$/);
  if(receiptCodeRoute){
   const orders=await store.get('orders',[]);
   const order=orders.find(item=>item.id===decodeURIComponent(receiptCodeRoute[1]));
   if(!order)return json({error:'Sipariş bulunamadı.'},404);
   if(order.orderCode!==undefined)return json({orderCode:order.orderCode});
   const config=await loadConfig(env,store);
   const account=config.accounts.find(item=>item.id===order.accountId);
   if(!account)return json({error:'Restoran bağlantısı bulunamadı.'},404);
   const fresh=await fetchPackage(account,order.packageId);
   return json({orderCode:fresh.orderCode});
  }
  const orderRoute=path.match(/^\/api\/orders\/([^/]+)\/actions$/),answerRoute=path.match(/^\/api\/reviews\/([^/]+)\/answer$/);
  if(!admin&&!['/api/state','/api/reviews','/api/reviews/sync','/api/sync'].includes(path)&&!orderRoute&&!answerRoute)return json({error:'Bu işlem için yönetici yetkisi gerekir.'},403);
  const token=await store.lock();
  if(!token){if(path==='/api/state'){const c=await context(env,store);return json({...await c.state(user),busy:true});}return json({error:'Başka bir işlem sürüyor. Biraz sonra tekrar deneyin.'},409);}
  try{
   const c=await context(env,store);
   if(path==='/api/state'&&request.method==='GET'){await c.sync();await c.backup().catch(async()=>{const info=await store.get('backup-info',{});await store.set('backup-info',{...info,error:'Bulut yedeği alınamadı. Tekrar deneyin.'});});return json(await c.state(user));}
   if(path==='/api/sync'&&request.method==='POST'){const last=await store.get('manual-sync',0);if(Date.now()-last<10000)return json({ok:true,cached:true});await store.set('manual-sync',Date.now());await c.sync(true);return json({ok:true});}
   if(path==='/api/reviews'&&request.method==='GET'||path==='/api/reviews/sync'&&request.method==='POST')return json(await c.reviews.sync(request.method==='POST'));
   let input={};if(['POST','PUT','PATCH'].includes(request.method)){const text=await request.text();if(new TextEncoder().encode(text).length>65536)throw fail('İstek çok büyük.');input=text?JSON.parse(text):{};}
   if(orderRoute&&request.method==='POST')return json(await c.actions.run(decodeURIComponent(orderRoute[1]),input.action,user));
   if(answerRoute&&request.method==='POST')return json(await c.reviews.answer(decodeURIComponent(answerRoute[1]),input.text,user));
   if(path==='/api/accounts'&&request.method==='POST'){const old=c.config.accounts.find(a=>a.id===input.id),a=validate(input,old);if(c.config.accounts.some(v=>v.id!==a.id&&v.supplierId===a.supplierId&&v.environment===a.environment))throw fail('Bu hesap zaten kayıtlı.');c.config.accounts=[...c.config.accounts.filter(v=>v.id!==a.id),a];await c.persistConfig();return json({account:c.safe(a)});}
   if(path.startsWith('/api/accounts/')&&request.method==='DELETE'){await c.remove(decodeURIComponent(path.split('/').pop()));return json({ok:true});}
   if(path==='/api/backup'&&request.method==='POST')return json(await c.backup(true));
   
   return json({error:'Bulunamadı.'},404);
  }finally{await store.unlock(token);}
 }catch(error){return json({error:error.status?error.message:'İşlem tamamlanamadı. Lütfen yeniden deneyin.'},error.status||400);}
}
export default {fetch(request,env,ctx){const task=handle(request,env,ctx);ctx?.waitUntil?.(task.then(()=>{},()=>{}));return task;}};
