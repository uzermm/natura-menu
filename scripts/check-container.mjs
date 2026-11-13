// CI-only smoke test. Creates and removes its own disposable Docker resources.
import { execFileSync } from 'node:child_process';
import { randomBytes,createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
const suffix=randomBytes(6).toString('hex'),name=`natura-ci-${suffix}`,volume=`${name}-data`;
const password=randomBytes(24).toString('base64url'),secret=randomBytes(32).toString('hex');
const origin='https://natura.example',base='http://127.0.0.1:3000';let cookie='';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function ready(){for(let attempt=0;attempt<45;attempt++){try{if((await fetch(`${base}/api/health`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw new Error('Container did not become healthy.');}
async function request(url,body,method=body?'POST':'GET'){
 const response=await fetch(base+url,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:response.status,data,headers:response.headers};
}
try {
 docker('volume','create',volume);
 docker('run','-d','--name',name,'-p','127.0.0.1:3000:3000','--mount',`type=volume,source=${volume},target=/app/data`,'-e',`APP_URL=${origin}`,'-e',`ADMIN_PASSWORD=${password}`,'-e',`SESSION_SECRET=${secret}`,'natura-menu:ci');
 await ready();
 assert.equal((await request('/')).status,200);
 assert.equal((await request('/api/admin/state')).status,401);
 const login=await request('/api/auth/login',{password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const state=(await request('/api/admin/state')).data;
 assert.equal(state.categories.length,9);assert.equal(state.categories.flatMap(c=>c.items).length,95);
 assert.equal((await request('/api/admin/settings',{...state.settings,table_count:30})).status,200);
 const key=createHmac('sha256',secret).update('table:1').digest('base64url');
 assert.equal((await request('/api/waiter',{table:1,key})).status,200);
 assert.equal((await request('/admin')).status,200); // Server -> Client serialization with a call present.
 const qr=await request('/api/admin/qr?table=1');assert.equal(qr.status,200);assert.match(qr.data,/<svg/);
 const image=state.categories[0].items.find(i=>i.image_url).image_url;assert.equal((await fetch(base+image)).status,200);
 docker('restart',name);await ready();
 const after=(await request('/api/admin/state')).data;
 assert.equal(after.settings.table_count,30);assert.equal(after.calls.filter(c=>!c.resolved_at).length,1);
 const exported=docker('exec',name,'node','scripts/backup.mjs');assert.match(exported,/Backup ready:/);
 console.log('PASS: Linux container, non-root volume writes, menu, login, QR, waiter call, restart persistence and online backup.');
} catch(error) {
 try {console.error(docker('logs',name));}catch{}
 throw error;
} finally {
 try{docker('rm','-f',name);}catch{}
 try{docker('volume','rm',volume);}catch{}
}
