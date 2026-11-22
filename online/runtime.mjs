import {createUnifiedBackups} from './dokploy/unified-backup.mjs';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {statfs,mkdir,readdir,stat,rename,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {DB,sqlite,dataDir,dataKey} from './dokploy/database.mjs';
import {storage} from './portal/store.mjs';
import {audit} from './portal/operation-audit.mjs';
import {handle,syncPushOrders,telegramOrderAction} from './portal/worker.mjs';
import {createPush} from './dokploy/push.mjs';
import {createTelegram} from './dokploy/telegram.mjs';
import {auth,normalize,credential} from './portal/auth.mjs';

const keyPath=join(dataDir,'sites-data.key');
try{readFileSync(keyPath);}catch(error){
 if(error.code!=='ENOENT')throw error;
 if(sqlite.prepare("SELECT 1 FROM portal_records WHERE key='config'").get())throw Error('Online sipariş şifreleme anahtarı eksik. Mevcut sites-data.key dosyasını bağlayın.');
 writeFileSync(keyPath,randomBytes(32).toString('base64'),{flag:'wx',mode:0o600});
}
const DATA_KEY=dataKey();
if(Buffer.from(DATA_KEY,'base64').length!==32)throw Error('Online veri anahtarı geçersiz.');
const origin=new URL(process.env.PANEL_URL||process.env.APP_URL||'http://localhost:3000').origin;
const PUSH=createPush(origin),TELEGRAM=createTelegram(origin,{getSnapshot:async()=>{const store=storage(env);return {orders:await store.get('orders',[]),pending:await store.get('pending',{})};},performOrderAction:async(id,action,actor)=>{let result;try{result=await telegramOrderAction(env,id,action,actor);return result;}finally{let cafe;try{const file=resolve(process.env.DATA_DIR||'data','natura.sqlite');if(existsSync(file)){cafe=new DatabaseSync(file);cafe.exec('PRAGMA busy_timeout=5000');audit(cafe,actor.username,'online.orders.'+action,id,result?.ok?'ok':'rejected');}}catch{console.warn('Telegram işlem geçmişi kafe kaydına yazılamadı.');}finally{cafe?.close();}}}});
const backupDir=join(dataDir,'backups');mkdirSync(backupDir,{recursive:true});
const BUCKET={
 async put(key,value){if(!/^backups\/[\w.:-]+\.json$/.test(key))throw Error('Geçersiz yedek yolu');const path=join(dataDir,key),temporary=path+'.'+randomUUID()+'.tmp';await writeFile(temporary,value,{mode:0o600});await rename(temporary,path);},
 async list(){const names=(await readdir(backupDir)).filter(n=>n.endsWith('.json'));return {objects:await Promise.all(names.map(async name=>({key:'backups/'+name,uploaded:(await stat(join(backupDir,name))).mtime}))) };},
 async delete(key){if(!/^backups\/[\w.:-]+\.json$/.test(key))throw Error('Geçersiz yedek yolu');await rm(join(dataDir,key),{force:true});}
};
const env={DB,BUCKET,DATA_KEY,PUSH,TELEGRAM,ORDERS_OBSERVED:orders=>{const now=Date.now();for(const o of orders)if(!o.test&&['Created','Picking'].includes(o.status)&&o.createdAt>now-120000)PUSH.enqueue(o);void PUSH.drain().catch(()=>{});TELEGRAM.enqueue(orders.filter(o=>!o.test&&['Created','Picking'].includes(o.status)&&o.createdAt>now-300000),orders.filter(o=>!o.test&&o.courierNearby&&['Created','Picking','Invoiced'].includes(o.status)&&o.createdAt>now-86400000));void TELEGRAM.drain().catch(()=>console.warn('Telegram kuyruğu tekrar denenecek.'));},ONLINE_CHANGED:()=>publishOnline()};
const legacySecurity=auth(env);
export async function legacyLogin(request,input){
 const row=sqlite.prepare('SELECT id FROM auth_users WHERE username=?').get(normalize(input.username));
 if(!row||String(row.id).startsWith('unified:'))return {cookie:null};
 try{return {cookie:await legacySecurity.login(request,input)};}catch(error){return {cookie:null,limited:error.status===429};}
}
export async function legacyOperator(token){
 if(!token)return null;
 const row=await legacySecurity.current(new Request(origin,{headers:{cookie:'__Host-om_session='+token}}));
 if(!row||row.id.startsWith('unified:'))return null;
 return {id:'portal:'+row.id,username:row.username,name:row.username,actor:row.username,role:row.role==='admin'?'online_admin':'online'};
}
export async function legacyLogout(token){if(token)await legacySecurity.logout(new Request(origin,{headers:{cookie:'__Host-om_session='+token}}));}
export function legacySessionValid(token,id){
 if(!/^[a-f0-9]{64}$/.test(token||'')||!id.startsWith('portal:'))return false;
 return !!sqlite.prepare("SELECT 1 FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.id=? AND u.id=? AND s.expires_at>? AND s.version=u.version AND u.enabled=1").get(createHash('sha256').update(token).digest('hex'),id.slice(7),Date.now());
}
export function listLegacyUsers(){return sqlite.prepare("SELECT id,username,role,enabled FROM auth_users WHERE id NOT LIKE 'unified:%' ORDER BY username").all().map(row=>({id:String(row.id),username:String(row.username),role:String(row.role),enabled:!!row.enabled}));}
export async function saveLegacyUser(input){
 const old=sqlite.prepare("SELECT * FROM auth_users WHERE id=? AND id NOT LIKE 'unified:%'").get(input.id);
 if(!old)throw Object.assign(Error('Kullanıcı bulunamadı.'),{status:404});
 const password=input.password?JSON.stringify(await credential(input.password,input.role==='admin')):old.credential;
 sqlite.prepare('UPDATE auth_users SET username=?,role=?,credential=?,enabled=?,version=version+1 WHERE id=?').run(normalize(input.username),input.role==='admin'?'admin':'viewer',password,Number(input.enabled),input.id);
 sqlite.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(input.id);
}
export function removeLegacyUser(id){
 if(String(id).startsWith('unified:'))throw Error('Geçersiz kullanıcı.');
 sqlite.exec('BEGIN IMMEDIATE');try{sqlite.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(id);sqlite.prepare('DELETE FROM push_subscriptions WHERE user_id=?').run(id);sqlite.prepare('DELETE FROM auth_users WHERE id=?').run(id);sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
}

// Legacy credentials stay intact for rollback; shared identities have a namespace.
export function syncIdentities(){
 const path=resolve(process.env.DATA_DIR||'data','natura.sqlite');let cafe;
 try{
  cafe=new DatabaseSync(path,{readOnly:true});
  const employees=cafe.prepare('SELECT id,username,name,role,password_hash,is_active FROM employees').all();
  const access=cafe.prepare("SELECT 1 FROM sqlite_master WHERE name='user_access' AND type='table'").get()?new Map(cafe.prepare('SELECT id,role FROM user_access').all().map(row=>[row.id,row.role])):new Map();
  const admin=cafe.prepare('SELECT username FROM admin_identity WHERE id=1').get();
  const adminHash=cafe.prepare('SELECT password_hash FROM admin_credentials WHERE id=1').get()?.password_hash||process.env.ADMIN_PASSWORD||'';
  const revision=(value)=>JSON.stringify({shared:true,revision:createHash('sha256').update(String(value)).digest('hex')});
  const rows=[{id:'unified:admin',username:'@unified-admin',enabled:1,credential:revision(String(admin?.username)+':'+adminHash)},...employees.map(e=>({id:'unified:'+e.id,username:'@unified-'+e.id,enabled:Number(e.is_active&&['admin','cashier','kitchen'].includes(access.get('employee:'+e.id)||e.role)),credential:revision(e.username+':'+e.role+':'+e.password_hash+':'+(access.get('employee:'+e.id)||e.role))}))];
  sqlite.exec('BEGIN IMMEDIATE');
  try{sqlite.prepare("UPDATE auth_users SET enabled=0 WHERE id LIKE 'unified:%'").run();for(const row of rows)sqlite.prepare(`INSERT INTO auth_users(id,username,role,credential,enabled,version) VALUES(?,?,'viewer',?,?,1) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,username=excluded.username,version=CASE WHEN auth_users.credential<>excluded.credential THEN auth_users.version+1 ELSE auth_users.version END,credential=excluded.credential`).run(row.id,row.username,row.credential,row.enabled);sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
 }catch(error){if(process.env.ONLINE_BACKGROUND!=='0')console.warn('Online bildirim kullanıcıları henüz eşitlenemedi.');}
 finally{cafe?.close();}
}
export async function onlineRequest(request,operator){
 const original=new URL(request.url),path=original.pathname.replace(/^\/online(?=\/|$)/,'')||'/';
 const host=request.headers.get('host')||original.host;
 const canonical=[process.env.PANEL_URL,process.env.APP_URL,process.env.MENU_URL].filter(Boolean).find(value=>new URL(value).host===host);
 const external=new URL(canonical||original.protocol+'//'+host);
 original.protocol=external.protocol;original.hostname=external.hostname;original.port=external.port;
 const publicAsset=['/push-worker.js','/scooter-192.png','/scooter-512.png'].includes(path);
 if(!operator&&!publicAsset)return Response.json({error:'Lütfen giriş yapın.'},{status:401});
 if(operator?.role==='kitchen'&&(path.startsWith('/api/')&&!['/api/state','/api/sync','/api/push','/api/auth/renew-print-session'].includes(path)&&!/^\/api\/orders\/[^/]+\/(actions|receipt-code)$/.test(path)))return Response.json({error:'Mutfak kullanıcısı yalnız siparişleri yönetebilir.'},{status:403});
 if(path==='/api/users'||path.startsWith('/api/users/'))return Response.json({error:'Kullanıcılar ortak Ayarlar bölümünden yönetilir.'},{status:403});
 if(operator?.role==='waiter'&&(path==='/'||path.startsWith('/api/')))return Response.json({error:'Garson yalnız masa siparişlerini yönetebilir.'},{status:403});
 if(path.startsWith('/api/auth/')&&path!=='/api/auth/renew-print-session'&&!(path==='/api/auth/password'&&(operator?.role==='online_admin'||operator?.onlineAdmin&&operator?.onlineUserId)))return Response.json({error:'Hesap işlemleri ortak Ayarlar bölümündedir.'},{status:403});
 if(path.startsWith('/api/users/')&&decodeURIComponent(path.split('/').pop()).startsWith('unified:'))return Response.json({error:'Kafe kullanıcıları ortak Çalışanlar bölümündedir.'},{status:403});
 if(path==='/api/auth/renew-print-session')return Response.json({ok:true});
 if(path==='/api/push')syncIdentities();
 const user=operator?{id:operator.onlineUserId||(operator.id.startsWith('portal:')?operator.id.slice(7):'unified:'+operator.id),username:operator.username,role:operator.onlineAdmin||['admin','online_admin'].includes(operator.role)?'admin':'viewer',enabled:true}:null;
 const AUTH={...legacySecurity,current:async()=>user,configured:async()=>true,list:async()=>(await legacySecurity.list()).filter(row=>!row.id.startsWith('unified:')),enabled:async(id,value)=>{if(String(id).startsWith('unified:'))throw Object.assign(Error('Kafe kullanıcılarını Çalışanlar bölümünden yönetin.'),{status:403});return legacySecurity.enabled(id,value);}};
 const url=new URL(original);url.pathname=path;
 const headers=new Headers(request.headers);
 const incoming=new Request(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer()});
 const response=await handle(incoming,{...env,AUTH,STATE_FROM_BACKGROUND:true});
 if(response.ok&&request.method!=='GET')publishOnline();
 // The original UI is framed only by our shared panel, never an external site.
 response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'");
 response.headers.set('X-Frame-Options','SAMEORIGIN');
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
const listeners=new Set();
export function subscribeOnline(callback){listeners.add(callback);return()=>listeners.delete(callback);}
function publishOnline(){for(const callback of listeners)try{callback();}catch{}}
export async function renewLegacy(request){return auth(env).renew(request);}
let lastTickMs=0,cpuSample=process.cpuUsage(),cpuSampleAt=performance.now();
let cursor=Date.now(),timer,sendTimer,callbackTimer,onlineStopped=false;
export async function tick(){const started=performance.now();syncIdentities();const result=await syncPushOrders(env,cursor);if(!result)return;TELEGRAM.enqueue(result.orders,result.courierOrders);void TELEGRAM.drain().catch(()=>console.warn('Telegram kuyruğu tekrar denenecek.'));cursor=result.now;lastTickMs=Math.round(performance.now()-started);publishOnline();for(const order of result.orders)await PUSH.send(order);}
export function startOnline(){
 if(timer||process.env.ONLINE_BACKGROUND==='0')return;onlineStopped=false;TELEGRAM.startCallbacks();
 const poll=async()=>{try{await tick();}catch{console.warn('Online sipariş kontrolü tekrar denenecek.');}finally{if(!onlineStopped){timer=setTimeout(poll,15000);timer.unref();}}};
 const send=async()=>{try{await Promise.allSettled([TELEGRAM.drain(),PUSH.drain()]);}catch{console.warn('Telegram kuyruğu tekrar denenecek.');}finally{if(!onlineStopped){sendTimer=setTimeout(send,5000);sendTimer.unref();}}};
 const callbacks=async()=>{let delay=1000;try{delay=await TELEGRAM.pollCallbacks()||1000;}catch{delay=10000;console.warn('Telegram düğme alıcısı yeniden denenecek.');}finally{if(!onlineStopped){callbackTimer=setTimeout(callbacks,delay);callbackTimer.unref();}}};
 timer=setTimeout(poll,1000);timer.unref();{sendTimer=setTimeout(send,5000);sendTimer.unref();if(TELEGRAM.enabled){callbackTimer=setTimeout(callbacks,1000);callbackTimer.unref();}}
}
export function stopOnline(){onlineStopped=true;clearTimeout(timer);clearTimeout(sendTimer);clearTimeout(callbackTimer);TELEGRAM.stopCallbacks();timer=undefined;}
startOnline();

const unifiedBackups=createUnifiedBackups();
export async function operationsHealth(){const sample=process.cpuUsage(),elapsed=Math.max(1,performance.now()-cpuSampleAt),cpuPercent=Math.round(((sample.user-cpuSample.user)+(sample.system-cpuSample.system))/elapsed/10);cpuSample=sample;cpuSampleAt=performance.now();const disk=await statfs(dataDir);return {backup:await unifiedBackups.status(),telegram:TELEGRAM.localStatus(),performance:{cpuPercent,lastTickMs,diskFreeMB:Math.round(Number(disk.bavail)*Number(disk.bsize)/1048576),rssMB:Math.round(process.memoryUsage().rss/1048576),heapMB:Math.round(process.memoryUsage().heapUsed/1048576),uptimeSeconds:Math.round(process.uptime()),cpuMicros:process.cpuUsage(),pushQueue:sqlite.prepare("SELECT status,COUNT(*) AS count FROM online_push_queue GROUP BY status").all(),timing:sqlite.prepare("SELECT order_id AS id,detected_at AS detectedAt,telegram_sent_at-detected_at AS telegramMs,push_sent_at-detected_at AS pushMs FROM notification_timing ORDER BY detected_at DESC LIMIT 20").all()},onlinePushSubscriptions:Number(sqlite.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n)};}
export async function runUnifiedBackup(){return unifiedBackups.run();}
export function retryTelegram(id){return TELEGRAM.retry(id);}
if(process.env.ONLINE_BACKGROUND!=='0')unifiedBackups.start();
