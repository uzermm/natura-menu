import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {unifiedDestination} from '../src/lib/app-hosts.ts';
import {sameOrigin} from '../src/lib/security.ts';
import {createOrderActions} from '../online/portal/order-actions.mjs';

const data=mkdtempSync(path.join(tmpdir(),'unified-panel-test-'));
process.env.DATA_DIR=data;process.env.ONLINE_DATA_DIR=path.join(data,'online');process.env.ONLINE_BACKGROUND='0';
process.env.APP_URL='https://natura.example';process.env.MENU_URL='https://natura.example';process.env.PANEL_URL='https://mutfak.example';
const {onlineRequest,syncIdentities,legacyLogin,legacyOperator,subscribeOnline,tick}=await import('../online/runtime.mjs');
const {credential}=await import('../online/portal/auth.mjs');
const {sqlite}=await import('../online/dokploy/database.mjs');
after(()=>{sqlite.close();rmSync(data,{recursive:true,force:true});});
test('QR stays public, old admin redirects, panel root rewrites and receipt links survive',()=>{
 const route=(url:string)=>unifiedDestination(new URL(url));
 assert.equal(route('https://natura.example/'),null);
 assert.equal(route('https://natura.example/admin')?.url?.href,'https://mutfak.example/');
 assert.equal(route('https://natura.example/admin/login')?.url?.href,'https://mutfak.example/login');
 assert.equal(route('https://mutfak.example/')?.url?.pathname,'/admin');
 assert.equal(route('https://mutfak.example/login')?.url?.pathname,'/admin/login');
 assert.equal(route('https://mutfak.example/admin/adisyon/123?format=thermal')?.url?.href,'https://mutfak.example/adisyon/123?format=thermal');
 assert.equal(route('https://mutfak.example/adisyon/123')?.url?.pathname,'/admin/adisyon/123');
 for(const p of ['/online/api/state','/api/auth/login','/api/admin/state','/api/pos','/api/staff/login','/api/online-events'])assert.equal(route('https://natura.example'+p)?.kind,'reject');
 assert.equal(route('https://natura.example/api/orders'),null);
});
test('both hosts require their own exact same origin',()=>{
 assert.equal(sameOrigin(new Request('https://mutfak.example/api/pos',{headers:{origin:'https://mutfak.example'}})),true);
 assert.equal(sameOrigin(new Request('https://natura.example/api/orders',{headers:{origin:'https://natura.example'}})),true);
 assert.equal(sameOrigin(new Request('https://mutfak.example/api/pos',{headers:{origin:'https://natura.example'}})),false);
 assert.equal(sameOrigin(new Request('https://mutfak.example/api/pos',{headers:{origin:'https://evil.example'}})),false);
});
test('online requests use shared identities, preserve role permissions and expose no second login',async()=>{
 const admin={id:'admin',username:'owner',role:'admin'},cashier={id:'employee-1',username:'staff',role:'cashier'};
 const request=(p:string,method='GET')=>new Request('https://mutfak.example/online'+p,{method,headers:{origin:'https://mutfak.example','X-Panel-Request':'1'},body:method==='POST'?'{}':undefined});
 assert.equal((await onlineRequest(request('/api/state'),null)).status,401);
 const state=await (await onlineRequest(request('/api/state'),cashier)).json();assert.equal(state.user.id,'unified:employee-1');assert.equal(state.user.role,'viewer');assert.equal(state.canManageOrders,true);
 assert.equal((await onlineRequest(request('/api/accounts','POST'),cashier)).status,403);
 assert.equal((await onlineRequest(request('/api/auth/login','POST'),admin)).status,403);
 assert.equal((await onlineRequest(request('/api/users'),cashier)).status,403);
 assert.equal((await onlineRequest(request('/api/users'),admin)).status,403);
 for(const path of ['/','/api/state','/api/reviews','/api/orders/action','/api/users'])assert.equal((await onlineRequest(request(path),{id:'waiter-only',username:'waiter',role:'waiter'})).status,403);
 assert.equal((await onlineRequest(new Request('https://mutfak.example/online/api/accounts',{method:'POST',body:'{}'}),admin)).status,403);
 const html=await onlineRequest(request('/'),admin);assert.equal(html.headers.get('X-Frame-Options'),'SAMEORIGIN');assert.match(await html.text(),/\/online\/app.js/);
 const kitchen={id:'kitchen',username:'kitchen',role:'kitchen'};const kitchenState=await(await onlineRequest(request('/api/state'),kitchen)).json();assert.equal(kitchenState.canManageOrders,true);assert.equal(kitchenState.user.role,'viewer');for(const path of ['/api/reviews','/api/accounts','/api/users'])assert.equal((await onlineRequest(request(path),kitchen)).status,403);
 const save=new Request('http://127.0.0.1:3000/online/api/accounts',{method:'POST',headers:{host:'mutfak.example',origin:'https://mutfak.example','X-Panel-Request':'1'},body:JSON.stringify({label:'QA',supplierId:'1',environment:'stage',agentName:'QA',executorEmail:'qa@example.test',apiKey:'test-only',apiSecret:'test-only',stores:[]})});
 assert.equal((await onlineRequest(save,admin)).status,200,'HTTPS origin behind the tunnel must remain valid for writes');
});
test('original portal hashes, short passwords, roles and disabled flags remain authoritative',async()=>{
 const hash=JSON.stringify(await credential('1234'));
 const ownerHash=JSON.stringify(await credential('original-admin-8',true));
 sqlite.prepare('INSERT INTO auth_users VALUES(?,?,?,?,?,1)').run('source-owner','legacy.owner','admin',ownerHash,1);
 sqlite.prepare('INSERT INTO auth_users VALUES(?,?,?,?,?,1)').run('source-staff','legacy.staff','viewer',hash,1);
 sqlite.prepare('INSERT INTO auth_users VALUES(?,?,?,?,?,1)').run('source-disabled','legacy.disabled','viewer',hash,0);
 const req=new Request('https://mutfak.example/api/auth/login',{headers:{'cf-connecting-ip':'local-unit-test'}});
 const login=await legacyLogin(req,{username:'legacy.staff',password:'1234'});assert.ok(login.cookie);
 const token=login.cookie.split(';')[0].split('=')[1];const operator=await legacyOperator(token);assert.equal(operator?.role,'online');assert.equal(operator?.id,'portal:source-staff');
 const adminLogin=await legacyLogin(req,{username:'legacy.owner',password:'original-admin-8'});assert.equal((await legacyOperator(adminLogin.cookie!.split(';')[0].split('=')[1]))?.role,'online_admin');
 assert.equal((await legacyLogin(req,{username:'legacy.disabled',password:'1234'})).cookie,null);
 assert.equal(sqlite.prepare("SELECT credential FROM auth_users WHERE id='source-staff'").get()?.credential,hash);
 assert.ok((await import('../online/runtime.mjs')).listLegacyUsers().some((user:{username:string})=>user.username==='legacy.staff'));
 sqlite.prepare("UPDATE auth_users SET enabled=0,version=version+1 WHERE id='source-staff'").run();assert.equal(await legacyOperator(token),null);
});
test('notification recipients follow shared enabled users, not old portal credentials',()=>{
 const cafe=new DatabaseSync(path.join(data,'natura.sqlite'));
 cafe.exec("CREATE TABLE employees(id TEXT,username TEXT,name TEXT,role TEXT,password_hash TEXT,is_active INTEGER);CREATE TABLE admin_identity(id INTEGER,username TEXT);CREATE TABLE admin_credentials(id INTEGER,password_hash TEXT);INSERT INTO admin_identity VALUES(1,'owner');INSERT INTO employees VALUES('e1','employee','Employee','cashier','hash-one',1)");
 sqlite.prepare("INSERT INTO auth_users VALUES('legacy','legacy','admin','{}',1,1)").run();
 syncIdentities();assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='unified:e1'").get()?.enabled,1);
 assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='legacy'").get()?.enabled,1);
 cafe.prepare("UPDATE employees SET password_hash='hash-two'").run();syncIdentities();assert.equal(sqlite.prepare("SELECT version FROM auth_users WHERE id='unified:e1'").get()?.version,2);
 cafe.prepare("UPDATE employees SET role='waiter'").run();syncIdentities();assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='unified:e1'").get()?.enabled,0);cafe.prepare("UPDATE employees SET role='kitchen'").run();syncIdentities();assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='unified:e1'").get()?.enabled,1);
 cafe.prepare('UPDATE employees SET is_active=0').run();syncIdentities();assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='unified:e1'").get()?.enabled,0);cafe.close();
});

