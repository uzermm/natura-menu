import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkingHours,sendRestaurantHours,restaurantHoursOperation,hoursVersion} from '../online/portal/restaurant-hours.mjs';
const account={id:'a',supplierId:'10',environment:'prod',apiKey:'test',apiSecret:'test',agentName:'Test',executorEmail:'test@example.com'};
const hours=[{dayOfWeek:'MONDAY',openingTime:'11:00:00',closingTime:'23:59:59'}];
test('hours updates preserve unchanged seconds, support split shifts, and split overnight Sunday into Monday as documented',()=>{
 const result=validateWorkingHours([{dayOfWeek:'MONDAY',openingTime:'11:00',closingTime:'23:59'},{dayOfWeek:'SUNDAY',openingTime:'11:00',closingTime:'02:30'}],hours);
 assert.deepEqual(result,[{dayOfWeek:'MONDAY',openingTime:'00:00:00',closingTime:'02:30:00'},...hours,{dayOfWeek:'SUNDAY',openingTime:'11:00:00',closingTime:'23:59:00'}]);
 assert.throws(()=>validateWorkingHours([{dayOfWeek:'SUNDAY',openingTime:'20:00',closingTime:'02:30'},{dayOfWeek:'MONDAY',openingTime:'01:00',closingTime:'04:00'}]),/çakışıyor/);
 assert.throws(()=>validateWorkingHours([{dayOfWeek:'MONDAY',openingTime:'11:00',closingTime:'11:00'}]),/aynı/);assert.throws(()=>validateWorkingHours([]),/en az/);assert.throws(()=>validateWorkingHours([{dayOfWeek:'OTHER',openingTime:'11:00',closingTime:'23:00'}]),/kontrol/);
});
test('hours submission is exactly one authenticated PUT to the chosen restaurant and never auto retries an uncertain response',async()=>{
 let count=0;await sendRestaurantHours(account,'123',hours,{fetcher:async(url:any,options:any)=>{count++;assert.equal(url,'https://api.tgoapis.com/integrator/store/meal/suppliers/10/stores/123/working-hours');assert.equal(options.method,'PUT');assert.deepEqual(JSON.parse(options.body),{workingHours:hours});assert.equal(options.headers['x-executor-user'],'test@example.com');return new Response(null,{status:204});}});assert.equal(count,1);
 await assert.rejects(()=>sendRestaurantHours(account,'123',hours,{fetcher:async()=>{count++;throw Error('timeout');}}),/değişmiş olabilir/);assert.equal(count,2);
});
test('hours edits reject stale plans and cross-account restaurants before sending, verify actual results, and avoid replaying a request',async()=>{
 const records=new Map<string,any>(),store={get:async(key:string,fallback:any)=>records.get(key)??fallback,set:async(key:string,value:any)=>{records.set(key,value);}},config={accounts:[account]};let current=hours,sends=0;
 const fetchRows=async()=>[{id:'123',name:'Şube',workingStatus:'OPEN',workingHours:current}],send=async(a:any,id:any,target:any)=>{assert.equal(id,'123');sends++;current=target;};
 const source=await restaurantHoursOperation({store,config,branchId:'a:123',fetchRows});const input={version:source.version,requestId:'test-request-00000001',confirm:true,hours:[{dayOfWeek:'MONDAY',openingTime:'12:00',closingTime:'22:00'}]};
 await assert.rejects(()=>restaurantHoursOperation({store,config,branchId:'other:123',input,fetchRows,send}),/bulunamadı/);
 await assert.rejects(()=>restaurantHoursOperation({store,config,branchId:'a:456',input,fetchRows,send}),/API hesabında/);
 await assert.rejects(()=>restaurantHoursOperation({store,config,branchId:'a:123',input:{...input,version:'0'.repeat(64)},fetchRows,send}),/başka bir yerden/);assert.equal(sends,0);
 const result=await restaurantHoursOperation({store,config,branchId:'a:123',input,fetchRows,send});assert.equal(result.verified,true);assert.equal(sends,1);assert.equal(records.get('restaurant-info').a.stores[0].workingHours[0].openingTime,'12:00');
 const replay=await restaurantHoursOperation({store,config,branchId:'a:123',input,fetchRows,send});assert.equal(replay.verified,true);assert.equal(sends,1);assert.equal(result.version,hoursVersion('a','123',current));
});
test('accepted but unreflected hours stay pending and are never presented as verified or automatically resent',async()=>{
 const records=new Map<string,any>(),store={get:async(k:string,f:any)=>records.get(k)??f,set:async(k:string,v:any)=>{records.set(k,v);}};let sends=0;
 const input={version:hoursVersion('a','123',hours),requestId:'test-request-00000002',confirm:true,hours:[{dayOfWeek:'MONDAY',openingTime:'12:00',closingTime:'22:00'}]},fetchRows=async()=>[{id:'123',name:'Şube',workingStatus:'OPEN',workingHours:hours}],send=async()=>{sends++;};
 const args={store,config:{accounts:[account]},branchId:'a:123',input,fetchRows,send};assert.equal((await restaurantHoursOperation(args)).verified,false);assert.equal((await restaurantHoursOperation(args)).verified,false);assert.equal(sends,1);
});
