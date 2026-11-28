import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recentOrders,orderOverview,historyPage} from '../online/portal/order-window.mjs';
import {nextPollDelay} from '../online/portal/poll-schedule.mjs';
import {notifyClosureFailures} from '../online/portal/closure-alerts.mjs';
const now=Date.parse('2026-11-28T12:00:00+03:00');
const accounts=[{id:'a',label:'Natura',environment:'prod',stores:[{id:'1',name:'Natura'}]}];
const rows=Array.from({length:145},(_,i)=>({id:'o'+String(i).padStart(3,'0'),number:String(i),accountId:'a',storeId:'1',status:'Delivered',createdAt:now-86400000,total:100,payment:'Kart',items:[{name:i===140?'Ekstra tavuk':'Çay'}],discounts:{entries:[{title:'Kampanya',total:10}]}}));
test('recent state excludes history but keeps active orders from previous days',()=>{
 const oldActive={...rows[0],id:'active',status:'Picking'},today={...rows[0],id:'today',createdAt:now};
 assert.deepEqual(recentOrders([...rows,oldActive,today],now).map((o:{id:string})=>o.id),['active','today']);
 const stats=orderOverview(accounts,rows,now).yesterday[''];assert.equal(stats.sales.count,145);assert.equal(stats.sales.total,14500);assert.equal(stats.discounts.total,1450);
});
test('history cursors paginate equal timestamps without losing or duplicating orders; search spans unloaded rows',()=>{
 const query=new URLSearchParams({period:'yesterday'}),first=historyPage(rows,query,now);assert.equal(first.orders.length,60);assert.equal(first.total,145);
 query.set('cursor',first.next);const second=historyPage(rows,query,now);query.set('cursor',second.next);const third=historyPage(rows,query,now);
 assert.equal(third.next,null);assert.equal(new Set([...first.orders,...second.orders,...third.orders].map(o=>o.id)).size,145);
 assert.equal(historyPage(rows,new URLSearchParams({period:'yesterday',q:'ekstra tavuk'}),now).total,1);
 assert.equal(historyPage(rows,new URLSearchParams({period:'yesterday',store:'other:1'}),now).total,0);
 assert.throws(()=>historyPage(rows,new URLSearchParams({cursor:'missing'}),now),/değişti/);
});
test('poll cadence compensates work time and never starts overlapping catch-up bursts',()=>{
 assert.equal(nextPollDelay(1000,1256),14744);assert.equal(nextPollDelay(1000,21000),1000);assert.equal(nextPollDelay(1000,900),15000);
});
test('a failed timed reopening alerts once across restarts and ambiguous Telegram deliveries are not blindly repeated',async()=>{
 const values=new Map<string,any>([['restaurant-closures',{'a:1':{accountId:'a',storeId:'1',requestId:'close-1',until:now-1,state:'opening',error:'Açma doğrulanamadı'}}]]),store={get:async(k:string,f:any)=>structuredClone(values.get(k)||f),set:async(k:string,v:any)=>{values.set(k,structuredClone(v));}};let sends=0;
 const send=async(text:string)=>{sends++;assert.match(text,/Natura/);throw Error('timeout');};
 await notifyClosureFailures({store,accounts,send,now:()=>now});await notifyClosureFailures({store,accounts,send,now:()=>now+60000});assert.equal(sends,1);assert.equal(values.get('restaurant-closures')['a:1'].alert.status,'uncertain');
 const plans=values.get('restaurant-closures');plans['a:1'].requestId='close-2';plans['a:1'].state='completed';await notifyClosureFailures({store,accounts,send,now:()=>now});assert.equal(sends,1);
});
