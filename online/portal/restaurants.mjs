import {Buffer} from 'node:buffer';
import {mapConcurrent} from './concurrency.mjs';
import {restaurantDays} from './public/restaurant-status.js';
const days=new Set(restaurantDays.map(([day])=>day));
const time=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)?value.slice(0,5):null;
export function normalizeRestaurant(raw,account){
 if(!raw||!/^\d+$/.test(String(raw.id))||String(raw.supplierId??account.supplierId)!==String(account.supplierId))throw Error('Restoran kimliği doğrulanamadı.');
 const hours=Array.isArray(raw.workingHours)?raw.workingHours:[];
 return {id:String(raw.id),name:String(raw.name||'').slice(0,150),workingStatus:['OPEN','CLOSED'].includes(raw.workingStatus)?raw.workingStatus:'UNKNOWN',workingHours:hours.flatMap(row=>{const openingTime=time(row?.openingTime),closingTime=time(row?.closingTime);return days.has(row?.dayOfWeek)&&openingTime&&closingTime?[{dayOfWeek:row.dayOfWeek,openingTime,closingTime}]:[];})};
}
export async function fetchRestaurants(account,{fetcher=fetch}={}){
 const base=account.environment==='stage'?'https://stageapi.tgoapis.com':'https://api.tgoapis.com',rows=[];
 for(let page=0;page<1000;page++){
  const url=new URL(base+'/integrator/store/meal/suppliers/'+encodeURIComponent(account.supplierId)+'/stores');url.searchParams.set('page',String(page));url.searchParams.set('size','50');
  let response;try{response=await fetcher(url,{headers:{Authorization:'Basic '+Buffer.from(account.apiKey+':'+account.apiSecret).toString('base64'),'x-agentname':account.agentName,'x-executor-user':account.executorEmail,Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'manual'});}catch{throw Error('Restoran durum servisine ulaşılamadı.');}
  if(!response.ok){const error=Error(response.status===401?'Restoran API bilgileri doğrulanamadı.':response.status===403?'Restoran bilgilerini okuma yetkisi bulunmuyor.':response.status===429?'Restoran API istek sınırına ulaşıldı.':'Restoran API yanıtı: HTTP '+response.status);error.retryAfter=response.status===429?Math.max(60000,Math.min(3600000,(Number(response.headers.get('retry-after'))||60)*1000)):[401,403,404].includes(response.status)?300000:60000;throw error;}
  const body=await response.json();if(!Array.isArray(body?.restaurants)||!Number.isInteger(body.totalPages)||body.totalPages<0)throw Error('Restoran servis yanıtı doğrulanamadı.');
  rows.push(...body.restaurants.map(row=>normalizeRestaurant(row,account)));if(page+1>=body.totalPages)return rows;
 }
 throw Error('Restoran sayfa sınırı aşıldı.');
}
export function createRestaurantService({initial={},persist,fetchRows=fetchRestaurants,now=Date.now}){
 let data=initial,busy=false;
 return {snapshot:()=>data,async sync(accounts){
  if(busy)return data;busy=true;
  try{await mapConcurrent(accounts,2,async account=>{const previous=data[account.id]||{},at=now();if(previous.nextAt>at)return;
   let patch;try{const stores=await fetchRows(account);patch={stores,checkedAt:now(),attemptedAt:at,nextAt:now()+60000,error:''};}catch(error){patch={...previous,attemptedAt:at,nextAt:now()+Math.max(60000,error.retryAfter||0),error:String(error.message||'Restoran bilgisi alınamadı.').slice(0,300)};}
   data={...data,[account.id]:patch};
  });const ids=new Set(accounts.map(a=>a.id));data=Object.fromEntries(Object.entries(data).filter(([id])=>ids.has(id)));await persist(data);return data;}finally{busy=false;}
 }};
}