test('cashier can accept and mark an online order ready without configuration access',async()=>{
 const cashier={id:'cashier-action-test',username:'cashier',role:'cashier'};
 const response=await onlineRequest(new Request('https://mutfak.example/online/api/state'),cashier);
 const state=await response.json();assert.equal(state.canManageOrders,true);
 const order={id:'test-action',accountId:'test-account',packageId:'test-package',status:'Created'};
 const sent:string[]=[];
 const actions=createOrderActions({getOrder:()=>order,getAccount:()=>({id:'test-account'}),refresh:async()=>({...order}),send:async(_account:unknown,_package:string,action:string)=>{sent.push(action);order.status=action==='accept'?'Picking':'Invoiced';},persist:async()=>{}});
 await actions.run(order.id,'accept',state.user);assert.equal(order.status,'Picking');
 await actions.run(order.id,'ready',state.user);assert.equal(order.status,'Invoiced');
 assert.deepEqual(sent,['accept','ready']);
 assert.equal((await onlineRequest(new Request('https://mutfak.example/online/api/users'),cashier)).status,403);
});

test('background refresh notifies open panels immediately and unsubscribed panels stop receiving events',async()=>{let notified=0,first=0;const unsubscribe=subscribeOnline(()=>notified++);try{await tick();first=notified;assert.ok(first>=1);}finally{unsubscribe();}await tick();assert.equal(notified,first);});
