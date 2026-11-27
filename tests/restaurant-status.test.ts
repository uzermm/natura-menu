import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchRestaurants,normalizeRestaurant,createRestaurantService} from '../online/portal/restaurants.mjs';
import {restaurantAvailability,restaurantToday,hoursForDay,branchConnectionStatuses} from '../online/portal/public/restaurant-status.js';
const account={id:'a',supplierId:'10',environment:'prod',apiKey:'local-key',apiSecret:'local-secret',agentName:'LocalTest',executorEmail:'local@example.com'};
const hours=[{dayOfWeek:'FRIDAY',openingTime:'10:00:00',closingTime:'02:00:00'}];
test('restaurant reads use documented GET pagination and expose only status and working hours',async()=>{
 const calls:any[]=[];const rows=await fetchRestaurants(account,{fetcher:async(url:any,options:any)=>{calls.push({url:String(url),options});const page=Number(url.searchParams.get('page'));return Response.json({restaurants:[{id:page+1,supplierId:10,name:'Şube '+page,workingStatus:page?'CLOSED':'OPEN',workingHours:hours,address:'private',phoneNumber:'private'}],totalPages:2});}});
 assert.equal(calls.length,2);assert.match(calls[0].url,/api.tgoapis.com\/integrator\/store\/meal\/suppliers\/10\/stores\?page=0&size=50/);assert.equal(calls[0].options.method,undefined);assert.equal(calls[0].options.redirect,'manual');assert.equal(calls[0].options.headers['x-agentname'],'LocalTest');assert.deepEqual(rows.map(r=>r.workingStatus),['OPEN','CLOSED']);assert.deepEqual(rows[0].workingHours,[{dayOfWeek:'FRIDAY',openingTime:'10:00',closingTime:'02:00'}]);assert.equal('address' in rows[0],false);assert.equal('phoneNumber' in rows[0],false);
 await assert.rejects(()=>fetchRestaurants(account,{fetcher:async()=>Response.json({content:[],totalPages:1})}),/doğrulanamadı/);
 assert.throws(()=>normalizeRestaurant({id:1,supplierId:99},account),/kimliği/);
 assert.equal(normalizeRestaurant({id:1,workingStatus:'UNRECOGNIZED',workingHours:[{dayOfWeek:'FRIDAY',openingTime:'99:00',closingTime:'02:00'}]},account).workingStatus,'UNKNOWN');
});
test('restaurant metadata throttles separately, preserves cached hours on failure, and does not keep a false open signal',async()=>{
 let now=1000000,calls=0,fail=false;let saved:any;const service=createRestaurantService({persist:async (v:any)=>{saved=v;},now:()=>now,fetchRows:async()=>{calls++;if(fail)throw Object.assign(Error('Yetki yok'),{retryAfter:300000});return [normalizeRestaurant({id:1,workingStatus:'OPEN',workingHours:hours},account)];}});
 await service.sync([account]);await service.sync([account]);assert.equal(calls,1);assert.equal(saved.a.checkedAt,now);
 now+=60000;fail=true;await service.sync([account]);assert.equal(calls,2);assert.equal(saved.a.stores.length,1);assert.equal(saved.a.error,'Yetki yok');const info={...saved.a.stores[0],checkedAt:saved.a.checkedAt,error:saved.a.error};assert.equal(restaurantAvailability(info,now).state,'UNKNOWN');await service.sync([account]);assert.equal(calls,2);await service.sync([]);assert.deepEqual(saved,{});
});
test('Istanbul day rollover, split shifts, overnight and absent hours do not fabricate availability',()=>{
 const now=Date.parse('2026-11-26T22:30:00Z');assert.equal(restaurantToday(now),'FRIDAY');const normalized=normalizeRestaurant({id:1,workingStatus:'CLOSED',workingHours:hours},account);assert.equal(hoursForDay(normalized.workingHours,'FRIDAY'),'10:00–02:00 (+1 gün)');assert.equal(hoursForDay([], 'MONDAY'),'Saat paylaşılmadı');assert.equal(hoursForDay([{dayOfWeek:'FRIDAY',openingTime:'10:00',closingTime:'14:00'},{dayOfWeek:'FRIDAY',openingTime:'18:00',closingTime:'23:00'}],'FRIDAY'),'10:00–14:00 / 18:00–23:00');
 assert.equal(restaurantAvailability({...normalized,checkedAt:now,error:''},now).state,'CLOSED');assert.equal(restaurantAvailability({...normalized,workingStatus:'OPEN',checkedAt:now,error:''},now+120001).state,'UNKNOWN');assert.equal(restaurantAvailability(undefined,now).state,'UNKNOWN');
});
test('several branches under one account keep their own open status and hours; fresh order connection is independent',()=>{
 const now=Date.now(),base={...account,label:'Hesap',status:{state:'ok',lastSuccess:now},stores:[{id:'1',name:'Beyoğlu'},{id:'2',name:'Dürüm'}],restaurantInfo:{checkedAt:now,error:'',stores:[{id:'1',workingStatus:'OPEN',workingHours:[]},{id:'2',workingStatus:'CLOSED',workingHours:[]}]}};
 const branches=branchConnectionStatuses([base],[]);assert.equal(branches.length,2);assert.deepEqual(branches.map(b=>b.restaurant.workingStatus),['OPEN','CLOSED']);assert.equal(branches[1].state,'ok');assert.equal(branches[1].name,'Dürüm');assert.equal(branchConnectionStatuses([{...base,stores:[]}],[]).length,2);
});

