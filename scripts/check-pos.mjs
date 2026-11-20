import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';

// Run against a disposable database only. Called by the Linux container smoke test.
export async function checkPos({base,origin,adminCookie}){
 async function req(url,body,cookie=adminCookie,extra={}){const response=await fetch(base+url,{method:body?'POST':'GET',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined,redirect:'manual'});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:response.status,data,headers:response.headers};}
 const command=(command,cookie=adminCookie,id=randomUUID())=>req('/api/pos',{request_id:id,command},cookie);
 assert.equal((await req('/api/pos',undefined,'')).status,401);
 assert.equal((await fetch(base+'/api/pos',{headers:{Cookie:adminCookie}})).status,200,'Browser GET does not send an Origin header.');
 const initial=await req('/api/pos');assert.equal(initial.status,200);assert.equal((await req('/api/pos',undefined,adminCookie,{'If-None-Match':initial.headers.get('etag')})).status,304);
 const menu=(await req('/api/admin/state')).data.categories;
 const item=menu.filter(c=>c.is_active).flatMap(c=>c.items).find(i=>i.is_active&&!i.sold_out&&!i.variants.length&&i.price>=100);
 let mergeSource=(await command({action:'open_order',table:11,lines:[{item_id:item.id,variant:'',quantity:2,note:''}]})).data;
 const mergeTarget=(await command({action:'open_order',table:12,lines:[{item_id:item.id,variant:'',quantity:1,note:''}]})).data;
 mergeSource=(await command({action:'pay_items',ticket_id:mergeSource.id,version:mergeSource.version,method:'cash',items:[{line_id:mergeSource.lines[0].id,quantity:1}],reference:''})).data;
 const mergeCommand={action:'move',ticket_id:mergeSource.id,version:mergeSource.version,table:12,target_ticket_id:mergeTarget.id,target_version:mergeTarget.version},mergeKey=randomUUID();
 let mergeResult=(await command(mergeCommand,adminCookie,mergeKey)).data;assert.equal(mergeResult.id,mergeTarget.id);assert.equal(mergeResult.remaining,item.price*2);assert.equal(mergeResult.paid,item.price);assert.equal((await command(mergeCommand,adminCookie,mergeKey)).data.lines.length,2);assert.equal((await req(`/api/pos?ticket=${mergeSource.id}`)).data.merged_into,mergeTarget.id);assert.ok(!(await req('/api/pos')).data.open.some(t=>t.id===mergeSource.id));
 mergeResult=(await command({action:'pay',ticket_id:mergeResult.id,version:mergeResult.version,method:'card',amount:mergeResult.remaining,reference:'',close:true})).data;assert.equal(mergeResult.status,'closed');
 let t=(await command({action:'open',table:7})).data;
 const add={action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:item.id,variant:'',quantity:2,note:'Test siparişi'}]},addKey=randomUUID();
 t=(await command(add,adminCookie,addKey)).data;assert.equal(t.total,item.price*2);assert.equal((await command(add,adminCookie,addKey)).data.lines.length,1);
 assert.equal((await command({...add,lines:[{...add.lines[0],quantity:5}]})).status,409);
 const staffCookie='natura_staff=retired-session';assert.equal((await req('/api/staff/login',{username:'old',password:'password'},'')).status,401);assert.equal((await req('/api/pos',undefined,staffCookie)).status,401);assert.equal((await req('/api/pos/catalog',undefined,staffCookie)).status,401);assert.equal((await req('/api/pos/staff')).status,410);
 const confirmKey=randomUUID(),confirm={action:'open_order',table:10,lines:[{item_id:item.id,variant:'',quantity:2,note:''},{item_id:item.id,variant:'',quantity:2,note:''}]};
 let selected=(await command(confirm,adminCookie,confirmKey)).data;assert.equal(selected.lines.length,1);assert.equal(selected.lines[0].quantity,4);assert.equal((await command(confirm,adminCookie,confirmKey)).data.id,selected.id);assert.equal((await command(confirm)).status,409);
 const selectedPayment={action:'pay_items',ticket_id:selected.id,version:selected.version,method:'cash',items:[{line_id:selected.lines[0].id,quantity:2}],reference:''},selectedKey=randomUUID();
 assert.equal((await command(selectedPayment,staffCookie)).status,401);
 selected=(await command(selectedPayment,adminCookie,selectedKey)).data;assert.equal(selected.status,'open');assert.equal(selected.remaining,item.price*2);assert.equal(selected.lines[0].paid_quantity,2);assert.equal((await command(selectedPayment,adminCookie,selectedKey)).data.payments.length,1);
 selected=(await command({...selectedPayment,version:selected.version,method:'card'})).data;assert.equal(selected.status,'closed');assert.equal(selected.remaining,0);assert.equal(selected.lines[0].paid_quantity,4);
 assert.equal((await command({action:'pay',ticket_id:t.id,version:t.version,method:'cash',amount:1,reference:'',close:false},staffCookie)).status,401);
 assert.equal((await req('/api/pos/accounts',undefined,staffCookie)).status,401);
 const quickKey=randomUUID(),quickInput={action:'open_quick',service_type:'takeaway',account_name:'Paket Deneme',lines:[{item_id:item.id,variant:'',quantity:2,note:''}]};
 let quick=(await command(quickInput,adminCookie,quickKey)).data;assert.equal(quick.service_type,'takeaway');assert.equal(quick.table_number,null);assert.equal((await command(quickInput,adminCookie,quickKey)).data.id,quick.id);
 assert.equal((await command(quickInput,staffCookie)).status,401);
 quick=(await command({action:'pay',ticket_id:quick.id,version:quick.version,method:'cash',amount:item.price,reference:'',close:false,quick:{service_type:'counter',account_name:'Kasadan Deneme'}})).data;assert.equal(quick.account_name,'Kasadan Deneme');assert.equal(quick.remaining,item.price);assert.ok((await req('/api/pos')).data.open.some(x=>x.id===quick.id));
 const quickReceipt=await req(`/admin/adisyon/${quick.id}`);assert.match(quickReceipt.data,/Kasadan Deneme/);assert.match(quickReceipt.data,/Kasa satışı/);assert.doesNotMatch(quickReceipt.data,/Masa null/);
 quick=(await command({action:'pay',ticket_id:quick.id,version:quick.version,method:'card',amount:quick.remaining,reference:'',close:true})).data;assert.equal(quick.status,'closed');assert.ok(!(await req('/api/pos')).data.open.some(x=>x.id===quick.id));
 const order=await req('/api/orders',{request_id:randomUUID(),table:7,lines:[{item_id:item.id,variant:'',quantity:1,note:'Müşteri testi',unit_price:1}],note:''},'');assert.equal(order.status,404,'Retired QR order creation must remain unavailable.');
 assert.equal((await req('/api/pos/orders',{id:'retired-request',accept:true},adminCookie)).status,404);
 t=(await command({action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:item.id,variant:'',quantity:1,note:'Kasa eklemesi'}]})).data;
 t=(await req(`/api/pos?ticket=${t.id}`)).data;assert.equal(t.total,item.price*3);assert.equal(t.lines.length,2);
 const discount=Math.round(t.total*.2);t=(await command({action:'discount',ticket_id:t.id,version:t.version,amount:discount,note:'%20'})).data;
 const cash=Math.floor(t.remaining/4);t=(await command({action:'pay',ticket_id:t.id,version:t.version,amount:cash,method:'cash',reference:'',close:false})).data;

 t=(await command({action:'move',ticket_id:t.id,version:t.version,table:9})).data;assert.equal(t.table_number,9);assert.equal(t.paid,cash);
 const a=(await req('/api/pos/accounts',{name:'Test Cari',phone:'',note:'',is_active:true})).data;
 const accountAmount=t.remaining;t=(await command({action:'pay',ticket_id:t.id,version:t.version,amount:accountAmount,method:'account',account_id:a.id,reference:'',close:true})).data;assert.equal(t.status,'closed');assert.equal(t.remaining,0);
 const entries=(await req(`/api/pos/accounts?id=${a.id}`)).data;assert.equal(entries[0].ticket_id,t.id);
 assert.equal((await req('/api/pos/accounts',{action:'collect',day_id:(await req('/api/pos')).data.today.day_id,id:a.id,amount:accountAmount,method:'card',note:'Test tahsilat',request_id:randomUUID()})).status,200);
 assert.equal((await req('/api/pos/accounts')).data.find(x=>x.id===a.id).balance,0);
 for(const format of ['auto','a4','thermal']){const receipt=await req('/admin/adisyon/'+t.id+'?format='+format);assert.equal(receipt.status,200);assert.match(receipt.data,/Natura Bistro/);assert.ok(receipt.data.includes('data-format="'+format+'"'));}
 assert.equal((await req('/admin/adisyon/'+t.id,undefined,'')).status,307);
 const employeePassword=randomBytes(12).toString('hex');for(const role of ['cashier','waiter']){assert.equal((await req('/api/admin/users',{name:'Test '+role,username:'test.'+role,password:employeePassword,role,is_active:true})).status,200);}const employees=(await req('/api/admin/users')).data.filter(user=>!user.protected);assert.equal(employees.length,2);assert.ok(employees.every(e=>['cashier','waiter'].includes(e.role)&&!('password_hash' in e)&&!('credential' in e)));assert.equal((await req('/api/admin/users',undefined,'')).status,401);assert.equal((await req('/api/staff/login',{username:'test.cashier',password:employeePassword},'')).status,200);assert.equal((await req('/api/admin/users',{name:'No',username:'denied',password:employeePassword,role:'cashier',is_active:true,permissions:['all']})).status,400);
 console.log('PASS: POS HTTP permissions, ETag, idempotent orders, retired QR and staff access rejection, split payments, account collection, transfer, browser receipt layouts and role-based employees.');
 return {ticketId:t.id,accountId:a.id};
}
