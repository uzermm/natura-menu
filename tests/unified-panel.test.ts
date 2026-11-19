import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {unifiedDestination} from '../src/lib/app-hosts.ts';
import {sameOrigin} from '../src/lib/security.ts';

const data=mkdtempSync(path.join(tmpdir(),'unified-panel-test-'));
process.env.DATA_DIR=data;process.env.ONLINE_DATA_DIR=path.join(data,'online');process.env.ONLINE_BACKGROUND='0';
process.env.APP_URL='https://natura.example';process.env.MENU_URL='https://natura.example';process.env.PANEL_URL='https://mutfak.example';
const {onlineRequest,syncIdentities}=await import('../online/runtime.mjs');
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
 for(const p of ['/online/api/state','/api/auth/login','/api/admin/state','/api/pos','/api/staff/login'])assert.equal(route('https://natura.example'+p)?.kind,'reject');
 assert.equal(route('https://natura.example/api/orders'),null);
});
test('both hosts require their own exact same origin',()=>{
 assert.equal(sameOrigin(new Request('https://mutfak.example/api/pos',{headers:{origin:'https://mutfak.example'}})),true);
 assert.equal(sameOrigin(new Request('https://natura.example/api/orders',{headers:{origin:'https://natura.example'}})),true);
 assert.equal(sameOrigin(new Request('https://mutfak.example/api/pos',{headers:{origin:'https://natura.example'}})),false);
 assert.equal(sameOrigin(new Request('https://mutfak.example/api/pos',{headers:{origin:'https://evil.example'}})),false);
});
test('online requests use shared identities, preserve role permissions and expose no second login',async()=>{
 const admin={id:'admin',username:'owner',role:'admin'},waiter={id:'employee-1',username:'staff',role:'waiter'};
 const request=(p:string,method='GET')=>new Request('https://mutfak.example/online'+p,{method,headers:{origin:'https://mutfak.example','X-Panel-Request':'1'},body:method==='POST'?'{}':undefined});
 assert.equal((await onlineRequest(request('/api/state'),null)).status,401);
 const state=await (await onlineRequest(request('/api/state'),waiter)).json();assert.equal(state.user.id,'unified:employee-1');assert.equal(state.user.role,'viewer');assert.equal(state.canManageOrders,true);
 assert.equal((await onlineRequest(request('/api/accounts','POST'),waiter)).status,403);
 assert.equal((await onlineRequest(request('/api/auth/login','POST'),admin)).status,403);
 assert.equal((await onlineRequest(request('/api/users'),admin)).status,403);
 assert.equal((await onlineRequest(new Request('https://mutfak.example/online/api/accounts',{method:'POST',body:'{}'}),admin)).status,403);
 const html=await onlineRequest(request('/'),admin);assert.equal(html.headers.get('X-Frame-Options'),'SAMEORIGIN');assert.match(await html.text(),/\/online\/app.js/);
 const save=new Request('http://127.0.0.1:3000/online/api/accounts',{method:'POST',headers:{host:'mutfak.example',origin:'https://mutfak.example','X-Panel-Request':'1'},body:JSON.stringify({label:'QA',supplierId:'1',environment:'stage',agentName:'QA',executorEmail:'qa@example.test',apiKey:'test-only',apiSecret:'test-only',stores:[]})});
 assert.equal((await onlineRequest(save,admin)).status,200,'HTTPS origin behind the tunnel must remain valid for writes');
});
test('notification recipients follow shared enabled users, not old portal credentials',()=>{
 const cafe=new DatabaseSync(path.join(data,'natura.sqlite'));
 cafe.exec("CREATE TABLE employees(id TEXT,username TEXT,name TEXT,role TEXT,password_hash TEXT,is_active INTEGER);CREATE TABLE admin_identity(id INTEGER,username TEXT);CREATE TABLE admin_credentials(id INTEGER,password_hash TEXT);INSERT INTO admin_identity VALUES(1,'owner');INSERT INTO employees VALUES('e1','employee','Employee','waiter','hash-one',1)");
 sqlite.prepare("INSERT INTO auth_users VALUES('legacy','legacy','admin','{}',1,1)").run();
 syncIdentities();assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='unified:e1'").get()?.enabled,1);
 assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='legacy'").get()?.enabled,1);
 cafe.prepare("UPDATE employees SET password_hash='hash-two'").run();syncIdentities();assert.equal(sqlite.prepare("SELECT version FROM auth_users WHERE id='unified:e1'").get()?.version,2);
 cafe.prepare('UPDATE employees SET is_active=0').run();syncIdentities();assert.equal(sqlite.prepare("SELECT enabled FROM auth_users WHERE id='unified:e1'").get()?.enabled,0);cafe.close();
});
