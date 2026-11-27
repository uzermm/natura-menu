import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {fetchRestaurants} from './restaurants.mjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const statusVersion=(id,row)=>createHash('sha256').update(JSON.stringify([id,row.workingStatus,row.statusModifiedAt||null])).digest('hex');
export async function sendRestaurantStatus(account,storeId,status,{fetcher=fetch}={}){
 if(!['OPEN','CLOSED'].includes(status))throw fail('Geçersiz mağaza durumu.');const base=account.environment==='stage'?'https://stageapi.tgoapis.com':'https://api.tgoapis.com';let r;
 try{r=await fetcher(base+'/integrator/store/meal/suppliers/'+encodeURIComponent(account.supplierId)+'/stores/'+encodeURIComponent(storeId)+'/status',{method:'PUT',headers:{Authorization:'Basic '+Buffer.from(account.apiKey+':'+account.apiSecret).toString('base64'),'x-agentname':account.agentName,'x-executor-user':account.executorEmail,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({status}),signal:AbortSignal.timeout(10000),redirect:'manual'});}catch{throw fail('Trendyol yanıtı alınamadı. Mağaza değişmiş olabilir; tekrar göndermeden güncel durumu kontrol edin.',502);}
 if(!r.ok)throw fail(r.status===403?'Trendyol bu hesap için mağaza açma/kapatma yetkisi vermiyor.':r.status===429?'Trendyol istek sınırına ulaşıldı. Durumu kontrol edip tekrar deneyin.':r.status===401?'Trendyol API bilgileri doğrulanamadı.':'Trendyol işlem sonucu doğrulanamadı (HTTP '+r.status+'). Güncel durumu kontrol edin.',r.status>=400&&r.status<500?r.status:502);
}
async function cacheRows(store,account,rows,now){const data=await store.get('restaurant-info',{});data[account.id]={stores:rows,checkedAt:now,attemptedAt:now,nextAt:now+60000,error:''};await store.set('restaurant-info',data);}
export function publicClosure(row){return row?{until:row.until??null,state:row.state,error:row.error||''}:null;}
/** @param {{store:any,config:any,branchId:string,input?:any,fetchRows?:typeof fetchRestaurants,send?:typeof sendRestaurantStatus,now?:()=>number}} options */
export async function restaurantStatusOperation({store,config,branchId,input=null,fetchRows=fetchRestaurants,send=sendRestaurantStatus,now=Date.now}){
 const parts=typeof branchId==='string'?branchId.match(/^([\w-]{1,100}):(\d+)$/):null,account=parts&&config.accounts.find(a=>a.id===parts[1]),storeId=parts?.[2];if(!account)throw fail('Restoran bağlantısı bulunamadı.',404);
 const rows=await fetchRows(account),restaurant=rows.find(row=>row.id===storeId);if(!restaurant)throw fail('Restoran bu API hesabında bulunamadı.',404);const plans=await store.get('restaurant-closures',{}),old=plans[branchId];
 const snapshot=row=>({workingStatus:row.workingStatus,version:statusVersion(branchId,row),closure:publicClosure(plans[branchId]),verified:false,ok:false,message:''});
 if(!input)return snapshot(restaurant);
 if(input.confirm!==true||!/^[-\w]{16,100}$/.test(input.requestId||'')||!['OPEN','CLOSED'].includes(input.status)||![null,15,30,60].includes(input.minutes??null))throw fail('Mağaza durumunu ve kapatma süresini kontrol edip onaylayın.');
 if(old?.requestId===input.requestId)return {...snapshot(restaurant),ok:true,verified:restaurant.workingStatus===input.status,message:'Önceki işlem yeniden gönderilmedi. Güncel mağaza durumu alındı.'};
 if(input.version!==statusVersion(branchId,restaurant))throw fail('Mağaza durumu başka bir yerden değişmiş. Güncel durumu yeniden yükleyin.',409);
 if(!['OPEN','CLOSED'].includes(restaurant.workingStatus))throw fail('Güncel mağaza durumu doğrulanamadı. İşlem gönderilmedi.',409);
 if(restaurant.workingStatus===input.status)return {...snapshot(restaurant),ok:true,verified:true,message:'Mağaza zaten seçilen durumda. İşlem gönderilmedi.'};
 const minutes=input.status==='CLOSED'?(input.minutes??null):null;
 plans[branchId]={accountId:account.id,storeId,requestId:input.requestId,state:input.status==='CLOSED'?'pending-close':'opening',until:minutes?now()+minutes*60000:null,at:now(),guardModifiedAt:null,error:'',nextAt:0};await store.set('restaurant-closures',plans);
 try{await send(account,storeId,input.status);}catch(e){plans[branchId].state=e.status>=400&&e.status<500?'failed':input.status==='CLOSED'?'pending-close':'opening';plans[branchId].error=e.message;await store.set('restaurant-closures',plans);throw e;}
 let freshRows;try{freshRows=await fetchRows(account);}catch{return {...snapshot(restaurant),ok:true,message:'İstek gönderildi; sonuç henüz doğrulanamadı. Güncel durumu kontrol edin.'};}
 const fresh=freshRows.find(row=>row.id===storeId);if(!fresh)return {...snapshot(restaurant),ok:true,message:'Mağaza yanıtı doğrulanamadı. Güncel durumu kontrol edin.'};
 const verified=fresh.workingStatus===input.status;
 if(verified){plans[branchId].state=input.status==='CLOSED'?'closed':'completed';plans[branchId].guardModifiedAt=fresh.statusModifiedAt||null;}
 await store.set('restaurant-closures',plans);await cacheRows(store,account,freshRows,now());
 return {...snapshot(fresh),ok:true,verified,message:verified?(input.status==='OPEN'?'Mağaza Trendyol’da açıldı.':minutes?minutes+' dakika kapatıldı. Süre dolunca sunucu yeniden açacak.':'Mağaza siz açana kadar kapalı kalacak.'):'İstek gönderildi; Trendyol’da yansıması bekleniyor.'};
}
export async function processRestaurantClosures({store,accounts,fetchRows=fetchRestaurants,send=sendRestaurantStatus,now=Date.now}){
 const plans=await store.get('restaurant-closures',{}),metadata=await store.get('restaurant-info',{});let changed=false;
 for(const [branchId,plan] of Object.entries(plans)){
  const cached=metadata[plan.accountId],observed=cached?.stores?.find(row=>row.id===plan.storeId);
  if(plan.state==='closed'&&cached?.checkedAt>=plan.at&&!cached?.error&&now()-cached.checkedAt<=120000&&observed?.workingStatus==='OPEN'){plan.state='completed';plan.error='';changed=true;continue;}
  if(!['pending-close','closed','opening'].includes(plan.state)||plan.nextAt>now()||(plan.state==='closed'&&(!plan.until||plan.until>now())))continue;
  const account=accounts.find(a=>a.id===plan.accountId);if(!account){plan.state='cancelled';plan.error='Restoran bağlantısı kaldırıldığı için otomatik açma iptal edildi.';changed=true;continue;}
  try{const rows=await fetchRows(account),row=rows.find(r=>r.id===plan.storeId);if(!row)throw Error('Restoran bilgisi bulunamadı.');await cacheRows(store,account,rows,now());changed=true;
   if(plan.state==='pending-close'){if(row.workingStatus==='CLOSED'){plan.state='closed';plan.guardModifiedAt=row.statusModifiedAt||null;}else if(now()-plan.at>120000){plan.state='failed';plan.error='Kapatma doğrulanamadı. Mağazayı kontrol edin.';}continue;}
   if(row.workingStatus==='OPEN'){plan.state='completed';plan.error='';continue;}
   if(plan.state==='opening'){plan.error='Açma işlemi henüz doğrulanamadı. Mağazayı kontrol edin.';plan.nextAt=now()+60000;continue;}
   if(row.workingStatus!=='CLOSED')throw Error('Mağaza durumu doğrulanamadı.');
   if(plan.guardModifiedAt&&row.statusModifiedAt&&plan.guardModifiedAt!==row.statusModifiedAt){plan.state='cancelled';plan.error='Mağaza sonradan değiştirilmiş. Otomatik açılmadı; durumu kontrol edin.';continue;}
   plan.state='opening';plan.error='Açma sonucu bekleniyor.';await store.set('restaurant-closures',plans);
   try{await send(account,plan.storeId,'OPEN');}catch(e){plan.state=e.status>=400&&e.status<500?'failed':'opening';plan.nextAt=now()+60000;plan.error='Otomatik açma sonucu doğrulanamadı: '+e.message;continue;}
   const fresh=await fetchRows(account),actual=fresh.find(r=>r.id===plan.storeId);await cacheRows(store,account,fresh,now());if(actual?.workingStatus==='OPEN'){plan.state='completed';plan.error='';}else plan.nextAt=now()+60000;
  }catch(e){plan.error='Otomatik açma kontrolü: '+e.message;plan.nextAt=now()+60000;changed=true;}
 }
 if(changed)await store.set('restaurant-closures',plans);
}
