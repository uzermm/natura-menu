// CI-only smoke test. Creates and removes its own disposable Docker resources.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
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
 const menu=await request('/');assert.equal(menu.status,200);assert.doesNotMatch(menu.data,/WhatsApp|Sepetim|Siparişini oluştur|sepete ekle/);
 assert.equal((await request('/api/order',{lines:[]})).status,404);
 assert.equal((await request('/api/admin/state')).status,401);
 const login=await request('/api/auth/login',{password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const state=(await request('/api/admin/state')).data;
 assert.equal(state.categories.length,9);assert.equal(state.categories.flatMap(c=>c.items).length,95);
 const categoryButtons=[...menu.data.matchAll(/<button\b[^>]*aria-controls="category-products-[^"]+"[^>]*>/g)];
 assert.equal(categoryButtons.length,state.categories.filter(c=>c.is_active).length);
 assert.ok(categoryButtons.every(match=>match[0].includes('aria-expanded="false"')),'Every category must be collapsed on first load.');
 const generated=state.categories.flatMap(c=>c.items).filter(i=>i.image_url.startsWith('/menu/ai-'));
 assert.equal(generated.length,12);
 for(const item of generated){assert.equal(item.image_generated,true);for(const url of [item.image_url,item.image_url.replace('.webp','-sm.webp')]){const response=await fetch(base+url);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/webp/);}}
 assert.equal(state.settings.campaign,null);assert.doesNotMatch(menu.data,/Her molanın|NATURA’YA HOŞ GELDİNİZ|aria-label="Kampanya"/);
 const business={...state.settings,table_count:30};
 assert.equal((await request('/api/admin/settings',business)).status,200);
 const product=state.categories.filter(c=>c.is_active).flatMap(c=>c.items).find(i=>i.is_active&&!i.sold_out&&i.image_url&&!i.variants.length&&i.price>1);
 const campaign={item_id:product.id,variant:'',price:Math.floor(product.price*.75),title:'Haftanın fırsatı'};
 assert.equal((await request('/api/admin/settings',{...business,campaign})).status,200);
 const promoted=(await request('/')).data;assert.match(promoted,/aria-label="Kampanya"/);assert.match(promoted,/Haftanın fırsatı/);assert.match(promoted,/<del aria-label="Menü fiyatı"/);assert.match(promoted,/<strong aria-label="Kampanya fiyatı"/);
 assert.equal((await request('/api/admin/settings',{...business,campaign:{...campaign,price:product.price}})).status,400);
 assert.equal((await request('/api/admin/items',{...product,sold_out:true})).status,200);
 assert.doesNotMatch((await request('/')).data,/aria-label="Kampanya"/);
 assert.equal((await request('/api/admin/items',product)).status,200);
 assert.equal((await request('/api/admin/settings',{...business,campaign:null})).status,200);
 assert.doesNotMatch((await request('/')).data,/aria-label="Kampanya"/);
 assert.equal((await request('/api/admin/settings',{...business,campaign})).status,200);
 for(const table of [0,-1,1.5,31])assert.equal((await request('/api/waiter',{table})).status,400);
 assert.equal((await request('/api/waiter',{table:1})).status,200);
 assert.equal((await request('/api/waiter',{table:1})).status,200); // Duplicate requests create only one call.
 assert.equal((await request('/api/admin/calls')).data.filter(c=>!c.resolved_at&&c.table_number===1).length,1);
 assert.equal((await request('/admin')).status,200); // Server -> Client serialization with a call present.
 const qr=await request('/api/admin/qr?table=1');assert.equal(qr.status,200);assert.match(qr.data,/<svg/);
 const image=state.categories[0].items.find(i=>i.image_url).image_url;assert.equal((await fetch(base+image)).status,200);
 docker('restart',name);await ready();
 const after=(await request('/api/admin/state')).data;
 assert.equal(after.settings.table_count,30);assert.equal(after.calls.filter(c=>!c.resolved_at).length,1);assert.deepEqual(after.settings.campaign,campaign);
 const exported=docker('exec',name,'node','scripts/backup.mjs');assert.match(exported,/Backup ready:/);
 console.log('PASS: Linux container, non-root volume writes, menu, login, QR, waiter call, restart persistence and online backup.');
} catch(error) {
 try {console.error(docker('logs',name));}catch{}
 throw error;
} finally {
 try{docker('rm','-f',name);}catch{}
 try{docker('volume','rm',volume);}catch{}
}
