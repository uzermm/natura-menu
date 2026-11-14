import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';

// Run against a disposable database only. Called by the Linux container smoke test.
export async function checkPos({base,origin,adminCookie}){
 async function req(url,body,cookie=adminCookie,extra={}){const response=await fetch(base+url,{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined,redirect:'manual'});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:response.status,data,headers:response.headers};}
 const command=(command,cookie=adminCookie,id=randomUUID())=>req('/api/pos',{request_id:id,command},cookie);
 assert.equal((await req('/api/pos',undefined,'')).status,401);
 const initial=await req('/api/pos');assert.equal(initial.status,200);assert.equal((await req('/api/pos',undefined,adminCookie,{'If-None-Match':initial.headers.get('etag')})).status,304);
 const menu=(await req('/api/admin/state')).data.categories;
 const item=menu.filter(c=>c.is_active).flatMap(c=>c.items).find(i=>i.is_active&&!i.sold_out&&!i.variants.length&&i.price>=100);
 let t=(await command({action:'open',table:7})).data;
 const add={action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:item.id,variant:'',quantity:2,note:'Test siparişi'}]},addKey=randomUUID();
 t=(await command(add,adminCookie,addKey)).data;assert.equal(t.total,item.price*2);assert.equal((await command(add,adminCookie,addKey)).data.lines.length,1);
 assert.equal((await command({...add,lines:[{...add.lines[0],quantity:5}]})).status,409);
 const staffPassword=randomBytes(12).toString('hex');
 assert.equal((await req('/api/pos/staff',{username:'testgarson',name:'Test Garson',password:staffPassword,is_active:true})).status,200);
 const staffLogin=await req('/api/staff/login',{username:'testgarson',password:staffPassword},'');assert.equal(staffLogin.status,200);const staffCookie=staffLogin.headers.get('set-cookie').split(';')[0];
 const staffState=await req('/api/pos',undefined,staffCookie);assert.equal(staffState.status,200);assert.deepEqual(staffState.data.accounts,[]);assert.equal(staffState.data.today,null);
 assert.equal((await command({action:'pay',ticket_id:t.id,version:t.version,method:'cash',amount:1,reference:'',close:false},staffCookie)).status,403);
 assert.equal((await req('/api/pos/accounts',undefined,staffCookie)).status,401);
 let waiter=(await command({action:'open',table:8},staffCookie)).data;waiter=(await command({action:'add',ticket_id:waiter.id,version:waiter.version,lines:add.lines},staffCookie)).data;assert.equal(waiter.lines[0].source,'waiter');assert.equal(waiter.lines[0].actor,'testgarson');
 const order=await req('/api/orders',{request_id:randomUUID(),table:7,lines:[{item_id:item.id,variant:'',quantity:1,note:'Müşteri testi',unit_price:1}],note:''},'');assert.equal(order.status,200);
 assert.equal((await req('/api/pos/orders',{id:order.data.id,accept:true},staffCookie)).status,200);assert.equal((await req('/api/pos/orders',{id:order.data.id,accept:true},staffCookie)).status,200);
 t=(await req(`/api/pos?ticket=${t.id}`)).data;assert.equal(t.total,item.price*3);assert.equal(t.lines.length,2);
 const discount=Math.round(t.total*.2);t=(await command({action:'discount',ticket_id:t.id,version:t.version,amount:discount,note:'%20'})).data;
 const cash=Math.floor(t.remaining/4);t=(await command({action:'pay',ticket_id:t.id,version:t.version,amount:cash,method:'cash',reference:'',close:false})).data;
 const waiterView=(await req('/api/pos',undefined,staffCookie)).data.open.find(x=>x.id===t.id);assert.equal(waiterView.paid,cash);assert.deepEqual(waiterView.payments,[]);
 t=(await command({action:'move',ticket_id:t.id,version:t.version,table:9})).data;assert.equal(t.table_number,9);assert.equal(t.paid,cash);
 const a=(await req('/api/pos/accounts',{name:'Test Cari',phone:'',note:'',is_active:true})).data;
 const accountAmount=t.remaining;t=(await command({action:'pay',ticket_id:t.id,version:t.version,amount:accountAmount,method:'account',account_id:a.id,reference:'',close:true})).data;assert.equal(t.status,'closed');assert.equal(t.remaining,0);
 const entries=(await req(`/api/pos/accounts?id=${a.id}`)).data;assert.equal(entries[0].ticket_id,t.id);
 assert.equal((await req('/api/pos/accounts',{action:'collect',id:a.id,amount:accountAmount,method:'card',note:'Test tahsilat',request_id:randomUUID()})).status,200);
 assert.equal((await req('/api/pos/accounts')).data.find(x=>x.id===a.id).balance,0);
 const configured=await req('/api/pos/print',{action:'configure'});assert.equal(configured.status,200);const token=configured.data.token;assert.equal(token.length,43);
 const jobId=randomUUID(),print={ticket_id:t.id,version:t.version,request_id:jobId};assert.equal((await req('/api/pos/print',print)).status,200);assert.equal((await req('/api/pos/print',print)).status,200);
 assert.equal((await req('/api/printer',undefined,'')).status,401);
 const claimed=await req('/api/printer',undefined,'',{Authorization:`Bearer ${token}`});assert.equal(claimed.status,200);assert.equal(claimed.data.job.id,jobId);assert.equal(claimed.data.job.payload.ticket.total,t.total);
 assert.equal((await req('/api/printer',undefined,'',{Authorization:`Bearer ${token}`})).data.job,null);
 assert.equal((await req('/api/printer',{id:jobId,status:'printed',error:''},'',{Authorization:`Bearer ${token}`})).status,200);
 const staff=(await req('/api/pos/staff')).data[0];assert.equal((await req('/api/pos/staff',{...staff,is_active:false})).status,200);assert.equal((await req('/api/pos',undefined,staffCookie)).status,401);
 assert.equal((await req('/api/pos/staff',{...staff,is_active:true})).status,200);assert.equal((await req('/api/pos',undefined,staffCookie)).status,401,'Re-enabling staff must not revive revoked sessions.');
 console.log('PASS: POS HTTP permissions, ETag, idempotent orders, customer approval, waiter identity, split payments, account collection, transfer, printer queue and staff revocation.');
 return {ticketId:t.id,accountId:a.id};
}
