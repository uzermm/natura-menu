import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {fetchRestaurants} from './restaurants.mjs';
import {restaurantDays} from './public/restaurant-status.js';
const days=restaurantDays.map(([day])=>day),fail=(message,status=400)=>Object.assign(Error(message),{status});
const validTime=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export function canonicalHours(hours){return [...hours].map(row=>({dayOfWeek:row.dayOfWeek,openingTime:row.openingTime.length===5?row.openingTime+':00':row.openingTime,closingTime:row.closingTime.length===5?row.closingTime+':00':row.closingTime})).sort((a,b)=>days.indexOf(a.dayOfWeek)-days.indexOf(b.dayOfWeek)||a.openingTime.localeCompare(b.openingTime)||a.closingTime.localeCompare(b.closingTime));}
export const hoursVersion=(accountId,storeId,hours)=>createHash('sha256').update(JSON.stringify([accountId,String(storeId),canonicalHours(hours)])).digest('hex');
export function validateWorkingHours(input,original=[]){
 if(!Array.isArray(input)||input.length<1||input.length>28)throw fail('Haftada en az bir çalışma aralığı olmalı; en fazla 28 aralık ekleyebilirsiniz.');
 const result=[];
 for(const row of input){if(!row||!days.includes(row.dayOfWeek)||!validTime(row.openingTime)||!validTime(row.closingTime))throw fail('Gün ve saatleri kontrol edin.');
  const old=original.find(o=>o.dayOfWeek===row.dayOfWeek&&o.openingTime.slice(0,5)===row.openingTime&&o.closingTime.slice(0,5)===row.closingTime);
  if(old){result.push({...old});continue;}
  if(row.openingTime===row.closingTime)throw fail('Açılış ve kapanış saati aynı olamaz.');
  if(row.closingTime<row.openingTime){if(row.openingTime==='23:59')throw fail('Gece yarısını aşan aralık 23:59’dan önce başlamalı.');result.push({dayOfWeek:row.dayOfWeek,openingTime:row.openingTime+':00',closingTime:'23:59:00'});if(row.closingTime!=='00:00')result.push({dayOfWeek:days[(days.indexOf(row.dayOfWeek)+1)%7],openingTime:'00:00:00',closingTime:row.closingTime+':00'});}
  else result.push({dayOfWeek:row.dayOfWeek,openingTime:row.openingTime+':00',closingTime:row.closingTime+':00'});
 }
 const sorted=canonicalHours(result);for(let i=1;i<sorted.length;i++){const a=sorted[i-1],b=sorted[i];if(a.dayOfWeek===b.dayOfWeek&&a.closingTime>b.openingTime)throw fail('Çalışma aralıkları çakışıyor. Gece yarısından sonraki saatleri de kontrol edin.');}
 return sorted;
}
export async function sendRestaurantHours(account,storeId,hours,{fetcher=fetch}={}){
 const base=account.environment==='stage'?'https://stageapi.tgoapis.com':'https://api.tgoapis.com';let response;
 try{response=await fetcher(base+'/integrator/store/meal/suppliers/'+encodeURIComponent(account.supplierId)+'/stores/'+encodeURIComponent(storeId)+'/working-hours',{method:'PUT',headers:{Authorization:'Basic '+Buffer.from(account.apiKey+':'+account.apiSecret).toString('base64'),'x-agentname':account.agentName,'x-executor-user':account.executorEmail,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({workingHours:hours}),signal:AbortSignal.timeout(10000),redirect:'manual'});}catch{throw fail('Trendyol yanıtı alınamadı. Saatler değişmiş olabilir; tekrar göndermeden güncel saatleri kontrol edin.',502);}
 if(!response.ok)throw fail(response.status===403?'Trendyol bu hesap için çalışma saatlerini değiştirme yetkisi vermiyor.':response.status===401?'Trendyol API bilgileri doğrulanamadı.':response.status===429?'Trendyol istek sınırına ulaşıldı. Biraz sonra tekrar deneyin.':response.status>=500?'Trendyol sonucu doğrulanamadı. Tekrar göndermeden güncel saatleri kontrol edin.':'Trendyol saat güncellemesini kabul etmedi (HTTP '+response.status+').',[401,403,429].includes(response.status)?response.status:502);
}
/** @param {{store:any,config:any,branchId:string,input?:any,fetchRows?:typeof fetchRestaurants,send?:typeof sendRestaurantHours,now?:()=>number}} options */
export async function restaurantHoursOperation({store,config,branchId,input=null,fetchRows=fetchRestaurants,send=sendRestaurantHours,now=Date.now}){
 const parts=typeof branchId==='string'?branchId.match(/^([\w-]{1,100}):(\d+)$/):null,account=parts&&config.accounts.find(a=>a.id===parts[1]),storeId=parts?.[2];if(!account)throw fail('Restoran bağlantısı bulunamadı.',404);
 const rows=await fetchRows(account,{seconds:true}),restaurant=rows.find(row=>row.id===storeId);if(!restaurant)throw fail('Restoran bu API hesabında bulunamadı.',404);
 const snapshot=row=>({verified:false,ok:false,message:'',branchId,name:row.name,hours:canonicalHours(row.workingHours),version:hoursVersion(account.id,storeId,row.workingHours)});
 if(!input)return snapshot(restaurant);
 if(input.confirm!==true||!/^[-\w]{16,100}$/.test(input.requestId||'')||!/^\w{64}$/.test(input.version||''))throw fail('Gönderimi onaylayın ve saatleri yeniden yükleyin.');
 const key='restaurant-hours-result:'+branchId,previous=await store.get(key,null);
 if(previous?.requestId===input.requestId){const verified=hoursVersion(account.id,storeId,restaurant.workingHours)===hoursVersion(account.id,storeId,previous.hours);return {...snapshot(restaurant),ok:true,verified,message:verified?'Çalışma saatleri Trendyol’da doğrulandı.':'Önceki gönderim henüz doğrulanamadı. Güncel saatleri kontrol edin.'};}
 if(input.version!==hoursVersion(account.id,storeId,restaurant.workingHours))throw fail('Saatler başka bir yerden değiştirilmiş. Güncel saatleri yükleyip yeniden düzenleyin.',409);
 const target=validateWorkingHours(input.hours,restaurant.workingHours);
 if(hoursVersion(account.id,storeId,target)===input.version)return {...snapshot(restaurant),ok:true,verified:true,message:'Saatler zaten güncel. Değişiklik gönderilmedi.'};
 await store.set(key,{requestId:input.requestId,hours:target,at:now(),state:'sending'});
 await send(account,storeId,target);
 let freshRows;try{freshRows=await fetchRows(account,{seconds:true});}catch{return {...snapshot(restaurant),ok:true,verified:false,message:'Trendyol isteği kabul etti; güncel saatler henüz doğrulanamadı. Tekrar kontrol edin.'};}
 const fresh=freshRows.find(row=>row.id===storeId);if(!fresh)return {...snapshot(restaurant),ok:true,verified:false,message:'Trendyol isteği kabul etti; restoran bilgisi henüz doğrulanamadı.'};
 const metadata=await store.get('restaurant-info',{});metadata[account.id]={stores:freshRows.map(row=>({...row,workingHours:row.workingHours.map(h=>({...h,openingTime:h.openingTime.slice(0,5),closingTime:h.closingTime.slice(0,5)}))})),checkedAt:now(),attemptedAt:now(),nextAt:now()+60000,error:''};await store.set('restaurant-info',metadata);
 const verified=hoursVersion(account.id,storeId,fresh.workingHours)===hoursVersion(account.id,storeId,target);await store.set(key,{requestId:input.requestId,hours:target,at:now(),state:verified?'verified':'pending'});
 return {...snapshot(fresh),ok:true,verified,message:verified?'Çalışma saatleri Trendyol’a gönderildi ve doğrulandı.':'Trendyol isteği kabul etti; değişikliğin yansıması bekleniyor. Tekrar kontrol edin.'};
}
